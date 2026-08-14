import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  FileSearch, 
  Network, 
  GitMerge, 
  BrainCircuit, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Info,
  Clock,
  Layers,
  FileText,
  ShieldCheck,
  Cpu,
  Loader2,
  RefreshCw,
  BookOpen,
  Check
} from 'lucide-react';
import { Course, KnowledgeNode, KnowledgeEdge } from '../types';
import { aiService, ServerAnalysisResponse, ServerAIStatus } from '../services/aiService';

interface AnalyzeCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  onAnalysisSuccess?: (courseId: string, nodes: KnowledgeNode[], edges: KnowledgeEdge[], summary: string) => void;
  onNavigateToKnowledgeMap?: () => void;
}

export const AnalyzeCourseModal: React.FC<AnalyzeCourseModalProps> = ({
  isOpen,
  onClose,
  course,
  onAnalysisSuccess,
  onNavigateToKnowledgeMap,
}) => {
  const [pipelineState, setPipelineState] = useState<'overview' | 'analyzing' | 'completed'>('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgressStep, setAnalysisProgressStep] = useState<string>('Initializing...');
  const [serverAnalysisData, setServerAnalysisData] = useState<ServerAnalysisResponse | null>(null);
  const [serverAIStatus, setServerAIStatus] = useState<ServerAIStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      aiService.checkServerAIStatus().then((status) => {
        setServerAIStatus(status);
      });
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const materialsCount = course.materials.length;
  const hasMaterials = materialsCount > 0;

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setPipelineState('analyzing');
    setErrorMessage(null);
    setAnalysisProgressStep('Extracting relevant text & staging documents...');

    try {
      // Step 1: Stage materials on server
      await aiService.stageMaterialsOnServer(course.id, course.materials);

      setAnalysisProgressStep('Prompting Gemini 3.7 Flash with curriculum directives...');

      // Step 2: Send materials to Gemini and receive structured JSON
      const result = await aiService.analyzeCourseMaterials({
        courseId: course.id,
        courseCode: course.code,
        courseTitle: course.title,
        materials: course.materials,
      });

      setServerAnalysisData(result);
      setPipelineState('completed');

      // Update parent course state if callback exists
      if (onAnalysisSuccess && result.nodes && result.nodes.length > 0) {
        onAnalysisSuccess(course.id, result.nodes, result.edges || [], result.summary || '');
      }
    } catch (err: any) {
      console.error('Course analysis error:', err);
      setErrorMessage(err.message || 'Failed to analyze course materials with Gemini API.');
      setPipelineState('overview');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGoToKnowledgeMap = () => {
    onClose();
    if (onNavigateToKnowledgeMap) {
      onNavigateToKnowledgeMap();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="analyze-course-modal-card"
        className="bg-white w-full max-w-3xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-8"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Analyze Course with Gemini AI</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                  {course.code}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Grounds topics, subtopics, prerequisites & difficulty strictly in uploaded material.
              </p>
            </div>
          </div>
          <button
            id="close-analyze-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Error Message Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start justify-between gap-3 text-rose-900 text-xs">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Gemini Analysis Error</h4>
                  <p className="text-rose-700 mt-0.5">{errorMessage}</p>
                </div>
              </div>
              <button
                id="retry-analysis-btn"
                onClick={handleRunAnalysis}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          )}

          {/* Analyzing In-Progress Indicator */}
          {isAnalyzing && (
            <div className="p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center space-y-3">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-100 text-emerald-700 animate-pulse">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Processing Course Materials with Gemini API
                </h3>
                <p className="text-xs text-emerald-800 font-medium mt-1">
                  {analysisProgressStep}
                </p>
              </div>
              <div className="max-w-md mx-auto bg-white/80 p-3 rounded-xl border border-emerald-200 text-[11px] text-slate-600">
                Extracting major topics, subtopics, important formulas, and prerequisite linkages with strict factual grounding.
              </div>
            </div>
          )}

          {/* Staged Materials Banner */}
          {!isAnalyzing && pipelineState !== 'completed' && (
            <>
              {!hasMaterials ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">No PDF Course Materials Staged</h4>
                    <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                      Please upload at least one syllabus PDF, lecture slide deck, or class test archive before triggering course analysis.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold text-emerald-950">
                        {materialsCount} Uploaded PDF {materialsCount === 1 ? 'Document' : 'Documents'} Ready for Analysis
                      </span>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase">
                      Grounding Source
                    </span>
                  </div>

                  {/* Uploaded Filenames List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {course.materials.map((mat) => (
                      <div
                        key={mat.id}
                        className="p-2 bg-white border border-emerald-200/80 rounded-lg flex items-center gap-2 text-xs text-slate-800 font-mono truncate shadow-2xs"
                        title={mat.fileName}
                      >
                        <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="truncate block font-semibold">{mat.fileName}</span>
                          <span className="text-[10px] text-slate-400 font-sans block">{mat.fileSize}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analysis Pipeline Info */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Gemini API Knowledge Extraction Workflow
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <div className="flex items-center gap-2 text-slate-900 font-bold mb-1">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      <span>1. Topic & Subtopic Mining</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Extracts chapters, major topics, and specific subtopics directly documented in your slides and syllabus.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <div className="flex items-center gap-2 text-slate-900 font-bold mb-1">
                      <GitMerge className="w-4 h-4 text-indigo-600" />
                      <span>2. Prerequisite Relationship Mapping</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Determines foundational knowledge pathways linking prerequisites to core engineering concepts.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <div className="flex items-center gap-2 text-slate-900 font-bold mb-1">
                      <BrainCircuit className="w-4 h-4 text-amber-600" />
                      <span>3. Difficulty & Hours Estimation</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Calculates cognitive difficulty (basic, intermediate, advanced) and recommended study hours.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <div className="flex items-center gap-2 text-slate-900 font-bold mb-1">
                      <ShieldCheck className="w-4 h-4 text-teal-600" />
                      <span>4. Zero-Hallucination Grounding</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Restricted strictly to provided material. No invented topics or unsupported information.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Completed Analysis Results View */}
          {pipelineState === 'completed' && serverAnalysisData && (
            <div className="space-y-4">
              {/* Success Banner */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-emerald-950">
                      Knowledge Graph Generated Successfully!
                    </h3>
                    <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-mono">
                      {serverAnalysisData.modelUsed || 'gemini-3.7-flash'}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                    {serverAnalysisData.summary}
                  </p>
                </div>
              </div>

              {/* Stats Summary Bar */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Major Topics</span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">
                    {serverAnalysisData.extractedTopicsCount}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Prerequisite Links</span>
                  <p className="text-lg font-bold text-indigo-600 mt-0.5">
                    {serverAnalysisData.relationshipsCount}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Files Analyzed</span>
                  <p className="text-lg font-bold text-emerald-600 mt-0.5">
                    {serverAnalysisData.processedFilesCount || materialsCount}
                  </p>
                </div>
              </div>

              {/* Extracted Topics Preview */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Identified Topics & Academic Hierarchy
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {serverAnalysisData.nodes.map((node, idx) => (
                    <div
                      key={node.id || idx}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-start justify-between gap-3 shadow-2xs hover:border-slate-300 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <h5 className="text-xs font-bold text-slate-900 truncate">
                            {node.label}
                          </h5>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                            node.category === 'prerequisite'
                              ? 'bg-amber-100 text-amber-800'
                              : node.category === 'advanced'
                              ? 'bg-indigo-100 text-indigo-800'
                              : node.category === 'application'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {node.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                          {node.description}
                        </p>
                        {node.subtopics && node.subtopics.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {node.subtopics.slice(0, 3).map((sub, sIdx) => (
                              <span key={sIdx} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                {sub}
                              </span>
                            ))}
                            {node.subtopics.length > 3 && (
                              <span className="text-[10px] text-slate-400">
                                +{node.subtopics.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0 text-[11px]">
                        <span className="font-bold text-slate-700 block">
                          ~{node.estimatedHours} hrs
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize block mt-0.5">
                          {node.importance} priority
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            id="cancel-analyze-modal-btn"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
          >
            {pipelineState === 'completed' ? 'Close' : 'Cancel'}
          </button>
          
          <div className="flex items-center gap-2">
            {pipelineState === 'completed' ? (
              <button
                id="view-knowledge-map-btn"
                onClick={handleGoToKnowledgeMap}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-xs transition-all"
              >
                <span>View in Knowledge Map</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                id="start-analyze-pipeline-btn"
                onClick={handleRunAnalysis}
                disabled={!hasMaterials || isAnalyzing}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all ${
                  !hasMaterials
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : isAnalyzing
                    ? 'bg-emerald-700 text-white cursor-wait'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Analyzing with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze Course</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


