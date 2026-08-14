import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  HelpCircle, 
  Clock, 
  Sparkles, 
  AlertCircle, 
  ChevronRight,
  ChevronLeft,
  BookOpen,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Send,
  AlertTriangle,
  BrainCircuit,
  Check,
  TrendingDown,
  TrendingUp,
  Target,
  FileText,
  Flame,
  Lightbulb,
  Award,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  Course, 
  DiagnosticQuestion, 
  StudentAnswer, 
  TopicPerformance, 
  QuizEvaluationReport, 
  TopicMasteryStatus,
  StudyDiagnosisReport,
  TopicClassification
} from '../types';
import { aiService } from '../services/aiService';
import { useAuth } from '../context/AuthContext';
import { progressService } from '../services/progressService';

interface DiagnosticQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  onUpdateMasteryStatuses?: (courseId: string, updates: Array<{ topicId: string; newStatus: TopicMasteryStatus }>) => void;
  onNavigateToKnowledgeMap?: () => void;
  onNavigateToStudyDiagnosis?: () => void;
  onSaveDiagnosisReport?: (courseId: string, report: StudyDiagnosisReport) => void;
  onOpenAnalyzeModal?: () => void;
  onQuizSaved?: () => void;
}

export const DiagnosticQuizModal: React.FC<DiagnosticQuizModalProps> = ({
  isOpen,
  onClose,
  course,
  onUpdateMasteryStatuses,
  onNavigateToKnowledgeMap,
  onNavigateToStudyDiagnosis,
  onSaveDiagnosisReport,
  onOpenAnalyzeModal,
  onQuizSaved,
}) => {
  const { token, user } = useAuth();
  // Modal Stages: 'init' | 'generating' | 'taking' | 'evaluating' | 'results'
  const [stage, setStage] = useState<'init' | 'generating' | 'taking' | 'evaluating' | 'results'>('init');
  const [resultsTab, setResultsTab] = useState<'diagnosis' | 'plan' | 'review'>('diagnosis');
  const [topicFilter, setTopicFilter] = useState<'ALL' | 'Critical' | 'Needs Practice' | 'Strong'>('ALL');
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [userSelections, setUserSelections] = useState<Record<number, number>>({}); // question index -> option index (0..3)
  const [evaluationReport, setEvaluationReport] = useState<QuizEvaluationReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [masteryApplied, setMasteryApplied] = useState<boolean>(false);
  const [quizStartTime, setQuizStartTime] = useState<string>('');


  useEffect(() => {
    if (isOpen) {
      // Reset state on open if starting new
      if (stage === 'init') {
        setErrorMessage(null);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const hasMaterials = course.materials.length > 0;
  const isAnalyzed = course.knowledgeNodes.length > 0;

  // 1. Generate 10 Diagnostic Questions with Gemini API
  const handleGenerateQuestions = async () => {
    setStage('generating');
    setErrorMessage(null);

    try {
      // Ensure materials are staged on server
      await aiService.stageMaterialsOnServer(course.id, course.materials);

      const response = await aiService.generateDiagnosticQuiz({
        courseId: course.id,
        courseCode: course.code,
        courseTitle: course.title,
        knowledgeNodes: course.knowledgeNodes,
        materials: course.materials,
      });

      if (!response.questions || response.questions.length === 0) {
        throw new Error('Gemini API did not return questions. Please check that course materials contain readable academic text.');
      }

      setQuestions(response.questions);
      setCurrentIdx(0);
      setUserSelections({});
      setEvaluationReport(null);
      setMasteryApplied(false);
      setQuizStartTime(new Date().toISOString());
      setStage('taking');
    } catch (err: any) {
      console.error('Quiz generation error:', err);
      setErrorMessage(err.message || 'Failed to generate diagnostic questions via Gemini API.');
      setStage('init');
    }
  };

  // 2. Handle Option Selection (Do NOT reveal answer before submission!)
  const handleSelectOption = (optionIndex: number) => {
    setUserSelections((prev) => ({
      ...prev,
      [currentIdx]: optionIndex,
    }));
  };

  // 3. Submit Quiz, Calculate Score, Associate Topics, Identify Weak Topics & Evaluate with Gemini
  const handleSubmitQuiz = async () => {
    setStage('evaluating');
    setErrorMessage(null);

    try {
      // 1. Map student answers
      let correctCount = 0;
      const topicStats: Record<string, { topicName: string; total: number; correct: number; incorrect: number }> = {};

      const studentAnswers: StudentAnswer[] = questions.map((q, idx) => {
        const selected = userSelections[idx] !== undefined ? userSelections[idx] : null;
        const isCorrect = selected === q.correctOptionIndex;

        if (isCorrect) {
          correctCount++;
        }

        // Aggregate by topic
        const tId = q.topicId || 'general';
        const tName = q.topicName || 'General Topic';
        if (!topicStats[tId]) {
          topicStats[tId] = { topicName: tName, total: 0, correct: 0, incorrect: 0 };
        }
        topicStats[tId].total += 1;
        if (isCorrect) {
          topicStats[tId].correct += 1;
        } else {
          topicStats[tId].incorrect += 1;
        }

        return {
          questionId: q.id,
          topicId: q.topicId,
          topicName: q.topicName,
          questionText: q.question,
          selectedOptionIndex: selected,
          correctOptionIndex: q.correctOptionIndex,
          isCorrect,
          difficulty: q.difficulty,
          explanation: q.explanation,
        };
      });

      // 2. Build topic performances & identify weak topics (<60% accuracy or incorrect answers)
      const topicPerformances: TopicPerformance[] = Object.entries(topicStats).map(([tId, stat]) => {
        const pct = Math.round((stat.correct / Math.max(1, stat.total)) * 100);
        let status: TopicMasteryStatus = 'moderate';
        if (pct === 100) status = 'mastered';
        else if (pct < 60) status = 'weak';
        else status = 'moderate';

        return {
          topicId: tId,
          topicName: stat.topicName,
          totalQuestions: stat.total,
          correctAnswers: stat.correct,
          incorrectAnswers: stat.incorrect,
          scorePercentage: pct,
          status,
        };
      });

      const weakTopics = topicPerformances
        .filter((tp) => tp.scorePercentage < 60 || tp.incorrectAnswers > 0)
        .map((tp) => ({
          topicId: tp.topicId,
          topicName: tp.topicName,
          scorePercentage: tp.scorePercentage,
          incorrectCount: tp.incorrectAnswers,
        }));

      // 3. Send performance data to Gemini API for deep diagnosis
      const report = await aiService.evaluateQuizPerformance({
        courseId: course.id,
        courseCode: course.code,
        courseTitle: course.title,
        score: correctCount,
        totalQuestions: questions.length,
        studentAnswers,
        topicPerformances,
        weakTopics,
        materials: course.materials,
      });

      setEvaluationReport(report);
      if (report.diagnosisReport && onSaveDiagnosisReport) {
        onSaveDiagnosisReport(course.id, report.diagnosisReport);
      }

      // 4. Save entire quiz attempt persistently to the database for this authenticated user
      if (token) {
        try {
          const strongTopicNames = topicPerformances
            .filter((tp) => tp.scorePercentage >= 80)
            .map((tp) => tp.topicName);

          const weakTopicNames = topicPerformances
            .filter((tp) => tp.scorePercentage < 60 || tp.incorrectAnswers > 0)
            .map((tp) => tp.topicName);

          const completedTimestamp = new Date().toISOString();

          await progressService.saveQuizAttempt(token, {
            courseId: course.id,
            courseCode: course.code,
            courseName: course.title,
            score: correctCount,
            totalQuestions: questions.length,
            percentage: report.scorePercentage,
            gradeDescriptor: report.gradeDescriptor,
            individualAnswers: questions.map((q, idx) => {
              const selectedIdx = userSelections[idx] !== undefined ? userSelections[idx] : null;
              return {
                questionId: q.id,
                topicId: q.topicId,
                topicName: q.topicName,
                questionText: q.question,
                selectedOptionIndex: selectedIdx,
                selectedOptionText: selectedIdx !== null ? q.options[selectedIdx] : 'Not answered',
                correctOptionIndex: q.correctOptionIndex,
                correctOptionText: q.options[q.correctOptionIndex],
                isCorrect: selectedIdx === q.correctOptionIndex,
                explanation: q.explanation,
                difficulty: q.difficulty,
              };
            }),
            topicLevelScores: topicPerformances.map((tp) => {
              const matchingDiag = report.topicDiagnoses?.find((d) => d.topicId === tp.topicId);
              return {
                topicId: tp.topicId,
                topicName: tp.topicName,
                score: tp.correctAnswers,
                total: tp.totalQuestions,
                percentage: tp.scorePercentage,
                classification: (matchingDiag?.classification || (tp.scorePercentage >= 80 ? 'Strong' : tp.scorePercentage < 60 ? 'Critical' : 'Needs Practice')) as any,
                status: tp.status,
                whyNeedsAttention: matchingDiag?.whyNeedsAttention,
                recommendedNextActions: matchingDiag?.recommendedNextActions,
              };
            }),
            strongTopics: strongTopicNames,
            weakTopics: weakTopicNames,
            aiGeneratedStudyRecommendations: {
              academicStanding: report.diagnosisReport?.academicStanding || report.gradeDescriptor,
              executiveDiagnosis: report.diagnosisReport?.executiveDiagnosis || report.overallAssessment,
              prioritizedActionPlan: (report.prioritizedActionPlan || report.diagnosisReport?.prioritizedActionPlan || []).map((item) => ({
                stepNumber: item.stepNumber,
                topicName: item.topicName,
                actionTitle: item.actionTitle,
                actionDetail: item.actionDetail,
                estimatedMinutes: item.estimatedMinutes,
                materialReference: item.materialReference,
                priority: item.priority,
              })),
              studyRoadmap: report.studyRoadmap || [],
              recommendedMasteryUpdates: (report.recommendedMasteryUpdates || []).map((u) => ({
                topicId: u.topicId,
                newStatus: u.newStatus,
              })),
            },
            startedAt: quizStartTime || new Date().toISOString(),
            completedAt: completedTimestamp,
          });

          // Trigger refresh callback if provided
          if (onQuizSaved) {
            onQuizSaved();
          }
        } catch (saveErr) {
          console.error('Failed to save persistent quiz progress to database:', saveErr);
        }
      }

      setStage('results');
    } catch (err: any) {
      console.error('Quiz evaluation error:', err);
      setErrorMessage(err.message || 'Failed to analyze quiz performance with Gemini AI.');
      setStage('taking');
    }
  };

  // 4. Apply Mastery Updates to Course MindMap
  const handleApplyMasteryToMindMap = () => {
    if (evaluationReport && onUpdateMasteryStatuses) {
      onUpdateMasteryStatuses(course.id, evaluationReport.recommendedMasteryUpdates);
      setMasteryApplied(true);
    }
  };

  const answeredCount = Object.keys(userSelections).length;
  const currentQ = questions[currentIdx];

  const topicDiagnoses = evaluationReport?.topicDiagnoses || [];
  const filteredTopicDiagnoses = topicDiagnoses.filter((t) => {
    if (topicFilter === 'ALL') return true;
    return t.classification === topicFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="diagnostic-quiz-modal-card"
        className="bg-white w-full max-w-3xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Academic Diagnostic Quiz</h2>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                  {course.code}
                </span>
                <span className="text-[10px] uppercase font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  Gemini 3.7 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {stage === 'taking'
                  ? `Answering diagnostic questions based only on uploaded ${course.code} materials.`
                  : stage === 'results'
                  ? 'Personalized AI assessment, score summary & weak topic remediation.'
                  : 'Pinpoint knowledge gaps and identify prerequisite weaknesses.'}
              </p>
            </div>
          </div>
          <button
            id="close-diagnostic-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900 text-xs">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold">Diagnostic Operation Error</h4>
                <p className="text-rose-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* STAGE 1: INITIAL GENERATION PROMPT */}
          {stage === 'init' && (
            <div className="space-y-5">
              {/* Grounding & Integrity Banner */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-emerald-900">Gemini-Powered 10-Question Diagnostic Assessment</h4>
                  <p className="text-emerald-800 mt-1 leading-relaxed">
                    Gemini will generate <strong>10 multiple-choice questions</strong> based <em>only</em> on your uploaded lecture slides, syllabus, and CT documents. 
                    Questions span foundational definitions, applied reasoning, and advanced term-final concepts. Answers remain hidden until final submission.
                  </p>
                </div>
              </div>

              {/* Prerequisites Check */}
              {!hasMaterials ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <h4 className="font-bold text-amber-900">No Course Materials Uploaded</h4>
                    <p className="text-amber-800 mt-0.5">
                      Please upload lecture slides or syllabus PDFs for {course.code} so Gemini can ground diagnostic questions in your curriculum.
                    </p>
                  </div>
                </div>
              ) : !isAnalyzed ? (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <h4 className="font-bold text-indigo-900">Course Materials Not Yet Analyzed</h4>
                      <p className="text-indigo-800 mt-0.5">
                        We recommend running <strong>Analyze Course</strong> first to map curriculum topics and prerequisites.
                      </p>
                    </div>
                  </div>
                  {onOpenAnalyzeModal && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenAnalyzeModal();
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors"
                    >
                      Analyze Now
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Question Format</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">10 MCQs (4 Choices)</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Topics Covered</span>
                    <p className="text-sm font-bold text-indigo-600 mt-0.5">{course.knowledgeNodes.length} Syllabus Modules</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Target Standard</span>
                    <p className="text-sm font-bold text-emerald-700 mt-0.5">RUET Class Test / Final</p>
                  </div>
                </div>
              )}

              {/* Uploaded Materials Staged */}
              {hasMaterials && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Source Materials ({course.materials.length} Documents):
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                    {course.materials.map((m) => (
                      <div key={m.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-xs">
                        <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="truncate font-mono font-medium text-slate-800">{m.fileName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STAGE 2: GENERATING QUESTIONS LOADING STATE */}
          {stage === 'generating' && (
            <div className="p-10 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center space-y-4">
              <div className="inline-flex p-3.5 rounded-2xl bg-emerald-100 text-emerald-700 animate-pulse">
                <Loader2 className="w-9 h-9 animate-spin" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Gemini is Crafting 10 Diagnostic Questions
                </h3>
                <p className="text-xs text-emerald-800 font-medium mt-1">
                  Mining core definitions, algorithms, and exam scenarios strictly from {course.code} materials...
                </p>
              </div>
              <div className="max-w-md mx-auto bg-white/80 p-3 rounded-xl border border-emerald-200 text-[11px] text-slate-600">
                Spanning basic definitions, intermediate properties, and advanced problem-solving questions.
              </div>
            </div>
          )}

          {/* STAGE 3: ACTIVE QUIZ TAKING */}
          {stage === 'taking' && questions.length > 0 && currentQ && (
            <div className="space-y-5">
              {/* Question Navigation Palette (1 to 10) */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {questions.map((q, idx) => {
                    const isAnswered = userSelections[idx] !== undefined;
                    const isCurrent = currentIdx === idx;
                    return (
                      <button
                        key={q.id || idx}
                        onClick={() => setCurrentIdx(idx)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                          isCurrent
                            ? 'bg-emerald-600 text-white ring-2 ring-emerald-500/40 shadow-xs'
                            : isAnswered
                            ? 'bg-slate-800 text-white hover:bg-slate-700'
                            : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                        }`}
                        title={`Question ${idx + 1}: ${q.topicName}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="text-xs font-semibold text-slate-600">
                  <span className="text-emerald-700 font-bold">{answeredCount}</span> of {questions.length} Answered
                </div>
              </div>

              {/* Question Card */}
              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
                {/* Meta Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 font-mono">
                      Q{currentIdx + 1}/{questions.length}
                    </span>
                    <span className="text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200/80 px-2.5 py-0.5 rounded-lg">
                      {currentQ.topicName}
                    </span>
                  </div>

                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    currentQ.difficulty === 'basic'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : currentQ.difficulty === 'advanced'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {currentQ.difficulty} difficulty
                  </span>
                </div>

                {/* Question Statement */}
                <h3 className="text-sm md:text-base font-bold text-slate-900 leading-relaxed">
                  {currentQ.question}
                </h3>

                {/* Multiple Choice Options (A, B, C, D) */}
                <div className="space-y-2.5 pt-1">
                  {currentQ.options.map((opt, optIdx) => {
                    const isSelected = userSelections[currentIdx] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectOption(optIdx)}
                        className={`w-full p-3.5 rounded-xl border text-left text-xs md:text-sm font-medium flex items-start gap-3 transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-600 shadow-2xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="leading-relaxed flex-1">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                  disabled={currentIdx === 0}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {currentIdx < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    id="submit-diagnostic-quiz-btn"
                    onClick={handleSubmitQuiz}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit Diagnostic Quiz</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STAGE 4: EVALUATING RESULTS LOADING STATE */}
          {stage === 'evaluating' && (
            <div className="p-10 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-center space-y-4">
              <div className="inline-flex p-3.5 rounded-2xl bg-indigo-100 text-indigo-700 animate-pulse">
                <Loader2 className="w-9 h-9 animate-spin" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Sending Diagnostic Performance to Gemini API
                </h3>
                <p className="text-xs text-indigo-800 font-medium mt-1">
                  Calculating score, correlating weak topics, and generating a targeted study plan...
                </p>
              </div>
              <div className="max-w-md mx-auto bg-white/80 p-3 rounded-xl border border-indigo-200 text-[11px] text-slate-600">
                Evaluating prerequisite gaps and exam readiness across the RUET syllabus.
              </div>
            </div>
          )}

          {/* STAGE 5: COMPREHENSIVE RESULTS & GEMINI AI DIAGNOSTIC REPORT */}
          {stage === 'results' && evaluationReport && (
            <div className="space-y-5">
              {/* Score & Academic Standing Hero Banner */}
              <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl border border-slate-800 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 font-mono">
                      AI Study Diagnosis
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">
                      {evaluationReport.gradeDescriptor}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                      {evaluationReport.overallAssessment}
                    </p>
                  </div>

                  <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-xl text-center min-w-[120px] shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Score</span>
                    <div className="text-2xl font-black text-emerald-400 mt-0.5">
                      {evaluationReport.score} <span className="text-sm text-slate-400 font-normal">/ {evaluationReport.totalQuestions}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-300 block mt-0.5">
                      {evaluationReport.scorePercentage}% Accuracy
                    </span>
                  </div>
                </div>
              </div>

              {/* Result View Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  onClick={() => setResultsTab('diagnosis')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    resultsTab === 'diagnosis'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <BrainCircuit className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Topic Diagnosis ({topicDiagnoses.length || evaluationReport.topicPerformances.length})</span>
                </button>

                <button
                  onClick={() => setResultsTab('plan')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    resultsTab === 'plan'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Target className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Action Plan</span>
                </button>

                <button
                  onClick={() => setResultsTab('review')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    resultsTab === 'review'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Question Review</span>
                </button>
              </div>

              {/* TAB 1: TOPIC-BY-TOPIC AI STUDY DIAGNOSIS */}
              {resultsTab === 'diagnosis' && (
                <div className="space-y-4">
                  {/* Classification Filter Bar */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {(['ALL', 'Critical', 'Needs Practice', 'Strong'] as const).map((filter) => {
                        const isSelected = topicFilter === filter;
                        return (
                          <button
                            key={filter}
                            onClick={() => setTopicFilter(filter)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-slate-800 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {filter}
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Showing {filteredTopicDiagnoses.length} of {topicDiagnoses.length} tested topics
                    </span>
                  </div>

                  {/* Topic Diagnosis Cards */}
                  <div className="space-y-3">
                    {filteredTopicDiagnoses.length > 0 ? (
                      filteredTopicDiagnoses.map((topic) => {
                        const isCritical = topic.classification === 'Critical';
                        const isNeedsPractice = topic.classification === 'Needs Practice';

                        return (
                          <div
                            key={topic.topicId}
                            className={`p-4 rounded-xl border space-y-2.5 transition-all ${
                              isCritical
                                ? 'bg-rose-50/50 border-rose-200 border-l-4 border-l-rose-500'
                                : isNeedsPractice
                                ? 'bg-amber-50/50 border-amber-200 border-l-4 border-l-amber-500'
                                : 'bg-emerald-50/50 border-emerald-200 border-l-4 border-l-emerald-500'
                            }`}
                          >
                            {/* Topic Title & Classification */}
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                                    isCritical
                                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                                      : isNeedsPractice
                                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  }`}>
                                    {topic.classification}
                                  </span>
                                  {topic.chapter && (
                                    <span className="text-[10px] text-slate-500 font-medium">
                                      {topic.chapter}
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-xs font-bold text-slate-900 mt-1">
                                  {topic.topicName}
                                </h4>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-xs font-black text-slate-900 block">
                                  {topic.performancePercentage}% Accuracy
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {topic.correctAnswers}/{topic.totalQuestions} questions correct
                                </span>
                              </div>
                            </div>

                            {/* Why It Needs Attention */}
                            <div className="p-3 bg-white/90 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed">
                              <strong className="text-slate-900 block mb-0.5">Why Attention Is Needed:</strong>
                              <p>{topic.whyNeedsAttention}</p>
                            </div>

                            {/* Recommended Next Actions */}
                            {topic.recommendedNextActions && topic.recommendedNextActions.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                                  Recommended Next Academic Actions:
                                </span>
                                <div className="space-y-1">
                                  {topic.recommendedNextActions.map((action, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs text-slate-700 bg-white/80 p-2 rounded-lg border border-slate-200/80">
                                      <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                                        {i + 1}
                                      </span>
                                      <span className="leading-snug">{action}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Source Material Reference */}
                            {topic.sourceMaterialReference && (
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-1">
                                <FileText className="w-3 h-3 text-slate-400" />
                                <span>Reference: {topic.sourceMaterialReference}</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      /* Fallback to weak topics list if topicDiagnoses not loaded */
                      evaluationReport.weakTopics.map((wt) => (
                        <div key={wt.topicId} className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <h5 className="text-xs font-bold text-rose-950">
                              {wt.topicName}
                            </h5>
                            <span className="text-[10px] font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded">
                              {wt.scorePercentage}% Score
                            </span>
                          </div>
                          <p className="text-xs text-rose-900 leading-relaxed">
                            <strong>Diagnostic Feedback:</strong> {wt.diagnosticFeedback}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: PRIORITIZED STUDY ACTION PLAN */}
              {resultsTab === 'plan' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Chronological Remediation Roadmap
                    </h4>
                    <span className="text-[10px] text-slate-500 font-medium">Grounded in Course Materials</span>
                  </div>

                  <div className="space-y-2.5">
                    {evaluationReport.prioritizedActionPlan && evaluationReport.prioritizedActionPlan.length > 0 ? (
                      evaluationReport.prioritizedActionPlan.map((action, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center font-mono font-bold text-[10px]">
                                {action.stepNumber || idx + 1}
                              </span>
                              <h5 className="text-xs font-bold text-slate-900">{action.actionTitle}</h5>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              {action.estimatedMinutes} mins
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 pl-7">{action.actionDetail}</p>
                          <div className="pl-7 text-[10px] text-slate-400 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            <span>{action.materialReference}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      evaluationReport.studyRoadmap.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="leading-relaxed flex-1">{step}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: FULL QUESTION-BY-QUESTION REVIEW */}
              {resultsTab === 'review' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Question Review & Academic Explanations (10 Questions)
                  </h4>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {questions.map((q, idx) => {
                      const userChoice = userSelections[idx];
                      const isCorrect = userChoice === q.correctOptionIndex;
                      return (
                        <div
                          key={q.id || idx}
                          className={`p-4 rounded-xl border text-xs space-y-2.5 transition-all ${
                            isCorrect
                              ? 'bg-white border-emerald-200/80 shadow-2xs'
                              : 'bg-rose-50/30 border-rose-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-500 font-mono">Q{idx + 1}.</span>
                              <span className="font-semibold text-slate-800">{q.topicName}</span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          </div>

                          <p className="font-medium text-slate-900 leading-relaxed">
                            {q.question}
                          </p>

                          <div className="space-y-1.5 pl-2 border-l-2 border-slate-200">
                            {q.options.map((opt, optIdx) => {
                              const isUserPick = userChoice === optIdx;
                              const isRightAnswer = q.correctOptionIndex === optIdx;
                              let style = 'text-slate-600';
                              if (isRightAnswer) style = 'text-emerald-800 font-bold bg-emerald-50 px-2 py-1 rounded';
                              else if (isUserPick && !isRightAnswer) style = 'text-rose-800 font-semibold line-through bg-rose-50 px-2 py-1 rounded';

                              return (
                                <div key={optIdx} className={`flex items-center gap-2 text-xs ${style}`}>
                                  <span className="font-mono text-[11px]">{String.fromCharCode(65 + optIdx)}.</span>
                                  <span>{opt}</span>
                                  {isRightAnswer && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-auto" />}
                                </div>
                              );
                            })}
                          </div>

                          <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-600 leading-relaxed">
                            <strong className="text-slate-800">Explanation: </strong>
                            {q.explanation}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {stage === 'init' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Close
              </button>

              <button
                id="generate-diagnostic-quiz-btn"
                onClick={handleGenerateQuestions}
                disabled={!hasMaterials}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate 10 Diagnostic Questions</span>
              </button>
            </>
          )}

          {stage === 'taking' && (
            <>
              <button
                onClick={() => setStage('init')}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Cancel Quiz</span>
              </button>

              <button
                id="submit-diagnostic-quiz-btn-footer"
                onClick={handleSubmitQuiz}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Submit Assessment ({answeredCount}/{questions.length})</span>
              </button>
            </>
          )}

          {stage === 'results' && (
            <>
              <button
                onClick={handleGenerateQuestions}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake Quiz</span>
              </button>

              <div className="flex items-center gap-2">
                {onNavigateToStudyDiagnosis && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToStudyDiagnosis();
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <BrainCircuit className="w-3.5 h-3.5" />
                    <span>View AI Study Diagnosis</span>
                  </button>
                )}

                {onUpdateMasteryStatuses && (
                  <button
                    id="apply-mastery-btn"
                    onClick={handleApplyMasteryToMindMap}
                    disabled={masteryApplied}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      masteryApplied
                        ? 'bg-emerald-100 text-emerald-800 cursor-default'
                        : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                    }`}
                  >
                    {masteryApplied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Mastery Applied to MindMap</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-4 h-4" />
                        <span>Apply Mastery to Map</span>
                      </>
                    )}
                  </button>
                )}

                {onNavigateToKnowledgeMap && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToKnowledgeMap();
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <span>Knowledge Map</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
