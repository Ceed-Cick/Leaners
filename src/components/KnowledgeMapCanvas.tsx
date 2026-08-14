import React, { useState } from 'react';
import { 
  Network, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Info, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  HelpCircle,
  Clock,
  ArrowRight,
  BookOpen,
  Eye,
  Maximize2
} from 'lucide-react';
import { Course, KnowledgeNode } from '../types';

interface KnowledgeMapCanvasProps {
  course: Course;
  onOpenAnalysisModal?: () => void;
  onOpenDiagnosticModal?: () => void;
  expanded?: boolean;
}

export const KnowledgeMapCanvas: React.FC<KnowledgeMapCanvasProps> = ({
  course,
  onOpenAnalysisModal,
  onOpenDiagnosticModal,
  expanded = false,
}) => {
  const nodes = course.knowledgeNodes;
  const edges = course.knowledgeEdges;

  const canvasWidth = Math.max(900, ...nodes.map((n) => (n.x || 0) + 240));
  const canvasHeight = Math.max(500, ...nodes.map((n) => (n.y || 0) + 160));

  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(
    nodes.length > 0 ? nodes[0] : null
  );
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'graph' | 'tree'>('graph');

  // Keep selectedNode synchronized when course nodes are updated by Gemini analysis
  React.useEffect(() => {
    if (nodes.length > 0) {
      if (!selectedNode || !nodes.some((n) => n.id === selectedNode.id)) {
        setSelectedNode(nodes[0]);
      }
    } else {
      setSelectedNode(null);
    }
  }, [nodes]);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.15, 1.6));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.15, 0.7));
  const handleResetZoom = () => setZoomLevel(1);

  const getNodeCategoryColor = (category: KnowledgeNode['category']) => {
    switch (category) {
      case 'prerequisite':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-300',
          badge: 'bg-amber-100 text-amber-800',
          text: 'text-amber-900',
          ring: 'focus:ring-amber-400',
        };
      case 'core':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-300',
          badge: 'bg-emerald-100 text-emerald-800',
          text: 'text-emerald-900',
          ring: 'focus:ring-emerald-400',
        };
      case 'advanced':
        return {
          bg: 'bg-indigo-50',
          border: 'border-indigo-300',
          badge: 'bg-indigo-100 text-indigo-800',
          text: 'text-indigo-900',
          ring: 'focus:ring-indigo-400',
        };
      case 'application':
        return {
          bg: 'bg-sky-50',
          border: 'border-sky-300',
          badge: 'bg-sky-100 text-sky-800',
          text: 'text-sky-900',
          ring: 'focus:ring-sky-400',
        };
    }
  };

  const getStatusBadge = (status: KnowledgeNode['status']) => {
    switch (status) {
      case 'untested':
        return {
          label: 'Pending Diagnostic Test',
          classes: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <HelpCircle className="w-3.5 h-3.5 text-slate-500" />,
        };
      case 'weak':
        return {
          label: 'Identified Weak Topic',
          classes: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-500" />,
        };
      case 'moderate':
        return {
          label: 'Moderate Understanding',
          classes: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <Info className="w-3.5 h-3.5 text-amber-500" />,
        };
      case 'mastered':
        return {
          label: 'Topic Mastered',
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />,
        };
      default:
        return {
          label: 'Pending Assessment',
          classes: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <Clock className="w-3.5 h-3.5 text-slate-500" />,
        };
    }
  };

  return (
    <div className={`flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden ${
      expanded ? 'h-[700px]' : 'h-[520px]'
    }`}>
      {/* Map Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-50/90 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>{course.code} Course Knowledge Blueprint</span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                {nodes.length} Concept Nodes
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Interactive academic mind map representing RUET course curriculum structure.
            </p>
          </div>
        </div>

        {/* View Switcher & Canvas Controls */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-xs font-medium">
            <button
              id="map-view-graph-btn"
              onClick={() => setViewMode('graph')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'graph'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Graph Map
            </button>
            <button
              id="map-view-tree-btn"
              onClick={() => setViewMode('tree')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'tree'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Topic Tree
            </button>
          </div>

          {/* Zoom Buttons */}
          {viewMode === 'graph' && (
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs">
              <button
                id="zoom-in-btn"
                onClick={handleZoomIn}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                id="zoom-out-btn"
                onClick={handleZoomOut}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                id="zoom-reset-btn"
                onClick={handleResetZoom}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded text-[11px] font-medium"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Map Body: Canvas on Left, Node Details on Right */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {nodes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3">
              <Sparkles className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-800">No MindMap Generated Yet</h4>
            <p className="text-xs text-slate-500 max-w-md mt-1 mb-4 leading-relaxed">
              Upload course slides, class test questions, or the official RUET syllabus to generate an AI knowledge map for {course.code}.
            </p>
            {onOpenAnalysisModal && (
              <button
                id="empty-state-analyze-btn"
                onClick={onOpenAnalysisModal}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
              >
                Analyze Course Materials
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Visual Canvas Area */}
            <div className="flex-1 relative overflow-auto bg-slate-50/70 p-4 border-b md:border-b-0 md:border-r border-slate-200">
              {/* Informational Watermark/Status Banner */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur border border-slate-200 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[11px] font-medium text-slate-700">
                  Concept Dependency Hierarchy
                </span>
              </div>

              {viewMode === 'graph' ? (
                /* Graph Representation Canvas */
                <div 
                  className="relative transition-transform duration-200 origin-top-left p-6"
                  style={{ 
                    width: `${canvasWidth}px`, 
                    height: `${canvasHeight}px`,
                    minWidth: `${canvasWidth}px`,
                    minHeight: `${canvasHeight}px`,
                    transform: `scale(${zoomLevel})` 
                  }}
                >
                  {/* Visual SVG Connecting Edges */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    <defs>
                      <marker
                        id="arrow"
                        viewBox="0 0 10 10"
                        refX="22"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                      </marker>
                    </defs>
                    {edges.map((edge) => {
                      const sourceNode = nodes.find((n) => n.id === edge.source);
                      const targetNode = nodes.find((n) => n.id === edge.target);
                      if (!sourceNode || !targetNode) return null;

                      return (
                        <g key={edge.id}>
                          <line
                            x1={sourceNode.x + 80}
                            y1={sourceNode.y + 40}
                            x2={targetNode.x + 80}
                            y2={targetNode.y + 40}
                            stroke="#cbd5e1"
                            strokeWidth="2"
                            strokeDasharray="4 2"
                            markerEnd="url(#arrow)"
                          />
                          {edge.label && (
                            <text
                              x={(sourceNode.x + targetNode.x) / 2 + 80}
                              y={(sourceNode.y + targetNode.y) / 2 + 35}
                              fill="#64748b"
                              fontSize="9"
                              textAnchor="middle"
                              className="font-medium bg-white px-1"
                            >
                              {edge.label}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  {/* Interactive Nodes */}
                  {nodes.map((node) => {
                    const isSelected = selectedNode?.id === node.id;
                    const colors = getNodeCategoryColor(node.category);

                    return (
                      <div
                        key={node.id}
                        id={`map-node-${node.id}`}
                        onClick={() => setSelectedNode(node)}
                        style={{
                          left: `${node.x}px`,
                          top: `${node.y}px`,
                          position: 'absolute',
                        }}
                        className={`w-44 p-3 rounded-xl border cursor-pointer transition-all duration-200 z-10 ${
                          colors.bg
                        } ${colors.border} ${
                          isSelected
                            ? 'ring-2 ring-emerald-500 shadow-md scale-105 bg-white'
                            : 'hover:shadow-sm hover:scale-[1.02]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${colors.badge}`}>
                            {node.category}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {node.estimatedHours}h
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                          {node.label}
                        </h4>
                        <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-[10px] text-slate-500">
                          <span>{node.subtopics.length} subtopics</span>
                          <span className="text-emerald-600 font-semibold">Click to inspect</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Structured Topic Tree View */
                <div className="space-y-3 py-2">
                  {nodes.map((node, index) => {
                    const isSelected = selectedNode?.id === node.id;
                    const colors = getNodeCategoryColor(node.category);

                    return (
                      <div
                        key={node.id}
                        onClick={() => setSelectedNode(node)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-50/60 border-emerald-400 ring-1 ring-emerald-400'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
                              {index + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-slate-900">{node.label}</h4>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${colors.badge}`}>
                                  {node.category}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">{node.chapter}</p>
                            </div>
                          </div>
                          <div className="text-[11px] font-semibold text-slate-600 shrink-0">
                            ~{node.estimatedHours} hrs study
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Side: Selected Node Inspector Drawer */}
            <div className="w-full md:w-80 p-4 bg-white flex flex-col justify-between overflow-y-auto">
              {selectedNode ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {selectedNode.chapter}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {selectedNode.importance.toUpperCase()} PRIORITY
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {selectedNode.label}
                    </h3>
                  </div>

                  {/* Status Box */}
                  <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs ${getStatusBadge(selectedNode.status).classes}`}>
                    {getStatusBadge(selectedNode.status).icon}
                    <span>{getStatusBadge(selectedNode.status).label}</span>
                  </div>

                  {/* Description */}
                  <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {selectedNode.description}
                  </div>

                  {/* Subtopics Checklist */}
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Core Syllabus Subtopics ({selectedNode.subtopics.length})
                    </h4>
                    <ul className="space-y-1">
                      {selectedNode.subtopics.map((sub, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-700">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span>{sub}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Prerequisites */}
                  {selectedNode.prerequisites.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Academic Prerequisites
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedNode.prerequisites.map((prereq, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-medium px-2 py-1 bg-amber-50 text-amber-800 rounded-md border border-amber-200"
                          >
                            {prereq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                  <BookOpen className="w-8 h-8 mb-2 stroke-1" />
                  <p className="text-xs">Click on any node in the map to view detailed syllabus subtopics and dependencies.</p>
                </div>
              )}

              {/* Diagnostic Trigger Button */}
              {onOpenDiagnosticModal && (
                <div className="pt-4 mt-4 border-t border-slate-100">
                  <button
                    id="map-start-diagnostic-trigger"
                    onClick={onOpenDiagnosticModal}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Test Topic Knowledge</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
