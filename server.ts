import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { progressDb } from "./server/progressDb";
import { INITIAL_COURSES } from "./src/data/coursesData";

dotenv.config();

const app = express();
const PORT = 3000;

// High payload limit for handling multi-file PDF base64 uploads cleanly
app.use(express.json({ limit: "60mb" }));
app.use(express.urlencoded({ extended: true, limit: "60mb" }));

// Server-side Gemini AI client initialization helper
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Resilient Gemini calling helper with automatic retry for 503 (high demand) / 429 and fallback models
interface GeminiCallOptions {
  primaryModel?: string;
  contents: any[];
  config: {
    systemInstruction?: string;
    responseMimeType?: string;
    responseSchema?: any;
    temperature?: number;
  };
  maxRetries?: number;
}

async function callGeminiWithRetryAndFallback(
  ai: GoogleGenAI,
  options: GeminiCallOptions
): Promise<{ text: string; modelUsed: string }> {
  const primaryModel = options.primaryModel || "gemini-3.7-flash";
  // Valid model candidates in order of preference
  const candidateModels = [
    primaryModel,
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
  ];
  const uniqueModels = Array.from(new Set(candidateModels));

  let lastError: any = null;

  for (const model of uniqueModels) {
    const maxRetries = options.maxRetries ?? 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 500, 5000);
          console.log(`[Gemini API] Retrying attempt ${attempt} for model ${model} after ${Math.round(delayMs)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        console.log(`[Gemini API] Calling model ${model} (attempt ${attempt + 1}/${maxRetries + 1})...`);
        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config: options.config,
        });

        const rawText = response.text || "";
        if (rawText.trim().length > 0) {
          return {
            text: rawText,
            modelUsed: model,
          };
        }
      } catch (err: any) {
        lastError = err;
        const errString = String(err?.message || err);
        const is503Or429OrTransient =
          errString.includes("503") ||
          errString.includes("UNAVAILABLE") ||
          errString.includes("high demand") ||
          errString.includes("429") ||
          errString.includes("RESOURCE_EXHAUSTED") ||
          errString.includes("overloaded") ||
          errString.includes("fetch failed") ||
          errString.includes("ECONNRESET") ||
          err?.status === 503 ||
          err?.status === 429;

        console.warn(`[Gemini API] Error with model ${model} (attempt ${attempt + 1}/${maxRetries + 1}):`, errString);

        if (!is503Or429OrTransient && attempt >= 0) {
          // If non-transient error, break immediately to try fallback model
          break;
        }
      }
    }
    console.log(`[Gemini API] Model ${model} unavailable or exhausted retries, attempting fallback...`);
  }

  throw lastError || new Error("Gemini AI service is currently experiencing high demand. Please try again shortly.");
}

function parseJsonSafely(text: string): any {
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    // Try stripping markdown fences if any
    const cleaned = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(cleaned);
  }
}

// -------------------------------------------------------------
// SECURE USER AUTHENTICATION SYSTEM (Scrypt Crypto Hashed)
// -------------------------------------------------------------
interface UserRecord {
  id: string;
  email: string;
  fullName: string;
  studentId: string;
  department: string;
  series: string;
  currentSemester: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  avatarUrl?: string;
}

const usersByEmail = new Map<string, UserRecord>();
const usersById = new Map<string, UserRecord>();
const activeSessions = new Map<string, { userId: string; expiresAt: number }>();

function hashPassword(password: string, saltHex?: string): { salt: string; hash: string } {
  const salt = saltHex || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  try {
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(storedHash, "hex"));
  } catch {
    return false;
  }
}

function sanitizeUser(user: UserRecord) {
  const { passwordHash, salt, ...safeUser } = user;
  return safeUser;
}

// Seed a default RUET demo account for easy testing
(function seedDefaultUser() {
  const demoEmail = "tanvir.ruet20@gmail.com";
  const existing = progressDb.getUserByEmail(demoEmail);
  if (!existing) {
    const { salt, hash } = hashPassword("Password123!");
    const demoUser: UserRecord = {
      id: "user_ruet_2003045",
      email: demoEmail.toLowerCase(),
      fullName: "Tanvir Ahmed",
      studentId: "2003045",
      department: "CSE",
      series: "20",
      currentSemester: "4-1",
      passwordHash: hash,
      salt,
      createdAt: new Date("2024-01-15T08:00:00.000Z").toISOString(),
      avatarUrl: "",
    };
    progressDb.saveUser(demoUser);
    usersByEmail.set(demoEmail.toLowerCase(), demoUser);
    usersById.set(demoUser.id, demoUser);
  } else {
    usersByEmail.set(existing.email.toLowerCase(), existing);
    usersById.set(existing.id, existing);
  }

  // Load all other existing users from persistent database
  for (const u of progressDb.getAllUsers()) {
    usersByEmail.set(u.email.toLowerCase(), u);
    usersById.set(u.id, u);
  }
})();

// In-memory registry for staged course materials on the server
interface StagedServerMaterial {
  id: string;
  courseId: string;
  fileName: string;
  title: string;
  fileType: string;
  fileSize: string;
  rawSizeBytes: number;
  mimeType: string;
  base64Data?: string;
  textSnippet?: string;
  uploadedAt: string;
}

const serverStagedMaterials: Map<string, StagedServerMaterial[]> = new Map();

// -------------------------------------------------------------
// AUTHENTICATION MIDDLEWARE
// -------------------------------------------------------------
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No authentication token provided." });
    }

    const token = authHeader.split(" ")[1];
    const session = activeSessions.get(token);

    if (!session) {
      return res.status(401).json({ error: "Unauthorized: Session is invalid or has expired." });
    }

    if (Date.now() > session.expiresAt) {
      activeSessions.delete(token);
      return res.status(401).json({ error: "Unauthorized: Session has expired. Please sign in again." });
    }

    (req as any).userId = session.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized: Failed to authenticate user." });
  }
}

// -------------------------------------------------------------
// AUTHENTICATION API ROUTES
// -------------------------------------------------------------

// Sign Up Endpoint
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { fullName, email, password, studentId, department, series, currentSemester } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email is required." });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: "Full name is required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (usersByEmail.has(normalizedEmail) || progressDb.getUserByEmail(normalizedEmail)) {
      return res.status(409).json({ error: "An account with this email already exists. Please sign in." });
    }

    const { salt, hash } = hashPassword(password);
    const userId = "user_" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const newUser: UserRecord = {
      id: userId,
      email: normalizedEmail,
      fullName: fullName.trim(),
      studentId: (studentId || "").trim() || "20030" + Math.floor(10 + Math.random() * 89),
      department: department || "CSE",
      series: series || "20",
      currentSemester: currentSemester || "4-1",
      passwordHash: hash,
      salt,
      createdAt: new Date().toISOString(),
    };

    await progressDb.saveUser(newUser);
    usersByEmail.set(normalizedEmail, newUser);
    usersById.set(userId, newUser);

    // Initialize default courses for this new user in the persistent progress database
    await progressDb.getUserCourses(userId, INITIAL_COURSES);

    // Create session token (valid for 30 days)
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    activeSessions.set(token, { userId, expiresAt });

    return res.status(201).json({
      message: "Account created successfully.",
      user: sanitizeUser(newUser),
      token,
      expiresAt,
    });
  } catch (error: any) {
    console.error("Error in /api/auth/signup:", error);
    return res.status(500).json({ error: "Failed to create account.", details: error.message });
  }
});

// Login Endpoint
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = usersByEmail.get(normalizedEmail) || progressDb.getUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password. Please check your credentials." });
    }

    const isValid = verifyPassword(password, user.salt, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password. Please check your credentials." });
    }

    // Ensure user courses are initialized in database
    await progressDb.getUserCourses(user.id, INITIAL_COURSES);

    // Create session token (valid for 30 days)
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    activeSessions.set(token, { userId: user.id, expiresAt });

    return res.json({
      message: "Signed in successfully.",
      user: sanitizeUser(user),
      token,
      expiresAt,
    });
  } catch (error: any) {
    console.error("Error in /api/auth/login:", error);
    return res.status(500).json({ error: "Failed to sign in.", details: error.message });
  }
});

// Get Current User (Session verification)
app.get("/api/auth/me", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No authentication token provided." });
    }

    const token = authHeader.split(" ")[1];
    const session = activeSessions.get(token);

    if (!session) {
      return res.status(401).json({ error: "Session expired or invalid." });
    }

    if (Date.now() > session.expiresAt) {
      activeSessions.delete(token);
      return res.status(401).json({ error: "Session has expired. Please sign in again." });
    }

    const user = usersById.get(session.userId) || progressDb.getUserById(session.userId);
    if (!user) {
      activeSessions.delete(token);
      return res.status(401).json({ error: "User record not found." });
    }

    return res.json({
      user: sanitizeUser(user),
      token,
      expiresAt: session.expiresAt,
    });
  } catch (error: any) {
    console.error("Error in /api/auth/me:", error);
    return res.status(500).json({ error: "Failed to verify session.", details: error.message });
  }
});

// Logout Endpoint
app.post("/api/auth/logout", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      activeSessions.delete(token);
    }
    return res.json({ success: true, message: "Logged out successfully." });
  } catch (error: any) {
    console.error("Error in /api/auth/logout:", error);
    return res.status(500).json({ error: "Failed to logout." });
  }
});

// -------------------------------------------------------------
// USER PROGRESS & COURSE PERSISTENCE API ROUTES (Tenant-Isolated)
// -------------------------------------------------------------

// 1. Get entire progress report for the authenticated user
app.get("/api/user/progress", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const progressReport = await progressDb.getUserProgressReport(userId);
    return res.json({
      success: true,
      progress: progressReport,
    });
  } catch (error: any) {
    console.error("Error in GET /api/user/progress:", error);
    return res.status(500).json({ error: "Failed to retrieve user progress.", details: error.message });
  }
});

// 2. Get all courses belonging to the authenticated user
app.get("/api/user/courses", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const courses = await progressDb.getUserCourses(userId, INITIAL_COURSES);
    return res.json({
      success: true,
      courses,
    });
  } catch (error: any) {
    console.error("Error in GET /api/user/courses:", error);
    return res.status(500).json({ error: "Failed to retrieve user courses.", details: error.message });
  }
});

// 3. Add or update a course for the authenticated user
app.post("/api/user/courses", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { course } = req.body;
    if (!course || !course.id || !course.code) {
      return res.status(400).json({ error: "Invalid course data provided." });
    }
    const savedCourse = await progressDb.saveUserCourse(userId, course);
    return res.status(201).json({
      success: true,
      course: savedCourse,
      message: `Course ${course.code} saved to persistent storage.`,
    });
  } catch (error: any) {
    console.error("Error in POST /api/user/courses:", error);
    return res.status(500).json({ error: "Failed to save course.", details: error.message });
  }
});

// 4. Update uploaded materials for a course
app.post("/api/user/materials", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { courseId, materials } = req.body;
    if (!courseId || !Array.isArray(materials)) {
      return res.status(400).json({ error: "courseId and materials array are required." });
    }
    const updated = await progressDb.updateCourseMaterials(userId, courseId, materials);
    return res.json({
      success: true,
      courseId,
      materialsCount: updated.length,
      materials: updated,
    });
  } catch (error: any) {
    console.error("Error in POST /api/user/materials:", error);
    return res.status(500).json({ error: "Failed to save course materials.", details: error.message });
  }
});

// 5. Update identified topics and graph edges
app.post("/api/user/topics", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { courseId, nodes, edges, summary } = req.body;
    if (!courseId || !Array.isArray(nodes)) {
      return res.status(400).json({ error: "courseId and nodes array are required." });
    }
    const result = await progressDb.updateCourseTopics(userId, courseId, nodes, edges || [], summary);
    return res.json({
      success: true,
      courseId,
      nodesCount: result.nodes.length,
      edgesCount: result.edges.length,
    });
  } catch (error: any) {
    console.error("Error in POST /api/user/topics:", error);
    return res.status(500).json({ error: "Failed to save identified topics.", details: error.message });
  }
});

// 6. Record and persist a full quiz attempt with all required progress data
app.post("/api/user/quiz/attempt", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const {
      courseId,
      courseCode,
      courseName,
      score,
      totalQuestions,
      percentage,
      gradeDescriptor,
      individualAnswers,
      topicLevelScores,
      strongTopics,
      weakTopics,
      aiGeneratedStudyRecommendations,
      startedAt,
      completedAt,
    } = req.body;

    if (!courseId || typeof score !== "number" || typeof totalQuestions !== "number") {
      return res.status(400).json({ error: "Missing required quiz attempt data." });
    }

    const calculatedPercentage = typeof percentage === "number"
      ? percentage
      : Math.round((score / Math.max(1, totalQuestions)) * 100);

    const savedAttempt = await progressDb.saveQuizAttempt(userId, {
      courseId,
      courseCode: courseCode || "CSE 3101",
      courseName: courseName || "Academic Course",
      score,
      totalQuestions,
      percentage: calculatedPercentage,
      gradeDescriptor,
      individualAnswers: individualAnswers || [],
      topicLevelScores: topicLevelScores || [],
      strongTopics: strongTopics || [],
      weakTopics: weakTopics || [],
      aiGeneratedStudyRecommendations: aiGeneratedStudyRecommendations || {
        academicStanding: "Good Standing",
        executiveDiagnosis: "Quiz completed.",
        prioritizedActionPlan: [],
        studyRoadmap: [],
        recommendedMasteryUpdates: [],
      },
      startedAt,
      completedAt: completedAt || new Date().toISOString(),
    });

    return res.status(201).json({
      success: true,
      attempt: savedAttempt,
      message: "Quiz attempt and diagnostic progress saved successfully.",
    });
  } catch (error: any) {
    console.error("Error in POST /api/user/quiz/attempt:", error);
    return res.status(500).json({ error: "Failed to save quiz attempt.", details: error.message });
  }
});

// 7. Get quiz attempts for a specific course for the authenticated user
app.get("/api/user/quiz/attempts/:courseId", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { courseId } = req.params;
    const attempts = await progressDb.getCourseQuizAttempts(userId, courseId);
    return res.json({
      success: true,
      courseId,
      totalAttempts: attempts.length,
      attempts,
    });
  } catch (error: any) {
    console.error("Error in GET /api/user/quiz/attempts:", error);
    return res.status(500).json({ error: "Failed to retrieve quiz attempts.", details: error.message });
  }
});

// 8. Update topic mastery status
app.post("/api/user/topics/mastery", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { courseId, updates } = req.body;
    if (!courseId || !Array.isArray(updates)) {
      return res.status(400).json({ error: "courseId and updates array are required." });
    }
    await progressDb.updateTopicMasteryStatuses(userId, courseId, updates);
    return res.json({
      success: true,
      courseId,
      updatedCount: updates.length,
    });
  } catch (error: any) {
    console.error("Error in POST /api/user/topics/mastery:", error);
    return res.status(500).json({ error: "Failed to update topic mastery.", details: error.message });
  }
});

// 1. Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// 2. Gemini AI Server Status endpoint (No API key is ever exposed to the client)
app.get("/api/ai/status", (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  res.json({
    isServerSideConfigured: true,
    hasApiKey: hasKey,
    recommendedModel: "gemini-3.7-flash",
    supportedMimeTypes: ["application/pdf"],
    maxPayloadMb: 50,
    serverMessage: hasKey
      ? "Gemini API credentials loaded securely on server. Ready for PDF document analysis."
      : "Gemini server-side architecture active. Configure GEMINI_API_KEY in Secrets for live document processing.",
  });
});

// 3. PDF Course Material Upload & Staging Endpoint
app.post("/api/materials/upload", (req, res) => {
  try {
    const { courseId, materials } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: "courseId is required." });
    }

    if (!Array.isArray(materials) || materials.length === 0) {
      return res.status(400).json({ error: "materials array is required with at least one file." });
    }

    const currentList = serverStagedMaterials.get(courseId) || [];
    const newStagedList: StagedServerMaterial[] = [];

    for (const item of materials) {
      if (!item.fileName) continue;

      const staged: StagedServerMaterial = {
        id: item.id || `server-mat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        courseId,
        fileName: item.fileName,
        title: item.title || item.fileName.replace(/\.[^/.]+$/, ""),
        fileType: item.fileType || "lecture_slide",
        fileSize: item.fileSize || "0 MB",
        rawSizeBytes: item.rawSizeBytes || 0,
        mimeType: item.mimeType || "application/pdf",
        base64Data: item.base64Data, // Stored safely server-side for Gemini processing
        uploadedAt: new Date().toISOString(),
      };

      newStagedList.push(staged);
      currentList.push(staged);
    }

    serverStagedMaterials.set(courseId, currentList);

    return res.json({
      success: true,
      courseId,
      uploadedCount: newStagedList.length,
      totalStagedForCourse: currentList.length,
      stagedFiles: newStagedList.map((f) => ({
        id: f.id,
        fileName: f.fileName,
        title: f.title,
        fileType: f.fileType,
        fileSize: f.fileSize,
        mimeType: f.mimeType,
        hasContentData: Boolean(f.base64Data && f.base64Data.length > 0),
      })),
      message: `Successfully staged ${newStagedList.length} PDF file(s) on the server for Gemini processing.`,
    });
  } catch (error: any) {
    console.error("Error in /api/materials/upload:", error);
    return res.status(500).json({
      error: "Failed to stage materials on server.",
      details: error.message || String(error),
    });
  }
});

