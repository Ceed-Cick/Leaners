import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Network, 
  CheckCircle2, 
  CalendarDays, 
  GraduationCap, 
  X, 
  Sparkles, 
  ChevronRight, 
  Plus,
  LogOut
} from 'lucide-react';
import { ActiveTab, StudentProfile } from '../types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile;
  coursesCount: number;
  onOpenAddCourse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  student,
  coursesCount,
  onOpenAddCourse,
}) => {
  const { user, logout } = useAuth();
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'courses', label: 'My Courses', icon: <BookOpen className="w-4 h-4" />, badge: `${coursesCount}` },
    { id: 'knowledge-map', label: 'Knowledge Map', icon: <Network className="w-4 h-4" /> },
    { id: 'diagnostic-quiz', label: 'Diagnostic Quiz', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'study-plan', label: 'Study Plan', icon: <CalendarDays className="w-4 h-4" /> },
  ];

  const displayName = user?.fullName || student.name;
  const displayRoll = user?.studentId || student.rollNumber;
  const displayDept = user?.department || student.department;
  const displaySeries = user?.series ? `Series '${user.series}` : student.series;
  const displaySemester = user?.currentSemester || student.semester.split('(')[0].trim();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          id="mobile-sidebar-backdrop"
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside 
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800/80 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* University Brand Header */}
        <div className="p-5 border-b border-slate-800/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white font-bold text-base ring-1 ring-emerald-400/30">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-white text-base">RUET</span>
                <span className="text-emerald-400 font-bold text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-800/60 tracking-wider">MindMap</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Academic AI Study Assistant</p>
            </div>
          </div>

          <button 
            id="close-sidebar-btn"
            onClick={onClose}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* RUET University Badge */}
        <div className="px-4 py-2.5 mx-3.5 my-3 rounded-xl bg-slate-800/60 border border-slate-750 flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
          <div className="text-xs text-slate-300 min-w-0">
            <span className="font-bold text-slate-200 block truncate text-[11px]">Rajshahi Univ. of Eng. & Tech.</span>
            <div className="text-[10px] text-slate-400 font-medium">Undergraduate Academic Portal</div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-3 py-1 space-y-1 overflow-y-auto">
          <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navigation Menu
          </div>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-link-${item.id}`}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-200" />}
                </div>
              </button>
            );
          })}

          {/* Quick Action: Add Course */}
          {onOpenAddCourse && (
            <div className="pt-3 px-1">
              <button
                id="sidebar-add-course-btn"
                onClick={() => {
                  onOpenAddCourse();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500 bg-slate-850/50 hover:bg-emerald-950/30 text-slate-300 hover:text-emerald-400 text-xs font-semibold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Academic Course</span>
              </button>
            </div>
          )}
        </div>

        {/* AI System Blueprint Card */}
        <div className="p-3.5 m-3 rounded-xl bg-slate-800/70 border border-slate-700/60">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Topic Extraction</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Parses RUET slides, syllabus, and class test questions to generate structured mind map graphs.
          </p>
        </div>

        {/* Student Profile Footer & Logout Button */}
        <div className="p-3.5 border-t border-slate-800/90 bg-slate-950/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/90 border border-indigo-500/40 flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0">
              {displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{displayName}</p>
              <p className="text-[10px] text-slate-400 truncate">Roll: {displayRoll} • {displayDept}</p>
              <div className="text-[9px] text-emerald-400 font-semibold uppercase tracking-wider mt-0.5">{displaySeries} • {displaySemester}</div>
            </div>
          </div>

          <button
            id="sidebar-logout-btn"
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
            title="Sign Out (Log Out)"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
