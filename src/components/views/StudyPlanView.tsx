import React from 'react';
import { 
  CalendarDays, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  BookOpen, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  Target,
  FileText
} from 'lucide-react';
import { Course, OverallUserProgressReport } from '../../types';

interface StudyPlanViewProps {
  currentCourse: Course;
  userProgress?: OverallUserProgressReport | null;
  onOpenDiagnosticModal: () => void;
}

export const StudyPlanView: React.FC<StudyPlanViewProps> = ({
  currentCourse,
  userProgress,
  onOpenDiagnosticModal,
}) => {
  const courseProgress = userProgress?.coursesProgress?.[currentCourse.id];
  const latestAttempt = courseProgress?.quizAttempts?.[0] || 
    (userProgress?.recentQuizAttempts?.find((a) => a.courseId === currentCourse.id));
  
  const persistentAiRecs = latestAttempt?.aiGeneratedStudyRecommendations || courseProgress?.latestAiRecommendations;
  const actionPlan = persistentAiRecs?.prioritizedActionPlan || [];
  const studyRoadmap = persistentAiRecs?.studyRoadmap || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-lg">
              {currentCourse.code}
            </span>
            <span className="text-xs text-slate-500 font-medium">RUET Semester Study Roadmap</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Personalized Academic Study Plan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Structured study roadmap balancing syllabus coverage, Class Test prep, and weak topic reinforcement.
          </p>
        </div>

        <button
          onClick={onOpenDiagnosticModal}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors self-start md:self-auto"
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Update via Diagnostic Quiz</span>
        </button>
      </div>

      {/* AI Diagnostic Summary & Action Plan from Database */}
      {persistentAiRecs?.executiveDiagnosis && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <BrainCircuit className="w-4 h-4 text-emerald-600" />
            <span>AI Executive Diagnostic & Recommendations</span>
            {persistentAiRecs.academicStanding && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                {persistentAiRecs.academicStanding}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-normal bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            {persistentAiRecs.executiveDiagnosis}
          </p>

          {actionPlan.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-600" />
                <span>Prioritized Topic Action Steps</span>
              </h4>
              <div className="space-y-2">
                {actionPlan.map((action, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {action.stepNumber || idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-slate-900">{action.actionTitle}</h5>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                            {action.topicName}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">{action.actionDetail}</p>
                        {action.materialReference && (
                          <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                            Ref: {action.materialReference}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 shrink-0 self-end sm:self-auto">
                      ~{action.estimatedMinutes} mins
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plan Summary Roadmap */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            {currentCourse.code} Curriculum Milestone Roadmap
          </h3>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
            RUET Class Test & Term Final Targets
          </span>
        </div>

        <div className="space-y-3">
          {currentCourse.knowledgeNodes.map((node, index) => {
            const isMastered = node.status === 'mastered';
            const isWeak = node.status === 'weak' || node.status === 'needs_revision';

            return (
              <div
                key={node.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  isMastered
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : isWeak
                    ? 'border-rose-200 bg-rose-50/20'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs border ${
                    isMastered
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : isWeak
                      ? 'bg-rose-500 text-white border-rose-600'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}>
                    W{index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{node.label}</h4>
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {node.importance.toUpperCase()} PRIORITY
                      </span>
                      {isMastered && (
                        <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                          MASTERED
                        </span>
                      )}
                      {isWeak && (
                        <span className="text-[9px] font-bold text-rose-800 bg-rose-100 px-1.5 py-0.2 rounded">
                          WEAK AREA
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{node.chapter}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-semibold text-slate-600">
                    Est. {node.estimatedHours} Hours
                  </span>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-200/70 px-2 py-1 rounded">
                    Scheduled
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
