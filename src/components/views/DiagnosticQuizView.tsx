import React from 'react';
import { 
  CheckCircle2, 
  Sparkles, 
  Award, 
  Clock, 
  AlertTriangle, 
  Layers, 
  ArrowRight,
  BookOpen,
  BarChart,
  BrainCircuit,
  AlertCircle,
  HelpCircle,
  TrendingDown,
  FileText
} from 'lucide-react';
import { Course, TopicMasteryStatus } from '../../types';

interface DiagnosticQuizViewProps {
  currentCourse: Course;
  onOpenDiagnosticModal: () => void;
  onOpenAnalyzeModal?: () => void;
}

export const DiagnosticQuizView: React.FC<DiagnosticQuizViewProps> = ({
  currentCourse,
  onOpenDiagnosticModal,
  onOpenAnalyzeModal,
}) => {
  const nodes = currentCourse.knowledgeNodes || [];
  const materialsCount = currentCourse.materials.length;
  const isAnalyzed = currentCourse.isAnalyzed && nodes.length > 0;

  const weakCount = nodes.filter((n) => n.status === 'weak' || n.status === 'needs_revision').length;
  const masteredCount = nodes.filter((n) => n.status === 'mastered').length;
  const pendingCount = nodes.filter((n) => n.status === 'untested' || !n.status).length;

  const getStatusBadge = (status?: TopicMasteryStatus) => {
    switch (status) {
      case 'weak':
      case 'needs_revision':
        return {
          label: 'Weak Topic',
          classes: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600" />,
        };
      case 'moderate':
        return {
          label: 'Moderate',
          classes: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold',
          icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
        };
      case 'mastered':
        return {
          label: 'Mastered',
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
        };
      default:
        return {
          label: 'Untested',
          classes: 'bg-slate-100 text-slate-600 border-slate-200 font-medium',
          icon: <HelpCircle className="w-3.5 h-3.5 text-slate-400" />,
        };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-lg">
              {currentCourse.code}
            </span>
            <span className="text-xs text-slate-500 font-medium">RUET Diagnostic Engine</span>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase">
              Gemini 3.7 Flash
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Diagnostic Knowledge Assessment
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            10-question assessment grounded strictly in {currentCourse.code} lecture slides and syllabus.
          </p>
        </div>

        <button
          id="diagnostic-view-start-btn"
          onClick={onOpenDiagnosticModal}
          disabled={materialsCount === 0}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all self-start md:self-auto ${
            materialsCount === 0
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Launch 10-Question Diagnostic Quiz</span>
        </button>
      </div>

      {/* Course Readiness Notice if not analyzed */}
      {!isAnalyzed && materialsCount > 0 && onOpenAnalyzeModal && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <BrainCircuit className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <h4 className="font-bold text-indigo-950">Curriculum Not Yet Analyzed</h4>
              <p className="text-indigo-800 mt-0.5">
                Analyze course materials with Gemini first to extract concept nodes, or launch the quiz directly.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenAnalyzeModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shrink-0 transition-colors"
          >
            Analyze Course Materials
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Course Topics</span>
            <BookOpen className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{nodes.length}</p>
          <span className="text-[11px] text-slate-500 block">Identified in syllabus</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">Identified Weak Areas</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-600">{weakCount}</p>
          <span className="text-[11px] text-slate-500 block">Require focused revision</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">Mastered Topics</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">{masteredCount}</p>
          <span className="text-[11px] text-slate-500 block">Assessed with high accuracy</span>
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
            1
          </div>
          <h3 className="text-sm font-bold text-slate-900">1. Gemini Generates 10 Questions</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Constructs 10 multiple-choice questions grounded solely in {currentCourse.code} lecture slides and CT questions across basic, intermediate, and advanced levels.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs">
            2
          </div>
          <h3 className="text-sm font-bold text-slate-900">2. Complete Assessment</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Answer questions with zero revealed solutions during the test. Jump between questions freely before final submission.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
            3
          </div>
          <h3 className="text-sm font-bold text-slate-900">3. AI Performance Diagnostics</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Calculates score, links each question to a topic, highlights weak areas, and prompts Gemini for deep conceptual diagnosis and study planning.
          </p>
        </div>
      </div>

      {/* Available Topics & Diagnostic Status */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {currentCourse.code} Curriculum Topics & Mastery Status ({nodes.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live status reflected across your Knowledge Blueprint graph.
            </p>
          </div>
          <button
            onClick={onOpenDiagnosticModal}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Start Quiz
          </button>
        </div>

        <div className="space-y-2.5">
          {nodes.map((node) => {
            const badge = getStatusBadge(node.status);
            return (
              <div
                key={node.id}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-300 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{node.label}</span>
                    <span className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      {node.chapter}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 ${badge.classes}`}>
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {node.subtopics && node.subtopics.length > 0
                      ? `Subtopics: ${node.subtopics.join(', ')}`
                      : node.description}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] font-semibold text-slate-500">
                    ~{node.estimatedHours}h study
                  </span>
                  <button
                    onClick={onOpenDiagnosticModal}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-semibold rounded-lg transition-colors shadow-2xs"
                  >
                    Test Topic
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