// 4. Server-Side Course Analysis Endpoint with Gemini API
// Connects to Gemini API to extract topics, subtopics, important concepts, prerequisites, and difficulty.
// Grounded strictly in the uploaded course material without inventing unsupported topics.
app.post("/api/courses/analyze", async (req, res) => {
  try {
    const { courseId, courseCode, courseTitle, materials } = req.body;

    if (!courseId || !courseCode) {
      return res.status(400).json({
        error: "Missing required parameters: courseId and courseCode are required.",
      });
    }

    const stagedFiles = materials || serverStagedMaterials.get(courseId) || [];

    if (!stagedFiles || stagedFiles.length === 0) {
      return res.status(400).json({
        error: "No PDF course materials found to analyze. Please upload course materials first.",
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({
        error: "GEMINI_API_KEY environment variable is missing on the server. Please configure GEMINI_API_KEY in the Secrets settings.",
      });
    }

    // Build multimodal contents for Gemini API
    const parts: any[] = [];
    let pdfCount = 0;

    for (const mat of stagedFiles) {
      if (mat.base64Data && mat.base64Data.length > 0) {
        const cleanBase64 = mat.base64Data.replace(/^data:[^;]+;base64,/, "");
        const mime = mat.mimeType || "application/pdf";
        parts.push({
          inlineData: {
            mimeType: mime,
            data: cleanBase64,
          },
        });
        pdfCount++;
      } else if (mat.textSnippet) {
        parts.push({
          text: `[Course Material: ${mat.fileName} (${mat.fileType})]\n${mat.textSnippet}`,
        });
      }
    }

    // Prompt instructions with strict grounding rules
    const promptText = `
You are an expert university curriculum and knowledge graph analyst for Bangladesh University of Engineering and Technology (RUET).
Analyze the attached course materials (PDF slides, syllabi, lecture notes, CT questions) for the course "${courseCode}: ${courseTitle || ""}".

CRITICAL INSTRUCTIONS & GROUNDING DIRECTIVES:
1. Extract and identify the curriculum structure strictly and faithfully from the provided documents.
2. DO NOT invent, hallucinate, or assume topics, subtopics, or concepts that are not directly supported by the uploaded material.
3. Identify:
   - Major Topics (title, chapter/module, detailed description)
   - Category for each topic ('prerequisite', 'core', 'advanced', or 'application')
   - Subtopics (list of specific subtopics, subheadings, and algorithms mentioned in the text)
   - Important Concepts (key definitions, theorems, formulas, or terminologies directly in the material)
   - Likely Prerequisite Relationships (which topics must be understood before others)
   - Estimated Difficulty ('basic', 'intermediate', 'advanced') and Importance ('high', 'medium', 'low')
   - Estimated study hours per topic (e.g. 3 to 12 hours)
   - Explicit directed prerequisite relationships between the identified topic IDs.

Return a valid, structured JSON output matching the required schema.
`;

    parts.push({ text: promptText });

    // Structured JSON schema definition using @google/genai Type enum
    const { Type } = await import("@google/genai");

    const analysisSchema = {
      type: Type.OBJECT,
      properties: {
        courseCode: { type: Type.STRING, description: "The course code" },
        courseTitle: { type: Type.STRING, description: "The course title" },
        summary: {
          type: Type.STRING,
          description: "Summary of the analyzed course materials and academic scope grounded strictly in the provided documents.",
        },
        topics: {
          type: Type.ARRAY,
          description: "Major academic topics extracted directly from the uploaded material.",
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique snake_case identifier (e.g. topic_relational_algebra)" },
              label: { type: Type.STRING, description: "Clear topic title" },
              category: {
                type: Type.STRING,
                description: "Category: 'prerequisite', 'core', 'advanced', or 'application'",
              },
              chapter: { type: Type.STRING, description: "Chapter or Module title" },
              description: {
                type: Type.STRING,
                description: "Detailed description of the topic content grounded strictly in the material",
              },
              importance: {
                type: Type.STRING,
                description: "'high', 'medium', or 'low'",
              },
              difficulty: {
                type: Type.STRING,
                description: "'basic', 'intermediate', or 'advanced'",
              },
              estimatedHours: {
                type: Type.INTEGER,
                description: "Estimated study hours (integer)",
              },
              subtopics: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of specific subtopics found in the material",
              },
              importantConcepts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Key definitions, formulas, or theorems found in the material",
              },
              prerequisites: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Prerequisite topic labels or IDs required before this topic",
              },
            },
            required: [
              "id",
              "label",
              "category",
              "chapter",
              "description",
              "importance",
              "difficulty",
              "estimatedHours",
              "subtopics",
              "importantConcepts",
              "prerequisites",
            ],
          },
        },
        relationships: {
          type: Type.ARRAY,
          description: "Prerequisite and dependency edges between topics.",
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Edge identifier" },
              source: { type: Type.STRING, description: "ID of the prerequisite/source topic" },
              target: { type: Type.STRING, description: "ID of the dependent/target topic" },
              label: { type: Type.STRING, description: "Short relationship description, e.g. 'prerequisite for', 'builds on'" },
            },
            required: ["source", "target"],
          },
        },
      },
      required: ["courseCode", "summary", "topics", "relationships"],
    };

    // Call Gemini API with automatic exponential backoff retry and fallback models
    const geminiResult = await callGeminiWithRetryAndFallback(ai, {
      primaryModel: "gemini-3.7-flash",
      contents: parts,
      config: {
        systemInstruction:
          "You are an academic curriculum parser for university engineering courses. Ground all extracted topics, subtopics, and concepts strictly and faithfully in the uploaded course material (PDF documents). Do not invent topics that are not supported by the uploaded material.",
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.2, // Low temperature for high factual precision and zero hallucination
      },
    });

    const rawParsed = parseJsonSafely(geminiResult.text);

    // Coordinate layout positioning calculation for Knowledge Map canvas
    const rawTopics: any[] = Array.isArray(rawParsed.topics) ? rawParsed.topics : [];
    const rawEdges: any[] = Array.isArray(rawParsed.relationships) ? rawParsed.relationships : [];

    // Group topics by category or rank
    const categoryColumns: Record<string, number> = {
      prerequisite: 40,
      core: 280,
      advanced: 520,
      application: 760,
    };

    const categoryCounters: Record<string, number> = {
      prerequisite: 0,
      core: 0,
      advanced: 0,
      application: 0,
    };

    const validCategories = ["prerequisite", "core", "advanced", "application"];
    const validImportances = ["high", "medium", "low"];

    const processedNodes = rawTopics.map((topic, index) => {
      let cat = (topic.category || "core").toLowerCase();
      if (!validCategories.includes(cat)) {
        cat = "core";
      }

      let imp = (topic.importance || "medium").toLowerCase();
      if (!validImportances.includes(imp)) {
        imp = "medium";
      }

      const colX = categoryColumns[cat] || 280;
      const rowIdx = categoryCounters[cat] || 0;
      categoryCounters[cat] = rowIdx + 1;

      const xPos = colX;
      const yPos = 40 + rowIdx * 135;

      return {
        id: topic.id || `topic-${index + 1}`,
        label: topic.label || `Topic ${index + 1}`,
        category: cat as "prerequisite" | "core" | "advanced" | "application",
        chapter: topic.chapter || `Chapter ${index + 1}`,
        description: topic.description || "",
        importance: imp as "high" | "medium" | "low",
        difficulty: topic.difficulty || "intermediate",
        estimatedHours: Number(topic.estimatedHours) || 6,
        status: "untested" as const,
        subtopics: Array.isArray(topic.subtopics) ? topic.subtopics : [],
        importantConcepts: Array.isArray(topic.importantConcepts) ? topic.importantConcepts : [],
        prerequisites: Array.isArray(topic.prerequisites) ? topic.prerequisites : [],
        x: xPos,
        y: yPos,
      };
    });

    // Process edges and ensure valid node references
    const nodeIds = new Set(processedNodes.map((n) => n.id));
    const processedEdges = rawEdges
      .map((edge, idx) => {
        let sourceId = edge.source;
        let targetId = edge.target;

        // If source/target is a label instead of id, resolve it
        if (!nodeIds.has(sourceId)) {
          const found = processedNodes.find((n) => n.label.toLowerCase() === String(sourceId).toLowerCase());
          if (found) sourceId = found.id;
        }
        if (!nodeIds.has(targetId)) {
          const found = processedNodes.find((n) => n.label.toLowerCase() === String(targetId).toLowerCase());
          if (found) targetId = found.id;
        }

        if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) {
          return null;
        }

        return {
          id: edge.id || `edge-${idx + 1}-${sourceId}-${targetId}`,
          source: sourceId,
          target: targetId,
          label: edge.label || "prerequisite for",
        };
      })
      .filter(Boolean);

    return res.json({
      success: true,
      courseId,
      courseCode: rawParsed.courseCode || courseCode,
      courseTitle: rawParsed.courseTitle || courseTitle,
      summary: rawParsed.summary || `Extracted ${processedNodes.length} academic topics and curriculum prerequisites from uploaded course materials.`,
      nodes: processedNodes,
      edges: processedEdges,
      extractedTopicsCount: processedNodes.length,
      relationshipsCount: processedEdges.length,
      modelUsed: geminiResult.modelUsed,
      processedFilesCount: stagedFiles.length,
      message: `Gemini API successfully extracted ${processedNodes.length} topics and ${processedEdges.length} prerequisite pathways for ${courseCode}.`,
    });
  } catch (error: any) {
    console.error("Error in /api/courses/analyze with Gemini API:", error);
    const isHighDemand = error?.message?.includes("503") || error?.message?.includes("high demand") || error?.status === 503;
    return res.status(isHighDemand ? 503 : 500).json({
      error: isHighDemand 
        ? "Gemini model is currently experiencing high demand. Please try again in a few moments."
        : "Gemini AI analysis failed.",
      details: error.message || String(error),
    });
  }
});

