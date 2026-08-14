import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface StagedServerMaterial {
  id: string;
  courseId: string;
  fileName: string;
  title: string;
  fileType: string;
  fileSize: string;
  rawSizeBytes?: number;
  mimeType?: string;
  base64Data?: string;
  textSnippet?: string;
  uploadedAt: string;
}

export interface StoredStudentAnswer {
  questionId: string;
  topicId: string;
  topicName: string;
  questionText: string;
  selectedOptionIndex: number | null;
  selectedOptionText?: string;
  correctOptionIndex: number;
  correctOptionText?: string;
  isCorrect: boolean;
  explanation: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

export interface StoredTopicLevelScore {
  topicId: string;
  topicName: string;
  score: number;
  total: number;
  percentage: number;
  classification: 'Critical' | 'Needs Practice' | 'Strong';
  status: 'mastered' | 'moderate' | 'weak' | 'needs_revision';
  whyNeedsAttention?: string;
  recommendedNextActions?: string[];
}

export interface StoredAiRecommendations {
  academicStanding: string;
  executiveDiagnosis: string;
  prioritizedActionPlan: Array<{
    stepNumber: number;
    topicName: string;
    actionTitle: string;
    actionDetail: string;
    estimatedMinutes: number;
    materialReference: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  studyRoadmap: string[];
  recommendedMasteryUpdates: Array<{
    topicId: string;
    newStatus: string;
  }>;
}

export interface UserQuizAttemptRecord {
  id: string;
  userId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  timestamp: string;
  quizScores: {
    score: number;
    totalQuestions: number;
    percentage: number;
    gradeDescriptor: string;
  };
  individualAnswers: StoredStudentAnswer[];
  topicLevelScores: StoredTopicLevelScore[];
  strongTopics: string[]; // Names or IDs of topics with >= 80%
  weakTopics: string[]; // Names or IDs of topics needing attention (< 60% or critical errors)
  aiGeneratedStudyRecommendations: StoredAiRecommendations;
  timestamps: {
    startedAt: string;
    completedAt: string;
  };
}

export interface UploadedCourseInfo {
  courseId: string;
  courseCode: string;
  courseName: string;
  description: string;
  credits: number;
  department: string;
  instructor?: string;
  materialsCount: number;
  materials: Array<{
    id: string;
    fileName: string;
    title: string;
    fileType: string;
    fileSize: string;
    uploadDate: string;
    status: string;
    pages?: number;
  }>;
  lastUpdated: string;
}

export interface IdentifiedTopicNode {
  id: string;
  label: string;
  category: 'core' | 'prerequisite' | 'applied' | 'advanced';
  chapter?: string;
  description: string;
  importance: 'high' | 'medium' | 'low';
  estimatedHours: number;
  status: 'mastered' | 'moderate' | 'weak' | 'needs_revision' | 'untested';
  subtopics?: string[];
  prerequisites?: string[];
  x?: number;
  y?: number;
}

export interface IdentifiedTopicEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
}

export interface UserCourseProgress {
  userId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  uploadedCourseInfo: UploadedCourseInfo;
  identifiedTopics: IdentifiedTopicNode[];
  identifiedEdges: IdentifiedTopicEdge[];
  quizAttempts: UserQuizAttemptRecord[];
  strongTopics: string[];
  weakTopics: string[];
  latestAiRecommendations?: StoredAiRecommendations;
  overallMasteryPercentage: number;
  totalQuizzesTaken: number;
  latestScorePercentage?: number;
  highestScorePercentage?: number;
  averageScorePercentage?: number;
  lastAttemptTimestamp?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OverallUserProgressReport {
  userId: string;
  totalCoursesEnrolled: number;
  totalMaterialsUploaded: number;
  totalTopicsIdentified: number;
  totalMasteredTopics: number;
  totalWeakTopics: number;
  totalQuizAttempts: number;
  overallAverageScore: number;
  recentQuizAttempts: UserQuizAttemptRecord[];
  coursesProgress: Record<string, UserCourseProgress>;
  lastActiveTimestamp: string;
}

export interface UserAccountRecord {
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

interface DatabaseSchema {
  version: number;
  users: Record<string, UserAccountRecord>;
  userCourses: Record<string, any[]>; // userId -> Course[]
  userCourseProgress: Record<string, Record<string, UserCourseProgress>>; // userId -> courseId -> UserCourseProgress
  userQuizAttempts: Record<string, UserQuizAttemptRecord[]>; // userId -> UserQuizAttemptRecord[]
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'ruet_academic_db.json');

class PersistentProgressDatabase {
  private db: DatabaseSchema = {
    version: 1,
    users: {},
    userCourses: {},
    userCourseProgress: {},
    userQuizAttempts: {},
  };

