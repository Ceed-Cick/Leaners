import React, { useState } from 'react';
import { 
  BrainCircuit, 
  Sparkles, 
  AlertOctagon, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  ArrowRight, 
  Target, 
  RefreshCw, 
  FileText, 
  Layers, 
  Search, 
  ChevronRight, 
  HelpCircle,
  TrendingDown,
  TrendingUp,
  BookmarkCheck,
  GraduationCap,
  ExternalLink,
  ChevronDown,
  Info
} from 'lucide-react';
import { 
  Course, 
  StudyDiagnosisReport, 
  TopicDiagnosis, 
  TopicClassification 
} from '../../types';
import { aiService } from '../../services/aiService';

interface StudyDiagnosisViewProps {
  currentCourse: Course;
  onOpenDiagnosticModal: () => void;
  onNavigateToKnowledgeMap?: () => void;
  onSaveDiagnosisReport?: (courseId: string, report: StudyDiagnosisReport) => void;
}

export const StudyDiagnosisView: React.FC<StudyDiagnosisViewProps> = ({
  currentCourse,
  onOpenDiagnosticModal,
  onNavigateToKnowledgeMap,
  onSaveDiagnosisReport,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'Critical' | 'Needs Practice' | 'Strong'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

  const diagnosis = currentCourse.latestDiagnosis;
  const nodes = currentCourse.knowledgeNodes || [];
  const materialsCount = currentCourse.materials.length;

  // Handler to generate or refresh diagnosis using Gemini API
  const handleGenerateDiagnosis = async () => {
    try {
      setIsGenerating(true);
      setErrorMessage(null);

      const res = await aiService.generateStudyDiagnosis({
        courseId: currentCourse.id,
        courseCode: currentCourse.code,
        courseTitle: currentCourse.title,
        knowledgeNodes: currentCourse.knowledgeNodes,
      });

      if (res.success && res.diagnosisReport) {
        if (onSaveDiagnosisReport) {
          onSaveDiagnosisReport(currentCourse.id, res.diagnosisReport);
        }
      }
    } catch (err: any) {
      console.error('Diagnosis generation failed:', err);
      setErrorMessage(err.message || 'Failed to generate AI Study Diagnosis. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Filter topics
  const topics = diagnosis?.topicDiagnoses || [];
  const filteredTopics = topics.filter((t) => {
    const matchesFilter = selectedFilter === 'ALL' || t.classification === selectedFilter;
    const matchesSearch = 
      t.topicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.chapter && t.chapter.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.whyNeedsAttention.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getClassificationBadge = (classification: TopicClassification) => {
    switch (classification) {
      case 'Critical':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          badgeBg: 'bg-rose-600 text-white',
          dot: 'bg-rose-500',
          icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />,
          label: 'Critical Gaps',
          borderAccent: 'border-l-rose-500',
        };
      case 'Needs Practice':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          badgeBg: 'bg-amber-500 text-white',
          dot: 'bg-amber-500',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
          label: 'Needs Practice',
          borderAccent: 'border-l-amber-500',
        };
      case 'Strong':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          badgeBg: 'bg-emerald-600 text-white',
          dot: 'bg-emerald-500',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
          label: 'Strong Mastery',
          borderAccent: 'border-l-emerald-500',
        };
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-lg">
              {currentCourse.code}
            </span>
            <span className="text-xs text-slate-500 font-medium">Topic-by-Topic AI Analysis</span>
            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200/80 px-2 py-0.5 rounded uppercase">
              Gemini 3.7 Flash
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            AI Study Diagnosis & Topic Classification
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Granular evaluation of topic mastery (Strong, Needs Practice, Critical) grounded strictly in course materials.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          <button
            onClick={onOpenDiagnosticModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs shadow-emerald-600/20 flex items-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Take Diagnostic Quiz</span>
          </button>

          <button
            onClick={handleGenerateDiagnosis}
            disabled={isGenerating || materialsCount === 0}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            title="Re-analyze all curriculum topics with Gemini AI"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isGenerating ? 'Analyzing...' : 'Refresh AI Diagnosis'}</span>
          </button>
        </div>
      </div>

      {/* Error Alert if any */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
          <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Diagnosis Generation Warning</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Executive Overview Banner */}
      {diagnosis ? (
        <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl border border-slate-800 shadow-md space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 font-mono">
                  Academic Performance Diagnosis
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Evaluated {new Date(diagnosis.timestamp).toLocaleDateString()}
                </span>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mt-1">
                {diagnosis.academicStanding}
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {diagnosis.executiveDiagnosis}
              </p>
            </div>

            {diagnosis.totalQuestions > 0 && (
              <div className="bg-slate-800/90 border border-slate-700/80 p-4 rounded-xl text-center min-w-[130px] shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400">Diagnostic Score</span>
                <div className="text-2xl font-black text-emerald-400 mt-0.5">
                  {diagnosis.overallScore} <span className="text-xs text-slate-400 font-normal">/ {diagnosis.totalQuestions}</span>
                </div>
                <span className="text-xs font-bold text-slate-300 block mt-0.5">
                  {diagnosis.overallPercentage}% Accuracy
                </span>
              </div>
            )}
          </div>

          {/* Metric Pill Grid */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800/80">
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-rose-300">Critical Topics</span>
                <p className="text-lg font-black text-rose-400">{diagnosis.criticalCount || 0}</p>
              </div>
              <AlertOctagon className="w-5 h-5 text-rose-400" />
            </div>

            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-amber-300">Needs Practice</span>
                <p className="text-lg font-black text-amber-400">{diagnosis.needsPracticeCount || 0}</p>
              </div>
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-300">Strong Mastery</span>
                <p className="text-lg font-black text-emerald-400">{diagnosis.strongCount || 0}</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </div>
      ) : (
        /* Empty State Prompting Quiz or Diagnosis */
        <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900">
              No AI Study Diagnosis Available Yet
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Take the 10-Question Diagnostic Quiz or click "Run AI Diagnosis" to analyze your topic-by-topic mastery and receive concrete next action recommendations based on course slides.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenDiagnosticModal}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch Diagnostic Quiz</span>
            </button>
            <button
              onClick={handleGenerateDiagnosis}
              disabled={isGenerating}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>Run On-Demand Diagnosis</span>
            </button>
          </div>
        </div>
      )}

      {/* Prioritized 4-Step Action Plan */}
      {diagnosis && diagnosis.prioritizedActionPlan && diagnosis.prioritizedActionPlan.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Prioritized Action Plan for {currentCourse.code}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Concrete, high-impact tasks based strictly on uploaded slides, formulas, and quiz gaps.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
              RUET CT & Term Final Preparation
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {diagnosis.prioritizedActionPlan.map((action, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0">
                      {action.stepNumber || idx + 1}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 leading-snug">
                      {action.actionTitle}
                    </h4>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border shrink-0 ${
                    action.priority === 'high'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {action.priority} priority
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed pl-8">
                  {action.actionDetail}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 pl-8 text-[11px]">
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span>{action.materialReference || 'Course Materials'}</span>
                  </span>
                  <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Est. {action.estimatedMinutes} mins</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TOPIC-BY-TOPIC DIAGNOSIS BREAKDOWN */}
      <div className="space-y-4">
        {/* Controls: Search & Category Filter Pills */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Classification Filter Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['ALL', 'Critical', 'Needs Practice', 'Strong'] as const).map((filter) => {
              const isSelected = selectedFilter === filter;
              let count = 0;
              if (filter === 'ALL') count = topics.length;
              else if (filter === 'Critical') count = topics.filter((t) => t.classification === 'Critical').length;
              else if (filter === 'Needs Practice') count = topics.filter((t) => t.classification === 'Needs Practice').length;
              else if (filter === 'Strong') count = topics.filter((t) => t.classification === 'Strong').length;

              return (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{filter === 'ALL' ? 'All Topics' : filter}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search topics, concepts, reasons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        {/* Topic Diagnosis Cards Grid */}
        <div className="space-y-4">
          {filteredTopics.length > 0 ? (
            filteredTopics.map((topic) => {
              const badge = getClassificationBadge(topic.classification);
              const isExpanded = expandedTopicId === topic.topicId;

              return (
                <div
                  key={topic.topicId}
                  className={`bg-white rounded-2xl border border-slate-200 border-l-4 ${badge.borderAccent} shadow-xs transition-all overflow-hidden`}
                >
                  {/* Topic Header Block */}
                  <div className="p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border flex items-center gap-1.5 ${badge.bg}`}>
                            {badge.icon}
                            <span>{topic.classification.toUpperCase()}</span>
                          </span>

                          {topic.chapter && (
                            <span className="text-[11px] font-medium text-slate-500">
                              {topic.chapter}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900 mt-1.5">
                          {topic.topicName}
                        </h3>
                      </div>

                      {/* Performance Calculation Pill */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Quiz Performance
                          </span>
                          <span className="text-base font-extrabold text-slate-900">
                            {topic.performancePercentage}%
                          </span>
                          {topic.totalQuestions > 0 && (
                            <span className="text-[10px] text-slate-500 block">
                              ({topic.correctAnswers}/{topic.totalQuestions} correct)
                            </span>
                          )}
                        </div>

                        <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden shrink-0">
                          <div
                            className={`h-full rounded-full ${
                              topic.classification === 'Strong'
                                ? 'bg-emerald-500'
                                : topic.classification === 'Needs Practice'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.max(5, topic.performancePercentage)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* WHY THIS TOPIC NEEDS ATTENTION (Concrete Explanation) */}
                    <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                      topic.classification === 'Critical'
                        ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                        : topic.classification === 'Needs Practice'
                        ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                        : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <Info className="w-3.5 h-3.5" />
                        <span>Why This Topic Needs Attention:</span>
                      </div>
                      <p>{topic.whyNeedsAttention}</p>
                    </div>

                    {/* RECOMMENDED NEXT ACTIONS (Concrete, Course-Grounded Directives) */}
                    <div className="space-y-2 pt-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <BookmarkCheck className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Recommended Next Academic Actions:</span>
                      </h4>

                      <div className="grid grid-cols-1 gap-2">
                        {topic.recommendedNextActions && topic.recommendedNextActions.map((action, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 flex items-start gap-2.5"
                          >
                            <span className="w-5 h-5 rounded-md bg-white border border-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="leading-relaxed flex-1 font-medium">{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Expand/Collapse Toggle for Formulas & Prerequisites */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>{topic.sourceMaterialReference || 'Uploaded Lecture Material'}</span>
                      </div>

                      <button
                        onClick={() => setExpandedTopicId(isExpanded ? null : topic.topicId)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                      >
                        <span>{isExpanded ? 'Hide Technical Details' : 'View Formulas & Prerequisites'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {/* Expandable Technical Details */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-200 space-y-3">
                        {topic.keyFormulasOrConcepts && topic.keyFormulasOrConcepts.length > 0 && (
                          <div>
                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                              Key Formulas & Theorems to Verify:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {topic.keyFormulasOrConcepts.map((item, i) => (
                                <span
                                  key={i}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs font-mono"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {topic.recommendedPrerequisites && topic.recommendedPrerequisites.length > 0 && (
                          <div>
                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                              Prerequisite Concepts to Review First:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {topic.recommendedPrerequisites.map((prereq, i) => (
                                <span
                                  key={i}
                                  className="px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-medium"
                                >
                                  {prereq}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
              No topics matching filter "{selectedFilter}" or query "{searchQuery}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