// 5. Server-Side Diagnostic Quiz Generation Endpoint (10 Questions via Gemini 3.7 Flash)
// Generates exactly 10 multiple-choice questions grounded solely in uploaded materials across topics & difficulty levels
app.post("/api/quiz/generate", async (req, res) => {
  try {
    const { courseId, courseCode, courseTitle, knowledgeNodes, materials } = req.body;

    if (!courseId || !courseCode) {
      return res.status(400).json({ error: "courseId and courseCode are required." });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({
        error: "GEMINI_API_KEY environment variable is missing on the server. Please configure GEMINI_API_KEY in the Secrets settings.",
      });
    }

    // Retrieve staged files or incoming materials
    let stagedFiles = serverStagedMaterials.get(courseId) || [];
    if (stagedFiles.length === 0 && Array.isArray(materials) && materials.length > 0) {
      stagedFiles = materials;
    }

    const parts: any[] = [];

    // Multimodal PDF content from staged files
    for (const mat of stagedFiles) {
      if (mat.base64Data && mat.base64Data.length > 0) {
        const cleanBase64 = mat.base64Data.replace(/^data:[^;]+;base64,/, "");
        const mime = mat.mimeType || "application/pdf";
        parts.push({
          inlineData: {
            mimeType: mime,
            data: cleanBase64,
          },
        });
      } else if (mat.textSnippet) {
        parts.push({
          text: `[Course Material: ${mat.fileName} (${mat.fileType})]\n${mat.textSnippet}`,
        });
      }
    }

    // Include analyzed topics list for targeted question distribution
    const topicsContext = Array.isArray(knowledgeNodes) && knowledgeNodes.length > 0
      ? `Analyzed Course Topics to cover: ${JSON.stringify(knowledgeNodes.map((n: any) => ({ id: n.id, label: n.label, chapter: n.chapter, subtopics: n.subtopics, importance: n.importance })))}`
      : "";

    const promptText = `
You are an expert university examiner for RUET (Rajshahi University of Engineering and Technology).
Generate exactly 10 high-quality diagnostic multiple-choice assessment questions for the course "${courseCode}: ${courseTitle || ""}".

CRITICAL INSTRUCTIONS & GROUNDING DIRECTIVES:
1. Base all 10 questions STRICTLY on the attached uploaded course material (PDF lecture slides, syllabus, notes, CT questions) and analyzed topics.
2. DO NOT invent, hallucinate, or ask about topics or facts not directly supported by the uploaded material.
3. The 10 questions MUST cover different topics and chapters across the course syllabus.
4. Distribute questions across different difficulty levels:
   - 3 to 4 Basic (foundational definitions, core rules, fundamental properties)
   - 4 to 5 Intermediate (applied reasoning, standard algorithmic steps, relationship analysis)
   - 2 to 3 Advanced (complex scenario analysis, edge cases, synthesis of multiple concepts)
5. Each question must have exactly 4 plausible choices (options A, B, C, D) and exactly 1 correct answer.
6. Provide a clear pedagogical explanation justifying the correct answer based on the course material.
7. Tag each question with its corresponding topicId and topicName from the syllabus.

${topicsContext}
`;

    parts.push({ text: promptText });

    const { Type } = await import("@google/genai");

    const quizSchema = {
      type: Type.OBJECT,
      properties: {
        courseCode: { type: Type.STRING },
        questions: {
          type: Type.ARRAY,
          description: "List of exactly 10 multiple-choice diagnostic questions grounded strictly in the course material.",
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique question id (e.g. q1, q2, ... q10)" },
              topicId: { type: Type.STRING, description: "Matching topic ID from the course knowledge map" },
              topicName: { type: Type.STRING, description: "Name of the topic being tested" },
              question: { type: Type.STRING, description: "The question statement" },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Exactly 4 multiple choice options",
              },
              correctOptionIndex: {
                type: Type.INTEGER,
                description: "Index of the correct option (0, 1, 2, or 3)",
              },
              explanation: {
                type: Type.STRING,
                description: "Clear pedagogical explanation explaining why the correct choice is right and other choices are wrong",
              },
              difficulty: {
                type: Type.STRING,
                description: "'basic', 'intermediate', or 'advanced'",
              },
            },
            required: [
              "id",
              "topicId",
              "topicName",
              "question",
              "options",
              "correctOptionIndex",
              "explanation",
              "difficulty",
            ],
          },
        },
      },
      required: ["courseCode", "questions"],
    };

    const geminiResult = await callGeminiWithRetryAndFallback(ai, {
      primaryModel: "gemini-3.7-flash",
      contents: parts,
      config: {
        systemInstruction:
          "You are a rigorous university examination system for RUET. Generate exactly 10 multiple-choice diagnostic questions based strictly on the uploaded course material without inventing unsupported questions or facts.",
        responseMimeType: "application/json",
        responseSchema: quizSchema,
        temperature: 0.3,
      },
    });

    const rawParsed = parseJsonSafely(geminiResult.text);
    const questions: any[] = Array.isArray(rawParsed.questions) ? rawParsed.questions : [];

    // Fallback ID and validation check
    const formattedQuestions = questions.map((q, idx) => ({
      id: q.id || `q${idx + 1}`,
      topicId: q.topicId || (knowledgeNodes?.[idx % (knowledgeNodes.length || 1)]?.id) || `topic-${idx + 1}`,
      topicName: q.topicName || (knowledgeNodes?.[idx % (knowledgeNodes.length || 1)]?.label) || `Topic ${idx + 1}`,
      question: q.question,
      options: Array.isArray(q.options) && q.options.length === 4 ? q.options : (q.options || ["A", "B", "C", "D"]),
      correctOptionIndex: typeof q.correctOptionIndex === "number" && q.correctOptionIndex >= 0 && q.correctOptionIndex <= 3 ? q.correctOptionIndex : 0,
      explanation: q.explanation || "Refer to the course materials and syllabus notes for detailed derivations.",
      difficulty: (["basic", "intermediate", "advanced"].includes(q.difficulty?.toLowerCase()) ? q.difficulty.toLowerCase() : "intermediate") as "basic" | "intermediate" | "advanced",
    }));

    return res.json({
      success: true,
      courseId,
      courseCode: rawParsed.courseCode || courseCode,
      totalQuestions: formattedQuestions.length,
      questions: formattedQuestions,
      modelUsed: geminiResult.modelUsed,
      message: `Generated ${formattedQuestions.length} diagnostic questions strictly from ${courseCode} materials.`,
    });
  } catch (error: any) {
    console.error("Error in /api/quiz/generate with Gemini API:", error);
    const isHighDemand = error?.message?.includes("503") || error?.message?.includes("high demand") || error?.status === 503;
    return res.status(isHighDemand ? 503 : 500).json({
      error: isHighDemand 
        ? "Gemini model is currently experiencing high demand. Please try again in a few moments."
        : "Failed to generate diagnostic quiz using Gemini API.",
      details: error.message || String(error),
    });
  }
});

