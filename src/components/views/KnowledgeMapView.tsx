import React from 'react';
import { Network, Sparkles, BookOpen, Layers, Info, CheckCircle2 } from 'lucide-react';
import { Course } from '../../types';
import { KnowledgeMapCanvas } from '../KnowledgeMapCanvas';

interface KnowledgeMapViewProps {
  currentCourse: Course;
  onOpenUploadModal: () => void;
  onOpenAnalyzeModal: () => void;
  onOpenDiagnosticModal: () => void;
}

export const KnowledgeMapView: React.FC<KnowledgeMapViewProps> = ({
  currentCourse,
  onOpenUploadModal,
  onOpenAnalyzeModal,
  onOpenDiagnosticModal,
}) => {
  return (
    <div className="space-y-6 pb-12">
      {/* View Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-lg">
              {currentCourse.code}
            </span>
            <span className="text-xs text-slate-500 font-medium">RUET Department of {currentCourse.department}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            {currentCourse.title} — Knowledge Graph
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Explore topic nodes, prerequisite pathways, and syllabus relationships.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAnalyzeModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>Analyze Materials</span>
          </button>
          <button
            onClick={onOpenDiagnosticModal}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Diagnostic Quiz</span>
          </button>
        </div>
      </div>

      {/* Expanded Knowledge Map Canvas */}
      <KnowledgeMapCanvas
        course={currentCourse}
        onOpenAnalysisModal={onOpenAnalyzeModal}
        onOpenDiagnosticModal={onOpenDiagnosticModal}
        expanded={true}
      />

      {/* Knowledge Map Legend / Guide */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
          Knowledge Map Legend & Category Classification
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs">
            <span className="font-bold text-amber-900 block mb-0.5">Prerequisite Nodes</span>
            <p className="text-[11px] text-amber-800">Foundational math or logic knowledge required before starting chapter.</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
            <span className="font-bold text-emerald-900 block mb-0.5">Core Syllabus Nodes</span>
            <p className="text-[11px] text-emerald-800">Primary syllabus content frequently tested in RUET Class Tests.</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs">
            <span className="font-bold text-indigo-900 block mb-0.5">Advanced Theory</span>
            <p className="text-[11px] text-indigo-800">High-cognitive topics central to RUET Term Final Section A & B questions.</p>
          </div>
          <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200 text-xs">
            <span className="font-bold text-sky-900 block mb-0.5">Application & Lab</span>
            <p className="text-[11px] text-sky-800">Engineering application, hardware interfacing, or query implementation.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
