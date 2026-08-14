/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ActiveTab, Course, CourseMaterial, StudentProfile, OverallUserProgressReport } from './types';
import { INITIAL_COURSES, CURRENT_STUDENT } from './data/coursesData';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthView } from './components/views/AuthView';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/views/DashboardView';
import { MyCoursesView } from './components/views/MyCoursesView';
import { KnowledgeMapView } from './components/views/KnowledgeMapView';
import { DiagnosticQuizView } from './components/views/DiagnosticQuizView';
import { StudyPlanView } from './components/views/StudyPlanView';
import { UploadMaterialsModal } from './components/UploadMaterialsModal';
import { AnalyzeCourseModal } from './components/AnalyzeCourseModal';
import { DiagnosticQuizModal } from './components/DiagnosticQuizModal';
import { AddCourseModal } from './components/AddCourseModal';
import { progressService } from './services/progressService';
import { GraduationCap } from 'lucide-react';

function MainApp() {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(INITIAL_COURSES[0].id);
  const [userProgress, setUserProgress] = useState<OverallUserProgressReport | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAnalyzeModalOpen, setIsAnalyzeModalOpen] = useState(false);
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);

  // Fetch persistent user progress & courses from database when authenticated
  const loadUserDataFromDatabase = useCallback(async () => {
    if (!token || !user) return;
    try {
      // 1. Fetch persistent courses
      const savedCourses = await progressService.getUserCourses(token);
      if (savedCourses && savedCourses.length > 0) {
        setCourses(savedCourses);
        // Ensure selected course is valid
        if (!savedCourses.some((c) => c.id === selectedCourseId)) {
          setSelectedCourseId(savedCourses[0].id);
        }
      }

      // 2. Fetch persistent progress
      const progress = await progressService.getUserProgress(token);
      if (progress) {
        setUserProgress(progress);
      }
    } catch (err) {
      console.warn('Could not load persistent database progress:', err);
    }
  }, [token, user, selectedCourseId]);

  useEffect(() => {
    if (isAuthenticated && token) {
      loadUserDataFromDatabase();
    }
  }, [isAuthenticated, token, loadUserDataFromDatabase]);

  // Derive dynamic student profile from authenticated user
  const studentProfile: StudentProfile = {
    id: user?.id || CURRENT_STUDENT.id,
    name: user?.fullName || CURRENT_STUDENT.name,
    rollNumber: user?.studentId || CURRENT_STUDENT.rollNumber,
    department: user?.department || CURRENT_STUDENT.department,
    series: user?.series ? `Series '${user.series}` : CURRENT_STUDENT.series,
    semester: user?.currentSemester 
      ? `${user.currentSemester} (4th Year, Odd Term)`
      : CURRENT_STUDENT.semester,
    email: user?.email || CURRENT_STUDENT.email,
  };

  const currentCourse = courses.find((c) => c.id === selectedCourseId) || courses[0] || INITIAL_COURSES[0];

  // Course addition handler with database persistence
  const handleAddCourse = async (newCourse: Course) => {
    setCourses((prev) => [newCourse, ...prev]);
    setSelectedCourseId(newCourse.id);

    if (token) {
      try {
        await progressService.saveUserCourse(token, newCourse);
      } catch (e) {
        console.error('Failed to persist new course to database:', e);
      }
    }
  };

  // Material handlers with database persistence
  const handleAddMaterial = async (newMaterial: CourseMaterial) => {
    const updatedCourses = courses.map((c) => {
      if (c.id === newMaterial.courseId) {
        return {
          ...c,
          materials: [newMaterial, ...c.materials],
        };
      }
      return c;
    });
    setCourses(updatedCourses);

    if (token) {
      const targetCourse = updatedCourses.find((c) => c.id === newMaterial.courseId);
      if (targetCourse) {
        try {
          await progressService.saveCourseMaterials(token, targetCourse.id, targetCourse.materials);
        } catch (e) {
          console.error('Failed to persist materials to database:', e);
        }
      }
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    const updatedCourses = courses.map((c) => {
      if (c.id === currentCourse.id) {
        return {
          ...c,
          materials: c.materials.filter((m) => m.id !== materialId),
        };
      }
      return c;
    });
    setCourses(updatedCourses);

    if (token) {
      const targetCourse = updatedCourses.find((c) => c.id === currentCourse.id);
      if (targetCourse) {
        try {
          await progressService.saveCourseMaterials(token, targetCourse.id, targetCourse.materials);
        } catch (e) {
          console.error('Failed to persist material deletion to database:', e);
        }
      }
    }
  };

  const handleOpenUploadForCourse = (course: Course) => {
    setSelectedCourseId(course.id);
    setIsUploadModalOpen(true);
  };

  const handleOpenAnalyzeForCourse = (course: Course) => {
    setSelectedCourseId(course.id);
    setIsAnalyzeModalOpen(true);
  };

  const handleOpenDiagnosticForCourse = (course: Course) => {
    setSelectedCourseId(course.id);
    setIsDiagnosticModalOpen(true);
  };

  // Course analysis completion handler with database persistence
  const handleAnalysisSuccess = async (
    courseId: string,
    nodes: any[],
    edges: any[],
    summary: string
  ) => {
    setCourses((prevCourses) =>
      prevCourses.map((c) => {
        if (c.id === courseId) {
          return {
            ...c,
            knowledgeNodes: nodes,
            knowledgeEdges: edges,
            description: summary || c.description,
            isAnalyzed: true,
            lastAnalysisDate: new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
          };
        }
        return c;
      })
    );

    if (token) {
      try {
        await progressService.saveIdentifiedTopics(token, courseId, nodes, edges, summary);
      } catch (e) {
        console.error('Failed to persist identified topics to database:', e);
      }
    }
  };

  // Update topic mastery status after diagnostic quiz with database persistence
  const handleUpdateMasteryStatuses = async (
    courseId: string,
    updates: Array<{ topicId: string; newStatus: any }>
  ) => {
    setCourses((prevCourses) =>
      prevCourses.map((c) => {
        if (c.id === courseId) {
          const updateMap = new Map(updates.map((u) => [u.topicId, u.newStatus]));
          const updatedNodes = c.knowledgeNodes.map((n) => {
            if (updateMap.has(n.id)) {
              return { ...n, status: updateMap.get(n.id)! };
            }
            return n;
          });
          return {
            ...c,
            knowledgeNodes: updatedNodes,
          };
        }
        return c;
      })
    );

    if (token) {
      try {
        await progressService.updateTopicMastery(token, courseId, updates);
      } catch (e) {
        console.error('Failed to persist topic mastery updates to database:', e);
      }
    }
  };

  // 1. Initial Session Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-400 p-0.5 shadow-2xl flex items-center justify-center animate-pulse">
          <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-indigo-400" />
          </div>
        </div>
        <h2 className="mt-4 text-white font-bold text-base tracking-tight">RUET MindMap AI</h2>
        <p className="mt-1 text-slate-400 text-xs">Verifying authenticated academic session...</p>
      </div>
    );
  }

  // 2. Unauthenticated Gate: Show Login & Sign Up view
  if (!isAuthenticated || !user) {
    return <AuthView />;
  }

  // 3. Authenticated Dashboard View
  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        student={studentProfile}
        coursesCount={courses.length}
        onOpenAddCourse={() => setIsAddCourseModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          courses={courses}
          selectedCourseId={selectedCourseId}
          onSelectCourse={setSelectedCourseId}
          student={studentProfile}
          onOpenAddCourse={() => setIsAddCourseModalOpen(true)}
        />

        {/* View Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              student={studentProfile}
              currentCourse={currentCourse}
              courses={courses}
              userProgress={userProgress}
              onSelectCourse={setSelectedCourseId}
              onOpenUploadModal={() => setIsUploadModalOpen(true)}
              onOpenAnalyzeModal={() => setIsAnalyzeModalOpen(true)}
              onOpenDiagnosticModal={() => setIsDiagnosticModalOpen(true)}
              onOpenAddCourseModal={() => setIsAddCourseModalOpen(true)}
              onNavigateTab={setActiveTab}
              onRefreshProgress={loadUserDataFromDatabase}
            />
          )}

          {activeTab === 'courses' && (
            <MyCoursesView
              courses={courses}
              selectedCourseId={selectedCourseId}
              onSelectCourse={setSelectedCourseId}
              onOpenUploadModal={handleOpenUploadForCourse}
              onOpenAnalyzeModal={handleOpenAnalyzeForCourse}
              onOpenDiagnosticModal={handleOpenDiagnosticForCourse}
              onOpenAddCourseModal={() => setIsAddCourseModalOpen(true)}
            />
          )}

          {activeTab === 'knowledge-map' && (
            <KnowledgeMapView
              currentCourse={currentCourse}
              onOpenUploadModal={() => setIsUploadModalOpen(true)}
              onOpenAnalyzeModal={() => setIsAnalyzeModalOpen(true)}
              onOpenDiagnosticModal={() => setIsDiagnosticModalOpen(true)}
            />
          )}

          {activeTab === 'diagnostic-quiz' && (
            <DiagnosticQuizView
              currentCourse={currentCourse}
              onOpenDiagnosticModal={() => setIsDiagnosticModalOpen(true)}
              onOpenAnalyzeModal={() => setIsAnalyzeModalOpen(true)}
            />
          )}

          {activeTab === 'study-plan' && (
            <StudyPlanView
              currentCourse={currentCourse}
              userProgress={userProgress}
              onOpenDiagnosticModal={() => setIsDiagnosticModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Interactive Modals */}
      <AddCourseModal
        isOpen={isAddCourseModalOpen}
        onClose={() => setIsAddCourseModalOpen(false)}
        onAddCourse={handleAddCourse}
      />

      <UploadMaterialsModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        course={currentCourse}
        onAddMaterial={handleAddMaterial}
        onDeleteMaterial={handleDeleteMaterial}
        onOpenAnalyzeModal={() => setIsAnalyzeModalOpen(true)}
      />

      <AnalyzeCourseModal
        isOpen={isAnalyzeModalOpen}
        onClose={() => setIsAnalyzeModalOpen(false)}
        course={currentCourse}
        onAnalysisSuccess={handleAnalysisSuccess}
        onNavigateToKnowledgeMap={() => setActiveTab('knowledge-map')}
      />

      <DiagnosticQuizModal
        isOpen={isDiagnosticModalOpen}
        onClose={() => setIsDiagnosticModalOpen(false)}
        course={currentCourse}
        onUpdateMasteryStatuses={handleUpdateMasteryStatuses}
        onNavigateToKnowledgeMap={() => setActiveTab('knowledge-map')}
        onOpenAnalyzeModal={() => setIsAnalyzeModalOpen(true)}
        onQuizSaved={loadUserDataFromDatabase}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
