export type Department = 
  | 'CSE' // Computer Science & Engineering
  | 'EEE' // Electrical & Electronic Engineering
  | 'ECE' // Electrical & Computer Engineering
  | 'ETE' // Electronics & Telecommunication Engineering
  | 'ME'  // Mechanical Engineering
  | 'CE'  // Civil Engineering
  | 'IPE' // Industrial & Production Engineering
  | 'MTE' // Mechatronics Engineering
  | 'CHEM' // Chemical Engineering
  | 'MSE'; // Materials Science & Engineering

export type MaterialType = 'syllabus' | 'lecture_slide' | 'ct_question' | 'lab_sheet' | 'handwritten_note' | 'term_final_question';

export interface CourseMaterial {
  id: string;
  courseId: string;
  title: string;
  fileName: string;
  fileType: MaterialType;
  fileSize: string;
  rawSizeBytes?: number;
  base64Data?: string;
  mimeType?: string;
  uploadDate: string;
  uploadedBy?: string;
  pages?: number;
  status: 'ready_for_analysis' | 'analyzing' | 'analyzed' | 'error';
}

export type TopicMasteryStatus = 'untested' | 'mastered' | 'moderate' | 'weak' | 'needs_revision';

export interface KnowledgeNode {
  id: string;
  label: string;
  category: 'core' | 'advanced' | 'prerequisite' | 'application';
  chapter: string;
  description: string;
  importance: 'high' | 'medium' | 'low';
  estimatedHours: number;
  status: TopicMasteryStatus;
  subtopics: string[];
  prerequisites: string[];
  x: number;
  y: number;
}

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  department: Department;
  credit: number;
  series: string; // e.g. "Series '21"
  semester: string; // e.g. "3rd Year 1st Semester (3-1)"
  instructor: string;
  section?: string;
  description: string;
  materials: CourseMaterial[];
  knowledgeNodes: KnowledgeNode[];
  knowledgeEdges: KnowledgeEdge[];
  isAnalyzed: boolean;
  lastAnalysisDate?: string;
  latestDiagnosis?: StudyDiagnosisReport;
  diagnosisHistory?: StudyDiagnosisReport[];
}

export interface StudentProfile {
  id: string;
  name: string;
  rollNumber: string;
  series: string;
  department: Department;
  semester: string;
  cgpa?: number;
  email?: string;
  avatarUrl?: string;
}

export type ActiveTab = 'dashboard' | 'courses' | 'knowledge-map' | 'diagnostic-quiz' | 'study-diagnosis' | 'study-plan';

export type TopicClassification = 'Strong' | 'Needs Practice' | 'Critical';

export interface DiagnosticQuestion {
  id: string;
  topicId: string;
  topicName: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

export interface StudentAnswer {
  questionId: string;
  topicId: string;
  topicName: string;
  questionText: string;
  selectedOptionIndex: number | null;
  correctOptionIndex: number;
  isCorrect: boolean;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  explanation: string;
}

export interface TopicPerformance {
  topicId: string;
  topicName: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  scorePercentage: number;
  status: TopicMasteryStatus;
}

export interface TopicDiagnosis {
  topicId: string;
  topicName: string;
  chapter?: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  performancePercentage: number;
  classification: TopicClassification;
  whyNeedsAttention: string;
  recommendedNextActions: string[];
  keyFormulasOrConcepts: string[];
  recommendedPrerequisites: string[];
  sourceMaterialReference: string;
}

export interface PrioritizedActionItem {
  stepNumber: number;
  topicName: string;
  actionTitle: string;
  actionDetail: string;
  estimatedMinutes: number;
  materialReference: string;
  priority: 'high' | 'medium' | 'low';
}

export interface StudyDiagnosisReport {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  timestamp: string;
  overallScore: number;
  totalQuestions: number;
  overallPercentage: number;
  academicStanding: string;
  executiveDiagnosis: string;
  topicDiagnoses: TopicDiagnosis[];
  criticalCount: number;
  needsPracticeCount: number;
  strongCount: number;
  prioritizedActionPlan: PrioritizedActionItem[];
  recommendedMasteryUpdates: Array<{
    topicId: string;
    newStatus: TopicMasteryStatus;
  }>;
  modelUsed?: string;
}

export interface WeakTopicAnalysis {
  topicId: string;
  topicName: string;
  scorePercentage: number;
  diagnosticFeedback: string;
  recommendedPrerequisitesToReview: string[];
  keyFormulasOrConcepts: string[];
}

export interface QuizEvaluationReport {
  score: number;
  totalQuestions: number;
  scorePercentage: number;
  gradeDescriptor: string;
  overallAssessment: string;
  topicPerformances: TopicPerformance[];
  topicDiagnoses?: TopicDiagnosis[];
  weakTopics: WeakTopicAnalysis[];
  studyRoadmap: string[];
  prioritizedActionPlan?: PrioritizedActionItem[];
  recommendedMasteryUpdates: Array<{
    topicId: string;
    newStatus: TopicMasteryStatus;
  }>;
  diagnosisReport?: StudyDiagnosisReport;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  studentId?: string;
  department: Department;
  series: string;
  currentSemester?: string;
  createdAt: string;
  avatarUrl?: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: number;
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
  status: TopicMasteryStatus;
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
  strongTopics: string[];
  weakTopics: string[];
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

export interface UserCourseProgress {
  userId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  uploadedCourseInfo: UploadedCourseInfo;
  identifiedTopics: KnowledgeNode[];
  identifiedEdges: KnowledgeEdge[];
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