  private isLoaded = false;
  private savePromise: Promise<void> = Promise.resolve();

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.db = {
          version: parsed.version || 1,
          users: parsed.users || {},
          userCourses: parsed.userCourses || {},
          userCourseProgress: parsed.userCourseProgress || {},
          userQuizAttempts: parsed.userQuizAttempts || {},
        };
      } else {
        this.persistSync();
      }
      this.isLoaded = true;
    } catch (err) {
      console.error('Failed to initialize persistent progress database:', err);
      this.isLoaded = true;
    }
  }

  private persistSync() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.db, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Error writing to database file:', err);
    }
  }

  private async persist(): Promise<void> {
    this.savePromise = this.savePromise.then(async () => {
      try {
        if (!fs.existsSync(DATA_DIR)) {
          await fs.promises.mkdir(DATA_DIR, { recursive: true });
        }
        const tmpFile = `${DB_FILE}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;
        await fs.promises.writeFile(tmpFile, JSON.stringify(this.db, null, 2), 'utf-8');
        await fs.promises.rename(tmpFile, DB_FILE);
      } catch (err) {
        console.error('Error persisting database asynchronously:', err);
      }
    });
    return this.savePromise;
  }

  // -------------------------------------------------------------
  // USER ACCOUNT OPERATIONS
  // -------------------------------------------------------------
  public getUserByEmail(email: string): UserAccountRecord | undefined {
    const normalized = email.trim().toLowerCase();
    return Object.values(this.db.users).find((u) => u.email.toLowerCase() === normalized);
  }

  public getUserById(userId: string): UserAccountRecord | undefined {
    return this.db.users[userId];
  }

  public async saveUser(user: UserAccountRecord): Promise<UserAccountRecord> {
    this.db.users[user.id] = user;
    await this.persist();
    return user;
  }

  public getAllUsers(): UserAccountRecord[] {
    return Object.values(this.db.users);
  }

  // -------------------------------------------------------------
  // USER COURSES OPERATIONS (Tenant-isolated by userId)
  // -------------------------------------------------------------
  public async getUserCourses(userId: string, defaultCoursesTemplate?: any[]): Promise<any[]> {
    if (!this.db.userCourses[userId]) {
      // Seed default courses for new student user
      if (defaultCoursesTemplate && Array.isArray(defaultCoursesTemplate) && defaultCoursesTemplate.length > 0) {
        this.db.userCourses[userId] = JSON.parse(JSON.stringify(defaultCoursesTemplate));
      } else {
        this.db.userCourses[userId] = [];
      }
      // Initialize course progress structure for each course
      for (const course of this.db.userCourses[userId]) {
        this.ensureCourseProgress(userId, course);
      }
      await this.persist();
    }
    return this.db.userCourses[userId];
  }

  public async saveUserCourse(userId: string, course: any): Promise<any> {
    if (!this.db.userCourses[userId]) {
      this.db.userCourses[userId] = [];
    }
    const existingIdx = this.db.userCourses[userId].findIndex((c) => c.id === course.id);
    if (existingIdx >= 0) {
      this.db.userCourses[userId][existingIdx] = course;
    } else {
      this.db.userCourses[userId].unshift(course);
    }
    this.ensureCourseProgress(userId, course);
    await this.persist();
    return course;
  }

  public async updateCourseMaterials(userId: string, courseId: string, materials: any[]): Promise<any[]> {
    const courses = await this.getUserCourses(userId);
    const course = courses.find((c) => c.id === courseId);
    if (course) {
      course.materials = materials;
      this.ensureCourseProgress(userId, course);
      await this.persist();
    }
    return materials;
  }

  public async updateCourseTopics(
    userId: string,
    courseId: string,
    nodes: any[],
    edges: any[],
    summary?: string
  ): Promise<{ nodes: any[]; edges: any[] }> {
    const courses = await this.getUserCourses(userId);
    const course = courses.find((c) => c.id === courseId);
    if (course) {
      course.knowledgeNodes = nodes;
      course.knowledgeEdges = edges;
      course.isAnalyzed = true;
      if (summary) course.description = summary;
      course.lastAnalysisDate = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      // Update progress record
      const prog = this.ensureCourseProgress(userId, course);
      prog.identifiedTopics = nodes;
      prog.identifiedEdges = edges;
      prog.updatedAt = new Date().toISOString();

      await this.persist();
    }
    return { nodes, edges };
  }

  // -------------------------------------------------------------
  // USER PROGRESS & QUIZ ATTEMPTS OPERATIONS (Tenant-isolated by userId)
  // -------------------------------------------------------------
  private ensureCourseProgress(userId: string, course: any): UserCourseProgress {
    if (!this.db.userCourseProgress[userId]) {
      this.db.userCourseProgress[userId] = {};
    }
    if (!this.db.userCourseProgress[userId][course.id]) {
      const now = new Date().toISOString();
      const materials = course.materials || [];
      const nodes = course.knowledgeNodes || [];
      const edges = course.knowledgeEdges || [];

      this.db.userCourseProgress[userId][course.id] = {
        userId,
        courseId: course.id,
        courseCode: course.code,
        courseName: course.title,
        uploadedCourseInfo: {
          courseId: course.id,
          courseCode: course.code,
          courseName: course.title,
          description: course.description || '',
          credits: course.credit || 3.0,
          department: course.department || 'CSE',
          instructor: course.instructor || '',
          materialsCount: materials.length,
          materials: materials.map((m: any) => ({
            id: m.id,
            fileName: m.fileName,
            title: m.title || m.fileName,
            fileType: m.fileType,
            fileSize: m.fileSize,
            uploadDate: m.uploadDate || now,
            status: m.status || 'ready',
            pages: m.pages,
          })),
          lastUpdated: now,
        },
        identifiedTopics: nodes,
        identifiedEdges: edges,
        quizAttempts: [],
        strongTopics: [],
        weakTopics: [],
        overallMasteryPercentage: 0,
        totalQuizzesTaken: 0,
        createdAt: now,
        updatedAt: now,
      };
    } else {
      // Sync latest course metadata if updated
      const prog = this.db.userCourseProgress[userId][course.id];
      prog.courseCode = course.code;
      prog.courseName = course.title;
      prog.uploadedCourseInfo.materialsCount = course.materials?.length || 0;
      prog.uploadedCourseInfo.materials = (course.materials || []).map((m: any) => ({
        id: m.id,
        fileName: m.fileName,
        title: m.title || m.fileName,
        fileType: m.fileType,
        fileSize: m.fileSize,
        uploadDate: m.uploadDate || new Date().toISOString(),
        status: m.status || 'ready',
        pages: m.pages,
      }));
      prog.identifiedTopics = course.knowledgeNodes || [];
      prog.identifiedEdges = course.knowledgeEdges || [];
      prog.updatedAt = new Date().toISOString();
    }
    return this.db.userCourseProgress[userId][course.id];
  }

  public async saveQuizAttempt(
    userId: string,
    attemptData: {
      courseId: string;
      courseCode: string;
      courseName: string;
      score: number;
      totalQuestions: number;
      percentage: number;
      gradeDescriptor?: string;
      individualAnswers: StoredStudentAnswer[];
      topicLevelScores: StoredTopicLevelScore[];
      strongTopics: string[];
      weakTopics: string[];
      aiGeneratedStudyRecommendations: StoredAiRecommendations;
      startedAt?: string;
      completedAt?: string;
    }
  ): Promise<UserQuizAttemptRecord> {
    const attemptId = `attempt_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const newRecord: UserQuizAttemptRecord = {
      id: attemptId,
      userId,
      courseId: attemptData.courseId,
      courseCode: attemptData.courseCode,
      courseName: attemptData.courseName,
      timestamp: now,
      quizScores: {
        score: attemptData.score,
        totalQuestions: attemptData.totalQuestions,
        percentage: attemptData.percentage,
        gradeDescriptor: attemptData.gradeDescriptor || (attemptData.percentage >= 80 ? 'Distinction' : attemptData.percentage >= 60 ? 'Satisfactory' : 'Needs Intervention'),
      },
      individualAnswers: attemptData.individualAnswers || [],
      topicLevelScores: attemptData.topicLevelScores || [],
      strongTopics: attemptData.strongTopics || [],
      weakTopics: attemptData.weakTopics || [],
      aiGeneratedStudyRecommendations: attemptData.aiGeneratedStudyRecommendations,
      timestamps: {
        startedAt: attemptData.startedAt || now,
        completedAt: attemptData.completedAt || now,
      },
    };

    // Store in global user quiz attempts array
    if (!this.db.userQuizAttempts[userId]) {
      this.db.userQuizAttempts[userId] = [];
    }
    this.db.userQuizAttempts[userId].unshift(newRecord);

    // Update course-level progress
    const courses = await this.getUserCourses(userId);
    const course = courses.find((c) => c.id === attemptData.courseId);
    if (course) {
      const prog = this.ensureCourseProgress(userId, course);
      prog.quizAttempts.unshift(newRecord);
      prog.strongTopics = Array.from(new Set([...prog.strongTopics, ...attemptData.strongTopics]));
      prog.weakTopics = attemptData.weakTopics; // current active weak topics
      prog.latestAiRecommendations = attemptData.aiGeneratedStudyRecommendations;
      prog.totalQuizzesTaken += 1;
      prog.latestScorePercentage = attemptData.percentage;
      prog.lastAttemptTimestamp = now;

      // Compute averages and mastery
      const scores = prog.quizAttempts.map((a) => a.quizScores.percentage);
      prog.highestScorePercentage = Math.max(...scores);
      prog.averageScorePercentage = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);

      // Update topic mastery statuses on course nodes
      if (attemptData.aiGeneratedStudyRecommendations?.recommendedMasteryUpdates) {
        const updateMap = new Map(
          attemptData.aiGeneratedStudyRecommendations.recommendedMasteryUpdates.map((u) => [u.topicId, u.newStatus])
        );
        course.knowledgeNodes = (course.knowledgeNodes || []).map((node: any) => {
          if (updateMap.has(node.id)) {
            return { ...node, status: updateMap.get(node.id) };
          }
          return node;
        });
        prog.identifiedTopics = course.knowledgeNodes;
      }

      const totalNodes = course.knowledgeNodes?.length || 1;
      const masteredNodes = (course.knowledgeNodes || []).filter((n: any) => n.status === 'mastered').length;
      prog.overallMasteryPercentage = Math.round((masteredNodes / totalNodes) * 100);
      prog.updatedAt = now;
    }

    await this.persist();
    return newRecord;
  }

  public async getUserProgressReport(userId: string): Promise<OverallUserProgressReport> {
    const courses = await this.getUserCourses(userId);
    const attempts = this.db.userQuizAttempts[userId] || [];
    const courseProgMap = this.db.userCourseProgress[userId] || {};

    let totalMaterials = 0;
    let totalTopics = 0;
    let totalMastered = 0;
    let totalWeak = 0;

    for (const course of courses) {
      totalMaterials += course.materials?.length || 0;
      const nodes = course.knowledgeNodes || [];
      totalTopics += nodes.length;
      totalMastered += nodes.filter((n: any) => n.status === 'mastered').length;
      totalWeak += nodes.filter((n: any) => n.status === 'weak' || n.status === 'needs_revision').length;
    }

    const avgScore = attempts.length > 0
      ? Math.round(attempts.reduce((sum, a) => sum + a.quizScores.percentage, 0) / attempts.length)
      : 0;

    return {
      userId,
      totalCoursesEnrolled: courses.length,
      totalMaterialsUploaded: totalMaterials,
      totalTopicsIdentified: totalTopics,
      totalMasteredTopics: totalMastered,
      totalWeakTopics: totalWeak,
      totalQuizAttempts: attempts.length,
      overallAverageScore: avgScore,
      recentQuizAttempts: attempts.slice(0, 10),
      coursesProgress: courseProgMap,
      lastActiveTimestamp: new Date().toISOString(),
    };
  }

  public async getCourseQuizAttempts(userId: string, courseId: string): Promise<UserQuizAttemptRecord[]> {
    const attempts = this.db.userQuizAttempts[userId] || [];
    return attempts.filter((a) => a.courseId === courseId);
  }

  public async updateTopicMasteryStatuses(
    userId: string,
    courseId: string,
    updates: Array<{ topicId: string; newStatus: any }>
  ): Promise<void> {
    const courses = await this.getUserCourses(userId);
    const course = courses.find((c) => c.id === courseId);
    if (course) {
      const updateMap = new Map(updates.map((u) => [u.topicId, u.newStatus]));
      course.knowledgeNodes = (course.knowledgeNodes || []).map((node: any) => {
        if (updateMap.has(node.id)) {
          return { ...node, status: updateMap.get(node.id) };
        }
        return node;
      });
      const prog = this.ensureCourseProgress(userId, course);
      prog.identifiedTopics = course.knowledgeNodes;
      prog.updatedAt = new Date().toISOString();
      await this.persist();
    }
  }
}

export const progressDb = new PersistentProgressDatabase();
