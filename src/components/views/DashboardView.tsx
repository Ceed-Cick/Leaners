import React, { useState } from 'react';
import { 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  BookOpen, 
  FileText, 
  Layers, 
  AlertTriangle, 
  ArrowUpRight, 
  Calendar, 
  GraduationCap,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Clock,
  BarChart2,
  Plus,
  Award,
  TrendingUp,
  TrendingDown,
  BrainCircuit,
  Eye,
  Check,
  X,
  RefreshCw,
  Database
} from 'lucide-react';
import { 
  Course, 
  CourseMaterial, 
  StudentProfile, 
  OverallUserProgressReport, 
  UserQuizAttemptRecord 
} from '../../types';
import { KnowledgeMapCanvas } from '../KnowledgeMapCanvas';

interface DashboardViewProps {
  student: StudentProfile;
  currentCourse: Course;
  courses: Course[];
  userProgress: OverallUserProgressReport | null;
  onSelectCourse: (courseId: string) => void;
  onOpenUploadModal: () => void;
  onOpenAnalyzeModal: () => void;
  onOpenDiagnosticModal: () => void;
  onOpenAddCourseModal?: () => void;
  onNavigateTab: (tab: any) => void;
  onRefreshProgress?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  student,
  currentCourse,
  courses,
  userProgress,
  onSelectCourse,
  onOpenUploadModal,
  onOpenAnalyzeModal,
  onOpenDiagnosticModal,
  onOpenAddCourseModal,
  onNavigateTab,
  onRefreshProgress,
}) => {
  const [selectedAttemptForReview, setSelectedAttemptForReview] = useState<UserQuizAttemptRecord | null>(null);
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);

  const materialsCount = currentCourse.materials.length;
  const nodes = currentCourse.knowledgeNodes || [];
  const nodesCount = nodes.length;

  const currentCourseProgress = userProgress?.coursesProgress?.[currentCourse.id];
  const courseAttempts = currentCourseProgress?.quizAttempts || [];
  const allRecentAttempts = userProgress?.recentQuizAttempts || [];

  const masteredCount = nodes.filter((n) => n.status === 'mastered').length;
  const weakCount = nodes.filter((n) => n.status === 'weak' || n.status === 'needs_revision').length;

  const latestCourseAttempt = courseAttempts[0] || (allRecentAttempts.find(a => a.courseId === currentCourse.id));
  const latestAiRecs = latestCourseAttempt?.aiGeneratedStudyRecommendations || currentCourseProgress?.latestAiRecommendations;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Welcome & Academic Context Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 text-white p-6 sm:p-7 shadow-lg">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-emerald-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-xs font-semibold">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Rajshahi University of Engineering & Technology</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Welcome back, {student.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              RUET MindMap AI persists your curriculum blueprint, quiz attempts, and AI-generated study recommendations in your secure student database.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400 font-medium">
              <span>User ID: <strong className="text-slate-300 font-mono text-[11px]">{student.id}</strong></span>
              <span>•</span>
              <span>Roll: <strong className="text-slate-200 font-mono">{student.rollNumber}</strong></span>
              <span>•</span>
              <span>Dept: <strong className="text-slate-200">{student.department}</strong></span>
              <span>•</span>
              <span>Series: <strong className="text-emerald-400">{student.series}</strong></span>
              <span>•</span>
              <span>Term: <strong className="text-slate-200">{student.semester}</strong></span>
            </div>
          </div>

          {/* Quick Metrics Capsule */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700/60 text-center min-w-20">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Courses</span>
              <p className="text-lg font-bold text-white mt-0.5">{courses.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700/60 text-center min-w-20">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Quizzes</span>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">{userProgress?.totalQuizAttempts ?? 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700/60 text-center min-w-20">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Avg Score</span>
              <p className="text-lg font-bold text-amber-300 mt-0.5">
                {userProgress?.overallAverageScore ? `${userProgress.overallAverageScore}%` : '—'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700/60 text-center min-w-20">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Weak Areas</span>
              <p className="text-lg font-bold text-rose-400 mt-0.5">{userProgress?.totalWeakTopics ?? weakCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Active Course Header & Primary Action Buttons */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Course Details Info */}
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200/80">
                {currentCourse.code}
              </span>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                {currentCourse.credit.toFixed(1)} Credits
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Dept of {currentCourse.department}
              </span>
              {currentCourse.isAnalyzed && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Blueprint Extracted
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              {currentCourse.title}
            </h2>
            <p className="text-xs text-slate-500 line-clamp-1 leading-relaxed">
              Teacher: <span className="text-slate-800 font-semibold">{currentCourse.instructor}</span> • {currentCourse.description}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="upload-course-materials-main-btn"
              onClick={onOpenUploadModal}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold border border-slate-200/90 transition-all shadow-2xs"
            >
              <Upload className="w-4 h-4 text-slate-600" />
              <span>Upload Materials</span>
              {materialsCount > 0 && (
                <span className="bg-slate-300 text-slate-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {materialsCount}
                </span>
              )}
            </button>

            <button
              id="analyze-course-main-btn"
              onClick={onOpenAnalyzeModal}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs shadow-emerald-600/20 transition-all"
            >
              <Sparkles className="w-4 h-4 text-emerald-100" />
              <span>Analyze Course</span>
            </button>

            <button
              id="start-diagnostic-test-main-btn"
              onClick={onOpenDiagnosticModal}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Start Diagnostic Test</span>
            </button>
          </div>
        </div>

        {/* Quick course switcher pills & Add Course action */}
        <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2 overflow-x-auto pb-1">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Switch Course:</span>
            {courses.map((course) => (
              <button
                key={course.id}
                onClick={() => onSelectCourse(course.id)}
                className={`text-xs px-3 py-1.5 rounded-xl shrink-0 font-bold transition-all ${
                  course.id === currentCourse.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                {course.code}
              </button>
            ))}
          </div>

          {onOpenAddCourseModal && (
            <button
              onClick={onOpenAddCourseModal}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shrink-0 ml-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Course</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Knowledge Map Canvas Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Course Knowledge MindMap
            </h3>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {nodesCount} Topics Identified
            </span>
          </div>

          <button
            onClick={() => onNavigateTab('knowledge-map')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
          >
            <span>Full Map Explorer</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <KnowledgeMapCanvas
          course={currentCourse}
          onOpenAnalysisModal={onOpenAnalyzeModal}
          onOpenDiagnosticModal={onOpenDiagnosticModal}
        />
      </div>

      {/* 4. PERSISTENT QUIZ ATTEMPTS & DIAGNOSTIC PROGRESS FROM DATABASE */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Persistent Quiz Progress & Attempts History
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Retrieved securely from database for user <span className="font-mono text-slate-600">{student.id}</span>
              </p>
            </div>
          </div>

          {onRefreshProgress && (
            <button
              onClick={onRefreshProgress}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
              title="Refresh database progress"
            >
              <RefreshCw className="w-3 h-3 text-slate-500" />
              <span>Sync DB</span>
            </button>
          )}
        </div>

        {allRecentAttempts.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
            <HelpCircle className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="text-xs text-slate-600 font-medium">
              No quiz attempts recorded in database yet for your account.
            </p>
            <p className="text-[11px] text-slate-400">
              Launch the 10-question diagnostic quiz above. Your scores, answers, and topic recommendations will be saved permanently.
            </p>
            <button
              onClick={onOpenDiagnosticModal}
              className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              Launch First Diagnostic Quiz
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {allRecentAttempts.map((attempt, index) => {
              const isExpanded = expandedAttemptId === attempt.id;
              const formattedDate = new Date(attempt.timestamp).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={attempt.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50/80 transition-all overflow-hidden"
                >
                  {/* Attempt Summary Header Row */}
                  <div
                    onClick={() => setExpandedAttemptId(isExpanded ? null : attempt.id)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                        attempt.quizScores.percentage >= 80
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : attempt.quizScores.percentage >= 60
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {attempt.quizScores.percentage}%
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-900 font-mono">
                            {attempt.courseCode}
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            {attempt.courseName}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                            {attempt.quizScores.gradeDescriptor}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5 flex items-center gap-2">
                          <span>{formattedDate}</span>
                          <span>•</span>
                          <span>Score: <strong>{attempt.quizScores.score}/{attempt.quizScores.totalQuestions}</strong> correct</span>
                          <span>•</span>
                          <span>{attempt.individualAnswers?.length || 0} questions evaluated</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        {attempt.weakTopics?.length > 0 && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                            {attempt.weakTopics.length} Weak Area(s)
                          </span>
                        )}
                        {attempt.strongTopics?.length > 0 && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            {attempt.strongTopics.length} Strong
                          </span>
                        )}
                      </div>
                      <button
                        className="p-1 rounded-lg hover:bg-slate-200 text-slate-500"
                        title={isExpanded ? 'Collapse' : 'Expand Details'}
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Attempt Details (Answers & AI Recommendations) */}
                  {isExpanded && (
                    <div className="p-4 pt-0 border-t border-slate-200/80 space-y-4 mt-2 bg-white">
                      {/* Executive AI Diagnosis */}
                      {attempt.aiGeneratedStudyRecommendations?.executiveDiagnosis && (
                        <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70 space-y-1.5">
                          <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            <span>AI Diagnostic Executive Summary</span>
                            <span className="text-[10px] font-mono text-emerald-700 bg-white px-1.5 py-0.2 rounded border border-emerald-200">
                              {attempt.aiGeneratedStudyRecommendations.academicStanding}
                            </span>
                          </div>
                          <p className="text-xs text-emerald-950 leading-relaxed font-medium">
                            {attempt.aiGeneratedStudyRecommendations.executiveDiagnosis}
                          </p>
                        </div>
                      )}

                      {/* Topic Level Breakdown */}
                      {attempt.topicLevelScores && attempt.topicLevelScores.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-800">Topic-Level Diagnostic Scores:</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {attempt.topicLevelScores.map((tls) => (
                              <div
                                key={tls.topicId}
                                className={`p-2.5 rounded-xl border text-xs ${
                                  tls.percentage >= 80
                                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                                    : tls.percentage >= 60
                                    ? 'bg-amber-50/50 border-amber-200 text-amber-950'
                                    : 'bg-rose-50/50 border-rose-200 text-rose-950'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold truncate">{tls.topicName}</span>
                                  <span className="font-mono font-bold text-[11px]">{tls.score}/{tls.total} ({tls.percentage}%)</span>
                                </div>
                                <span className={`text-[9px] font-bold uppercase mt-1 inline-block px-1.5 py-0.2 rounded ${
                                  tls.classification === 'Strong'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : tls.classification === 'Critical'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {tls.classification}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Individual Answers Breakdown */}
                      {attempt.individualAnswers && attempt.individualAnswers.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-800">Individual Answers Breakdown ({attempt.individualAnswers.length}):</h4>
                          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {attempt.individualAnswers.map((ans, aIdx) => (
                              <div
                                key={ans.questionId || aIdx}
                                className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                                  ans.isCorrect
                                    ? 'bg-emerald-50/30 border-emerald-200/80'
                                    : 'bg-rose-50/30 border-rose-200/80'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-semibold text-slate-900">
                                    Q{aIdx + 1}. {ans.questionText}
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 flex items-center gap-1 ${
                                    ans.isCorrect
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {ans.isCorrect ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                    {ans.isCorrect ? 'Correct' : 'Incorrect'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-600 space-y-0.5">
                                  <div>
                                    <span className="font-semibold">Selected:</span>{' '}
                                    <span className={ans.isCorrect ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                                      {ans.selectedOptionText || (ans.selectedOptionIndex !== null ? `Option ${ans.selectedOptionIndex + 1}` : 'None')}
                                    </span>
                                  </div>
                                  {!ans.isCorrect && ans.correctOptionText && (
                                    <div>
                                      <span className="font-semibold">Correct:</span>{' '}
                                      <span className="text-emerald-800 font-bold">{ans.correctOptionText}</span>
                                    </div>
                                  )}
                                  {ans.explanation && (
                                    <p className="text-[10px] text-slate-500 bg-white/70 p-2 rounded-lg border border-slate-200/60 mt-1">
                                      {ans.explanation}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI-Generated Prioritized Action Items */}
                      {attempt.aiGeneratedStudyRecommendations?.prioritizedActionPlan &&
                        attempt.aiGeneratedStudyRecommendations.prioritizedActionPlan.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <BrainCircuit className="w-3.5 h-3.5 text-emerald-600" />
                              <span>AI-Generated Study Recommendations & Action Steps:</span>
                            </h4>
                            <div className="space-y-2">
                              {attempt.aiGeneratedStudyRecommendations.prioritizedActionPlan.map((action, actIdx) => (
                                <div
                                  key={actIdx}
                                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                                        {action.stepNumber || actIdx + 1}
                                      </span>
                                      <span className="font-bold text-slate-900">{action.actionTitle}</span>
                                      <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                                        {action.topicName}
                                      </span>
                                    </div>
                                    <p className="text-slate-500 text-[11px] mt-1 pl-7">{action.actionDetail}</p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto text-[10px] text-slate-500 font-semibold">
                                    <span>~{action.estimatedMinutes} mins</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Two Column Insights: Uploaded Materials & Weak Topic Diagnostic Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Uploaded Course Materials */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Uploaded Materials ({materialsCount})
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">{currentCourse.code} lecture files</p>
              </div>
            </div>
            <button
              onClick={onOpenUploadModal}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>+ Add File</span>
            </button>
          </div>

          {materialsCount === 0 ? (
            <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <p className="text-xs text-slate-500 font-medium">No materials uploaded for {currentCourse.code} yet.</p>
              <button
                onClick={onOpenUploadModal}
                className="mt-2 text-xs font-bold text-emerald-600 hover:underline"
              >
                Upload syllabus or slides now
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto">
              {currentCourse.materials.map((mat) => (
                <div
                  key={mat.id}
                  id={`dashboard-material-item-${mat.id}`}
                  className="p-3 rounded-xl border border-slate-150 bg-slate-50/60 flex items-center justify-between gap-3 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">
                      PDF
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 truncate font-mono" title={mat.fileName}>
                        {mat.fileName}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5 font-sans">
                        {mat.title && mat.title !== mat.fileName ? `${mat.title} • ` : ''}{mat.fileSize} • {mat.uploadDate}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded shrink-0">
                    Persisted in DB
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Weak Academic Topic Identification Diagnostic */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Academic Weakness Diagnostic
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">RUET syllabus evaluation</p>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
              RUET Engine
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <h4 className="font-bold text-slate-800">Weakness Detection Algorithm</h4>
                <p className="text-slate-500 mt-1 leading-relaxed">
                  Evaluates student understanding against past RUET Class Tests and Term Finals to identify prerequisite gaps before semester exams.
                </p>
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
              <div className="text-[11px] text-slate-600">
                <span>Identified Weak Areas: </span>
                <strong className="text-rose-600 font-bold">{weakCount} Topics</strong>
              </div>
              <button
                id="diagnostic-box-start-btn"
                onClick={onOpenDiagnosticModal}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs transition-colors"
              >
                Run Diagnostic
              </button>
            </div>
          </div>

          {/* Quick Curriculum Facts */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl border border-slate-150 bg-slate-50/50">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Concept Nodes</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{nodesCount} Topics</p>
            </div>
            <div className="p-3 rounded-xl border border-slate-150 bg-slate-50/50">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Mastered Topics</span>
              <p className="text-sm font-bold text-emerald-600 mt-0.5">{masteredCount} Topics</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
