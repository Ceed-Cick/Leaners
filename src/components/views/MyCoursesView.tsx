import React, { useState } from 'react';
import { 
  BookOpen, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  User, 
  FileText, 
  Network, 
  ArrowRight,
  Plus,
  Search,
  Filter,
  GraduationCap
} from 'lucide-react';
import { Course } from '../../types';

interface MyCoursesViewProps {
  courses: Course[];
  selectedCourseId: string;
  onSelectCourse: (courseId: string) => void;
  onOpenUploadModal: (course: Course) => void;
  onOpenAnalyzeModal: (course: Course) => void;
  onOpenDiagnosticModal: (course: Course) => void;
  onOpenAddCourseModal: () => void;
}

export const MyCoursesView: React.FC<MyCoursesViewProps> = ({
  courses,
  selectedCourseId,
  onSelectCourse,
  onOpenUploadModal,
  onOpenAnalyzeModal,
  onOpenDiagnosticModal,
  onOpenAddCourseModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');

  const departments = ['ALL', ...Array.from(new Set(courses.map((c) => c.department)))];

  const filteredCourses = courses.filter((c) => {
    const matchesSearch = 
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.instructor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDeptFilter === 'ALL' || c.department === selectedDeptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Info & Action Controls */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-lg">
              Academic Curricula
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {courses.length} Registered {courses.length === 1 ? 'Course' : 'Courses'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Enrolled Courses & Curricula
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage academic course materials, syllabus breakdown, and topic mastery models.
          </p>
        </div>

        {/* Primary Add Course Button */}
        <button
          id="open-add-course-modal-btn"
          onClick={onOpenAddCourseModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs shadow-emerald-600/20 transition-all self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Course</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Department Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDeptFilter(dept)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedDeptFilter === dept
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {dept === 'ALL' ? 'All Departments' : dept}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by code, title or teacher..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200/90 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
          />
        </div>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No courses match your criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm ? `No results found for "${searchTerm}".` : 'No courses found in this category.'}
          </p>
          <button
            onClick={onOpenAddCourseModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add a Course Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((course) => {
            const isCurrent = course.id === selectedCourseId;
            const materialsCount = course.materials.length;
            const nodesCount = course.knowledgeNodes.length;

            return (
              <div
                key={course.id}
                id={`course-card-${course.id}`}
                className={`bg-white rounded-2xl border flex flex-col justify-between transition-all duration-200 overflow-hidden shadow-2xs hover:shadow-md ${
                  isCurrent ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200/90'
                }`}
              >
                <div className="p-5">
                  {/* Course Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold text-emerald-900 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
                        {course.code}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {course.department}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded-md">
                      {course.credit.toFixed(1)} Cr
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{course.instructor}</span>
                  </p>

                  <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>

                  {/* Status Stats */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3.5 border-t border-slate-100">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100/90 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Materials</span>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{materialsCount} files</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100/90 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Concept Map</span>
                      <p className="text-xs font-bold text-emerald-700 mt-0.5">{nodesCount} topics</p>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 bg-slate-50/70 border-t border-slate-100 space-y-2">
                  <button
                    id={`select-course-btn-${course.id}`}
                    onClick={() => onSelectCourse(course.id)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white hover:bg-slate-200/80 text-slate-800 border border-slate-200'
                    }`}
                  >
                    {isCurrent ? '✓ Active Selected Course' : 'Select as Current Course'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenUploadModal(course)}
                      className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>Upload</span>
                    </button>
                    <button
                      onClick={() => onOpenAnalyzeModal(course)}
                      className="flex-1 py-1.5 px-2 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-slate-200 hover:border-emerald-300 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Analyze</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
