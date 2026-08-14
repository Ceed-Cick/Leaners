import {
  Course,
  CourseMaterial,
  KnowledgeNode,
  KnowledgeEdge,
  OverallUserProgressReport,
  UserQuizAttemptRecord,
  StoredStudentAnswer,
  StoredTopicLevelScore,
  StoredAiRecommendations,
} from '../types';

export interface SaveQuizAttemptPayload {
  courseId: string;
  courseCode: string;
  courseName: string;
  score: number;
  totalQuestions: number;
  percentage?: number;
  gradeDescriptor?: string;
  individualAnswers: StoredStudentAnswer[];
  topicLevelScores: StoredTopicLevelScore[];
  strongTopics: string[];
  weakTopics: string[];
  aiGeneratedStudyRecommendations: StoredAiRecommendations;
  startedAt?: string;
  completedAt?: string;
}

export const progressService = {
  /**
   * Fetches the full persistent progress report for the authenticated user from the database.
   */
  async getUserProgress(token: string): Promise<OverallUserProgressReport> {
    const res = await fetch('/api/user/progress', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch user progress from database.');
    }

    const data = await res.json();
    return data.progress;
  },

  /**
   * Fetches user's saved courses and materials from persistent storage.
   */
  async getUserCourses(token: string): Promise<Course[]> {
    const res = await fetch('/api/user/courses', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch user courses.');
    }

    const data = await res.json();
    return data.courses;
  },

  /**
   * Saves or updates a course in user's persistent storage.
   */
  async saveUserCourse(token: string, course: Course): Promise<Course> {
    const res = await fetch('/api/user/courses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ course }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save user course.');
    }

    const data = await res.json();
    return data.course;
  },

  /**
   * Saves uploaded course materials for this user in persistent database.
   */
  async saveCourseMaterials(token: string, courseId: string, materials: CourseMaterial[]): Promise<CourseMaterial[]> {
    const res = await fetch('/api/user/materials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ courseId, materials }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to persist course materials.');
    }

    const data = await res.json();
    return data.materials;
  },

  /**
   * Saves extracted topic blueprint and graph edges into persistent storage.
   */
  async saveIdentifiedTopics(
    token: string,
    courseId: string,
    nodes: KnowledgeNode[],
    edges: KnowledgeEdge[],
    summary?: string
  ): Promise<{ nodesCount: number; edgesCount: number }> {
    const res = await fetch('/api/user/topics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ courseId, nodes, edges, summary }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to persist identified topics.');
    }

    return await res.json();
  },

  /**
   * Records a complete quiz attempt into the persistent database associated with the authenticated user ID.
   */
  async saveQuizAttempt(token: string, payload: SaveQuizAttemptPayload): Promise<UserQuizAttemptRecord> {
    const res = await fetch('/api/user/quiz/attempt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save quiz attempt to database.');
    }

    const data = await res.json();
    return data.attempt;
  },

  /**
   * Retrieves all quiz attempts for a course for the current user.
   */
  async getCourseQuizAttempts(token: string, courseId: string): Promise<UserQuizAttemptRecord[]> {
    const res = await fetch(`/api/user/quiz/attempts/${encodeURIComponent(courseId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch course quiz attempts.');
    }

    const data = await res.json();
    return data.attempts;
  },

  /**
   * Updates topic mastery statuses for the course in persistent storage.
   */
  async updateTopicMastery(
    token: string,
    courseId: string,
    updates: Array<{ topicId: string; newStatus: string }>
  ): Promise<void> {
    const res = await fetch('/api/user/topics/mastery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ courseId, updates }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update topic mastery statuses.');
    }
  },
};