// 6. Server-Side Diagnostic Quiz Evaluation & AI Study Diagnosis Endpoint
// Evaluates student submission, analyzes performance by topic, classifies as Strong/Needs Practice/Critical,
// explains why attention is needed based on student choices & uploaded materials, and recommends concrete next actions.
app.post("/api/quiz/evaluate", async (req, res) => {
  try {
    const {
      courseId,
      courseCode,
      courseTitle,
      score,
      totalQuestions,
      studentAnswers,
      topicPerformances,
      weakTopics,
      materials,
    } = req.body;

    if (!courseId || !courseCode || !Array.isArray(studentAnswers)) {
      return res.status(400).json({ error: "Missing submission performance data." });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({
        error: "GEMINI_API_KEY environment variable is missing on the server.",
      });
    }

    const percentage = Math.round((Number(score) / Math.max(1, Number(totalQuestions))) * 100);

    // Retrieve staged files or incoming materials for course context
    let stagedFiles = serverStagedMaterials.get(courseId) || [];
    if (stagedFiles.length === 0 && Array.isArray(materials) && materials.length > 0) {
      stagedFiles = materials;
    }

    const materialSummaries = stagedFiles.map((m: any, i: number) => {
      return `[Doc ${i + 1}] ${m.title || m.fileName} (${m.fileType || "material"})`;
    }).join("\n");

    const evaluationPrompt = `
You are the Senior Academic Diagnostic Advisor and Curriculum Specialist for engineering students at Rajshahi University of Engineering & Technology (RUET).
A student has completed an academic diagnostic assessment for course "${courseCode}: ${courseTitle || ""}".

UPLOADED COURSE MATERIAL CONTEXT:
${materialSummaries || "Standard RUET Engineering Curriculum Materials"}

STUDENT PERFORMANCE DATA:
- Overall Score: ${score}/${totalQuestions} (${percentage}%)
- Question-by-Question Breakdown:
${JSON.stringify(studentAnswers, null, 2)}

- Pre-calculated Topic Statistics:
${JSON.stringify(topicPerformances, null, 2)}

CRITICAL PEDAGOGICAL INSTRUCTIONS:
1. ANALYZE PERFORMANCE BY TOPIC: For EVERY unique topic covered in the quiz, evaluate student responses.
2. CALCULATE & CLASSIFY:
   - Classify each topic strictly into ONE of:
     * "Critical" (Score < 50%, or fundamental conceptual error, severe prerequisite deficiency)
     * "Needs Practice" (Score 50% - 79%, partial comprehension, mistakes on edge cases or application)
     * "Strong" (Score >= 80%, high conceptual mastery and accurate problem solving)
3. EXPLAIN WHY THE TOPIC NEEDS ATTENTION:
   - Provide a deep, technical, curriculum-specific reason pointing to the student's exact wrong choices, false assumptions, or missing theorems.
   - Ground the explanation in the course materials (e.g. reference specific lecture topics, formulas, or algorithmic behaviors).
4. RECOMMEND WHAT THE STUDENT SHOULD DO NEXT:
   - Provide 2 to 4 concrete, actionable, high-impact learning tasks based on the uploaded course material and quiz performance.
   - Include specific slide concepts, mathematical derivations, textbook sections, or RUET past Class Test / Term Final problem patterns to solve.
   - STRICT MANDATE: DO NOT simply give generic motivational advice (e.g. DO NOT write "Stay positive", "Study harder", "Practice regularly", or "Keep it up"). Every single recommendation must be a concrete academic directive.
5. PRIORITIZED ACTION PLAN:
   - Formulate a 4-step chronological study plan with estimated minutes and specific material references to fix critical and needs-practice gaps.
6. TOPIC MASTERY UPDATES:
   - Provide updated mastery statuses ('mastered', 'moderate', 'weak', or 'needs_revision') for the knowledge graph.
`;

    const { Type } = await import("@google/genai");

    const evaluationSchema = {
      type: Type.OBJECT,
      properties: {
        academicStanding: {
          type: Type.STRING,
          description: "Clear academic performance descriptor (e.g. 'Foundational Gaps in Schema Normalization')",
        },
        executiveDiagnosis: {
          type: Type.STRING,
          description: "Pedagogical diagnosis of overall strengths, critical vulnerabilities, and readiness for RUET exams.",
        },
        topicDiagnoses: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              topicId: { type: Type.STRING },
              topicName: { type: Type.STRING },
              chapter: { type: Type.STRING, description: "Module or Chapter name from syllabus" },
              totalQuestions: { type: Type.INTEGER },
              correctAnswers: { type: Type.INTEGER },
              incorrectAnswers: { type: Type.INTEGER },
              performancePercentage: { type: Type.INTEGER },
              classification: { 
                type: Type.STRING, 
                description: "Must be exactly 'Strong', 'Needs Practice', or 'Critical'" 
              },
              whyNeedsAttention: { 
                type: Type.STRING, 
                description: "Detailed, concrete explanation of why this topic needs attention based on the student's specific quiz answers and course materials." 
              },
              recommendedNextActions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "2 to 4 concrete, non-generic study actions based on uploaded materials and quiz mistakes."
              },
              keyFormulasOrConcepts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Key formulas, definitions, or theorems to review"
              },
              recommendedPrerequisites: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Prerequisite concepts that need reinforcement"
              },
              sourceMaterialReference: {
                type: Type.STRING,
                description: "Specific reference to uploaded lecture slides, chapters, or CT questions"
              }
            },
            required: [
              "topicId",
              "topicName",
              "totalQuestions",
              "correctAnswers",
              "incorrectAnswers",
              "performancePercentage",
              "classification",
              "whyNeedsAttention",
              "recommendedNextActions",
              "keyFormulasOrConcepts",
              "recommendedPrerequisites",
              "sourceMaterialReference"
            ],
          },
        },
        prioritizedActionPlan: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              stepNumber: { type: Type.INTEGER },
              topicName: { type: Type.STRING },
              actionTitle: { type: Type.STRING },
              actionDetail: { type: Type.STRING },
              estimatedMinutes: { type: Type.INTEGER },
              materialReference: { type: Type.STRING },
              priority: { type: Type.STRING, description: "'high', 'medium', or 'low'" }
            },
            required: ["stepNumber", "topicName", "actionTitle", "actionDetail", "estimatedMinutes", "materialReference", "priority"]
          }
        },
        recommendedMasteryUpdates: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              topicId: { type: Type.STRING },
              newStatus: {
                type: Type.STRING,
                description: "'mastered', 'moderate', 'weak', or 'needs_revision'",
              },
            },
            required: ["topicId", "newStatus"],
          },
        },
      },
      required: [
        "academicStanding",
        "executiveDiagnosis",
        "topicDiagnoses",
        "prioritizedActionPlan",
        "recommendedMasteryUpdates",
      ],
    };

    const geminiResult = await callGeminiWithRetryAndFallback(ai, {
      primaryModel: "gemini-3.7-flash",
      contents: [{ text: evaluationPrompt }],
      config: {
        systemInstruction:
          "You are an expert engineering professor and diagnostic examiner at RUET. Provide rigorous, granular, non-generic academic diagnoses based strictly on the uploaded materials and student performance.",
        responseMimeType: "application/json",
        responseSchema: evaluationSchema,
        temperature: 0.2,
      },
    });

    const report = parseJsonSafely(geminiResult.text);

    const topicDiagnoses = Array.isArray(report.topicDiagnoses) ? report.topicDiagnoses : [];
    const criticalCount = topicDiagnoses.filter((t: any) => t.classification === "Critical").length;
    const needsPracticeCount = topicDiagnoses.filter((t: any) => t.classification === "Needs Practice").length;
    const strongCount = topicDiagnoses.filter((t: any) => t.classification === "Strong").length;

    const fullDiagnosisReport = {
      id: `diag-${Date.now()}`,
      courseId,
      courseCode,
      courseTitle: courseTitle || "",
      timestamp: new Date().toISOString(),
      overallScore: Number(score),
      totalQuestions: Number(totalQuestions),
      overallPercentage: percentage,
      academicStanding: report.academicStanding || "Diagnostic Evaluation Completed",
      executiveDiagnosis: report.executiveDiagnosis || "Evaluation completed based on quiz performance.",
      topicDiagnoses,
      criticalCount,
      needsPracticeCount,
      strongCount,
      prioritizedActionPlan: report.prioritizedActionPlan || [],
      recommendedMasteryUpdates: report.recommendedMasteryUpdates || [],
      modelUsed: geminiResult.modelUsed,
    };

    // Backward compatibility formatting
    const weakTopicsFormatted = topicDiagnoses
      .filter((td: any) => td.classification === "Critical" || td.classification === "Needs Practice")
      .map((td: any) => ({
        topicId: td.topicId,
        topicName: td.topicName,
        scorePercentage: td.performancePercentage,
        diagnosticFeedback: td.whyNeedsAttention,
        recommendedPrerequisitesToReview: td.recommendedPrerequisites || [],
        keyFormulasOrConcepts: td.keyFormulasOrConcepts || [],
      }));

    return res.json({
      success: true,
      score: Number(score),
      totalQuestions: Number(totalQuestions),
      scorePercentage: percentage,
      gradeDescriptor: report.academicStanding || "Diagnostic Assessment Complete",
      overallAssessment: report.executiveDiagnosis || "Your diagnostic test has been evaluated.",
      topicPerformances: topicPerformances || [],
      topicDiagnoses,
      weakTopics: weakTopicsFormatted,
      studyRoadmap: (report.prioritizedActionPlan || []).map((p: any) => `${p.actionTitle}: ${p.actionDetail} (${p.estimatedMinutes} mins)`),
      prioritizedActionPlan: report.prioritizedActionPlan || [],
      recommendedMasteryUpdates: report.recommendedMasteryUpdates || [],
      diagnosisReport: fullDiagnosisReport,
      modelUsed: geminiResult.modelUsed,
    });
  } catch (error: any) {
    console.error("Error in /api/quiz/evaluate with Gemini API:", error);
    const isHighDemand = error?.message?.includes("503") || error?.message?.includes("high demand") || error?.status === 503;
    return res.status(isHighDemand ? 503 : 500).json({
      error: isHighDemand 
        ? "Gemini model is currently experiencing high demand. Please try again in a few moments."
        : "Failed to evaluate quiz performance and generate study diagnosis using Gemini API.",
      details: error.message || String(error),
    });
  }
});

