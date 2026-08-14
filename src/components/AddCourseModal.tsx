import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  BookOpen, 
  GraduationCap, 
  Check, 
  AlertCircle,
  Layers,
  Sparkles
} from 'lucide-react';
import { Course, Department, KnowledgeNode } from '../types';

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCourse: (newCourse: Course) => void;
}

const DEPARTMENTS: { code: Department; name: string }[] = [
  { code: 'CSE', name: 'Computer Science & Engineering' },
  { code: 'EEE', name: 'Electrical & Electronic Engineering' },
  { code: 'ECE', name: 'Electrical & Computer Engineering' },
  { code: 'ETE', name: 'Electronics & Telecommunication Eng.' },
  { code: 'ME', name: 'Mechanical Engineering' },
  { code: 'CE', name: 'Civil Engineering' },
  { code: 'IPE', name: 'Industrial & Production Engineering' },
  { code: 'MTE', name: 'Mechatronics Engineering' },
  { code: 'CHEM', name: 'Chemical Engineering' },
  { code: 'MSE', name: 'Materials Science & Engineering' },
];

export const AddCourseModal: React.FC<AddCourseModalProps> = ({
  isOpen,
  onClose,
  onAddCourse,
}) => {
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState<Department>('CSE');
  const [credit, setCredit] = useState<number>(3.0);
  const [semester, setSemester] = useState('3rd Year 1st Semester (3-1)');
  const [series, setSeries] = useState("Series '21");
  const [instructor, setInstructor] = useState('');
  const [section, setSection] = useState('Section A & B');
  const [description, setDescription] = useState('');
  const [initialTopicsText, setInitialTopicsText] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !title.trim()) {
      setError('Course code and course title are required.');
      return;
    }

    const courseId = `${code.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;

    // Parse initial topics into structured knowledge nodes if provided
    const parsedTopics: KnowledgeNode[] = initialTopicsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((topicLine, index) => ({
        id: `node-${courseId}-${index + 1}`,
        label: topicLine,
        category: index === 0 ? 'prerequisite' : index % 3 === 0 ? 'advanced' : 'core',
        chapter: `Chapter ${index + 1}: ${topicLine}`,
        description: `Core curriculum topic for ${code}: ${topicLine}`,
        importance: 'high',
        estimatedHours: 5,
        status: 'untested',
        subtopics: [`Fundamental definitions of ${topicLine}`, `RUET Class Test Practice Problems`, `Term Final Application`],
        prerequisites: index > 0 ? [initialTopicsText.split('\n')[0].trim()] : [],
        x: 140 + (index % 3) * 220,
        y: 130 + Math.floor(index / 3) * 140,
      }));

    const newCourse: Course = {
      id: courseId,
      code: code.trim().toUpperCase(),
      title: title.trim(),
      department,
      credit: Number(credit) || 3.0,
      series,
      semester,
      instructor: instructor.trim() || 'Department Faculty',
      section,
      description: description.trim() || `Course curriculum for ${code.trim().toUpperCase()} - ${title.trim()}`,
      materials: [],
      knowledgeNodes: parsedTopics,
      knowledgeEdges: parsedTopics.length > 1 ? [
        {
          id: `e-${courseId}-1`,
          source: parsedTopics[0].id,
          target: parsedTopics[1].id,
          label: 'Prerequisite logic',
        }
      ] : [],
      isAnalyzed: false,
    };

    onAddCourse(newCourse);
    onClose();
    // Reset form
    setCode('');
    setTitle('');
    setDescription('');
    setInstructor('');
    setInitialTopicsText('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="add-course-modal-card"
        className="bg-white w-full max-w-xl rounded-2xl border border-slate-200/80 shadow-2xl overflow-hidden my-6 transition-all"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Add Academic Course
              </h2>
              <p className="text-xs text-slate-400">
                Enroll a new subject into your RUET study workspace
              </p>
            </div>
          </div>
          <button
            id="close-add-course-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Code & Credits */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="new-course-code" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Course Code <span className="text-rose-500">*</span>
              </label>
              <input
                id="new-course-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. CSE 3105 or EEE 3101"
                required
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-800"
              />
            </div>

            <div>
              <label htmlFor="new-course-credit" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Credit Hours
              </label>
              <select
                id="new-course-credit"
                value={credit}
                onChange={(e) => setCredit(parseFloat(e.target.value))}
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium"
              >
                <option value={1.5}>1.5 Credits (Sessional)</option>
                <option value={2.0}>2.0 Credits</option>
                <option value={3.0}>3.0 Credits (Theory)</option>
                <option value={4.0}>4.0 Credits</option>
              </select>
            </div>
          </div>

          {/* Row 2: Title */}
          <div>
            <label htmlFor="new-course-title" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Course Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="new-course-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Operating Systems & System Programming"
              required
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium"
            />
          </div>

          {/* Row 3: Department & Instructor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-course-dept" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Department
              </label>
              <select
                id="new-course-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept.code} value={dept.code}>
                    {dept.code} — {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="new-course-instructor" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Instructor / Course Teacher
              </label>
              <input
                id="new-course-instructor"
                type="text"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                placeholder="e.g. Dr. Boshir Ahmed"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>
          </div>

          {/* Row 4: Description */}
          <div>
            <label htmlFor="new-course-desc" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Course Outline / Syllabus Summary
            </label>
            <textarea
              id="new-course-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of key topics (e.g. Process synchronization, virtual memory, scheduling algorithms)..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 resize-none leading-relaxed"
            />
          </div>

          {/* Row 5: Initial Syllabus Topics (One per line) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="new-course-topics" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Initial Syllabus Topics (Optional)
              </label>
              <span className="text-[10px] text-slate-500 font-medium">One topic per line</span>
            </div>
            <textarea
              id="new-course-topics"
              rows={3}
              value={initialTopicsText}
              onChange={(e) => setInitialTopicsText(e.target.value)}
              placeholder="e.g.&#10;Process Management & Dual-Mode Execution&#10;CPU Scheduling (Round Robin & Priority)&#10;Deadlock Avoidance & Banker's Algorithm&#10;Page Replacement (LRU & FIFO)"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-mono resize-none leading-relaxed"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Entered topics will automatically populate the interactive Knowledge Map.
            </p>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              id="cancel-add-course-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-add-course-btn"
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Enroll Course</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
