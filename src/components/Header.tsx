import React, { useState } from 'react';
import { Menu, Sparkles, BookOpen, ChevronDown, Plus, GraduationCap, LogOut, User as UserIcon } from 'lucide-react';
import { ActiveTab, Course, StudentProfile } from '../types';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  activeTab: ActiveTab;
  onOpenMobileMenu: () => void;
  courses: Course[];
  selectedCourseId: string;
  onSelectCourse: (courseId: string) => void;
  student: StudentProfile;
  onOpenAddCourse?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenMobileMenu,
  courses,
  selectedCourseId,
  onSelectCourse,
  student,
  onOpenAddCourse,
}) => {
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const currentCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];

  const getTabTitle = (tab: ActiveTab) => {
    switch (tab) {
      case 'dashboard':
        return {
          title: 'Student Dashboard',
          subtitle: 'Academic overview, course materials, and AI mind map readiness.',
        };
      case 'courses':
        return {
          title: 'My Enrolled Courses',
          subtitle: 'Manage term courses, syllabus blueprints, and academic assets.',
        };
      case 'knowledge-map':
        return {
          title: 'Interactive Knowledge Map',
          subtitle: 'Explore concept hierarchies, prerequisites, and learning dependencies.',
        };
      case 'diagnostic-quiz':
        return {
          title: 'Diagnostic Topic Assessment',
          subtitle: 'Identify weak knowledge areas through targeted RUET syllabus tests.',
        };
      case 'study-plan':
        return {
          title: 'Personalized Study Plan',
          subtitle: 'Topic-by-topic study roadmap prioritizing weak academic topics.',
        };
    }
  };

  const { title, subtitle } = getTabTitle(activeTab);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 shadow-2xs">
      <div className="flex items-center justify-between gap-4">
        {/* Left Side: Mobile Menu Button & Page Title */}
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            id="mobile-menu-toggle-btn"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
              {title}
            </h1>
            <p className="hidden sm:block text-[11px] text-slate-500 font-medium truncate">{subtitle}</p>
          </div>
        </div>

        {/* Right Side: Course Switcher, Add Course, User Profile & Logout */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Quick Course Selector */}
          <div className="relative">
            <div className="flex items-center gap-2 bg-slate-100/90 border border-slate-200/80 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200/70 transition-colors">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <select
                id="active-course-dropdown"
                value={selectedCourseId}
                onChange={(e) => onSelectCourse(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-800 pr-5 focus:outline-none cursor-pointer appearance-none"
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} — {course.title.length > 20 ? course.title.substring(0, 20) + '...' : course.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Quick Add Course Button in Header */}
          {onOpenAddCourse && (
            <button
              id="header-add-course-btn"
              onClick={onOpenAddCourse}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs transition-all shrink-0"
              title="Add a new academic course"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Course</span>
            </button>
          )}

          {/* Academic Semester Badge */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-900 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            <span>{student.series}</span>
            <span className="text-emerald-400">•</span>
            <span>{student.semester.split('(')[0].trim()}</span>
          </div>

          {/* User Profile & Sign Out Controls */}
          <div className="relative">
            <button
              id="header-user-menu-btn"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors text-xs font-semibold text-slate-800"
              title="Student Account Profile"
            >
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                {(user?.fullName || student.name).charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:inline font-bold truncate max-w-[100px]">
                {user?.fullName?.split(' ')[0] || student.name.split(' ')[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{user?.fullName || student.name}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{user?.email || 'tanvir.ruet20@gmail.com'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                        Series '{user?.series || '20'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                        {user?.department || student.department}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Roll: {user?.studentId || student.rollNumber}
                      </span>
                    </div>
                  </div>

                  <div className="px-2 py-1.5">
                    <button
                      id="header-logout-btn"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>Sign Out (Log Out)</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