// 7. On-demand AI Study Diagnosis Endpoint
app.post("/api/diagnosis/generate", async (req, res) => {
  try {
    const { courseId, courseCode, courseTitle, knowledgeNodes, studentAnswers, topicPerformances } = req.body;
    if (!courseId || !courseCode) {
      return res.status(400).json({ error: "Missing course identification." });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({
        error: "GEMINI_API_KEY environment variable is missing on the server.",
      });
    }

    // Retrieve staged materials
    const stagedFiles = serverStagedMaterials.get(courseId) || [];
    const materialSummaries = stagedFiles.map((m: any, i: number) => {
      return `[Doc ${i + 1}] ${m.title || m.fileName} (${m.fileType || "material"})`;
    }).join("\n");

    const prompt = `
You are the Senior Academic Diagnostic Advisor at RUET.
Generate a comprehensive topic-by-topic AI Study Diagnosis for course "${courseCode}: ${courseTitle || ""}".

COURSE MATERIAL CONTEXT:
${materialSummaries || "Standard RUET Engineering Curriculum Materials"}

COURSE NODES & TOPICS:
${JSON.stringify(knowledgeNodes || [], null, 2)}

RECENT QUIZ PERFORMANCE DATA (IF AVAILABLE):
${JSON.stringify(studentAnswers || [], null, 2)}
${JSON.stringify(topicPerformances || [], null, 2)}

INSTRUCTIONS:
1. For EACH course topic, calculate or assess performance.
2. Classify each as "Strong", "Needs Practice", or "Critical".
3. Explain why each topic needs attention with deep, curriculum-specific reasoning (no generic advice).
4. Recommend concrete next actions grounded in the uploaded materials (slides, derivations, RUET exam problems).
5. Produce a prioritized study plan with realistic timeframes.
`;

    const { Type } = await import("@google/genai");

    const diagnosisSchema = {
      type: Type.OBJECT,
      properties: {
        academicStanding: { type: Type.STRING },
        executiveDiagnosis: { type: Type.STRING },
        topicDiagnoses: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              topicId: { type: Type.STRING },
              topicName: { type: Type.STRING },
              chapter: { type: Type.STRING },
              totalQuestions: { type: Type.INTEGER },
              correctAnswers: { type: Type.INTEGER },
              incorrectAnswers: { type: Type.INTEGER },
              performancePercentage: { type: Type.INTEGER },
              classification: { type: Type.STRING },
              whyNeedsAttention: { type: Type.STRING },
              recommendedNextActions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              keyFormulasOrConcepts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              recommendedPrerequisites: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              sourceMaterialReference: { type: Type.STRING },
            },
            required: [
              "topicId",
              "topicName",
              "totalQuestions",
              "correctAnswers",
              "incorrectAnswers",
              "performancePercentage",
              "classification",
              "whyNeedsAttention",
              "recommendedNextActions",
              "keyFormulasOrConcepts",
              "recommendedPrerequisites",
              "sourceMaterialReference",
            ],
          },
        },
        prioritizedActionPlan: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              stepNumber: { type: Type.INTEGER },
              topicName: { type: Type.STRING },
              actionTitle: { type: Type.STRING },
              actionDetail: { type: Type.STRING },
              estimatedMinutes: { type: Type.INTEGER },
              materialReference: { type: Type.STRING },
              priority: { type: Type.STRING },
            },
            required: ["stepNumber", "topicName", "actionTitle", "actionDetail", "estimatedMinutes", "materialReference", "priority"],
          },
        },
        recommendedMasteryUpdates: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              topicId: { type: Type.STRING },
              newStatus: { type: Type.STRING },
            },
            required: ["topicId", "newStatus"],
          },
        },
      },
      required: ["academicStanding", "executiveDiagnosis", "topicDiagnoses", "prioritizedActionPlan", "recommendedMasteryUpdates"],
    };

    const geminiResult = await callGeminiWithRetryAndFallback(ai, {
      primaryModel: "gemini-3.7-flash",
      contents: [{ text: prompt }],
      config: {
        systemInstruction: "You are an expert RUET academic tutor. Deliver concrete, non-generic study diagnoses.",
        responseMimeType: "application/json",
        responseSchema: diagnosisSchema,
        temperature: 0.2,
      },
    });

    const report = parseJsonSafely(geminiResult.text);

    const topicDiagnoses = Array.isArray(report.topicDiagnoses) ? report.topicDiagnoses : [];
    const criticalCount = topicDiagnoses.filter((t: any) => t.classification === "Critical").length;
    const needsPracticeCount = topicDiagnoses.filter((t: any) => t.classification === "Needs Practice").length;
    const strongCount = topicDiagnoses.filter((t: any) => t.classification === "Strong").length;

    const diagnosisReport = {
      id: `diag-${Date.now()}`,
      courseId,
      courseCode,
      courseTitle: courseTitle || "",
      timestamp: new Date().toISOString(),
      overallScore: 0,
      totalQuestions: 0,
      overallPercentage: 0,
      academicStanding: report.academicStanding || "Curriculum Diagnostic Report",
      executiveDiagnosis: report.executiveDiagnosis || "Diagnostic analysis prepared.",
      topicDiagnoses,
      criticalCount,
      needsPracticeCount,
      strongCount,
      prioritizedActionPlan: report.prioritizedActionPlan || [],
      recommendedMasteryUpdates: report.recommendedMasteryUpdates || [],
      modelUsed: geminiResult.modelUsed,
    };

    return res.json({
      success: true,
      diagnosisReport,
      modelUsed: geminiResult.modelUsed,
    });
  } catch (error: any) {
    console.error("Error in /api/diagnosis/generate with Gemini API:", error);
    const isHighDemand = error?.message?.includes("503") || error?.message?.includes("high demand") || error?.status === 503;
    return res.status(isHighDemand ? 503 : 500).json({
      error: isHighDemand 
        ? "Gemini model is currently experiencing high demand. Please try again in a few moments."
        : "Failed to generate AI study diagnosis using Gemini API.",
      details: error.message || String(error),
    });
  }
});



// Vite middleware for development / Static file serving for production
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`RUET MindMap AI server running on http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic();
