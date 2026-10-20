import { useEffect } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { ProjectsListPage } from "@/pages/projects/ProjectsListPage";
import { NewProjectPage } from "@/pages/projects/NewProjectPage";
import { ProjectDetailPage } from "@/pages/project-detail/ProjectDetailPage";
import { PromptsLibraryPage } from "@/pages/prompts-library/PromptsLibraryPage";
import { ClientPortalPage } from "@/pages/client-portal/ClientPortalPage";
import { AdminPage } from "@/pages/admin/AdminPage";
import { UsersPage } from "@/pages/users/UsersPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { SetNewPasswordPage } from "@/pages/auth/SetNewPasswordPage";
import { useAuthStore } from "@/store/auth-store";
import { useProjectsStore } from "@/store/projects-store";

// Full-screen loading spinner shown while Supabase restores the session
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F5F6F7] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <img src="/brand/consulcard-icone-circular.jpg" alt="Consulcard" className="h-12 w-12 rounded-full shadow-lg animate-pulse" />
        <p className="text-sm text-text-faint">Carregando...</p>
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const { isAuthenticated, initialized, loading, initialize, recoveryMode } = useAuthStore();
  const fetchProjects = useProjectsStore((s) => s.fetchProjects);
  const resetProjects = useProjectsStore((s) => s.reset);
  const projectsInitialized = useProjectsStore((s) => s.initialized);
  const loadError = useProjectsStore((s) => s.loadError);

  // Initialize Supabase auth listener once on mount
  useEffect(() => {
    initialize();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Once authenticated, load projects from Supabase. Ao sair, descarta os
  // dados: o próximo usuário no mesmo navegador não pode ver o que era do anterior.
  useEffect(() => {
    if (isAuthenticated && !recoveryMode && !projectsInitialized) fetchProjects();
    if (!isAuthenticated && projectsInitialized) resetProjects();
  }, [isAuthenticated, recoveryMode, projectsInitialized, fetchProjects, resetProjects]);

  // Client portal is always public
  if (location.pathname.startsWith("/client/")) {
    return (
      <Routes>
        <Route path="/client/:projectId" element={<ClientPortalPage />} />
      </Routes>
    );
  }

  // Wait for Supabase to restore session before deciding what to render
  if (!initialized || loading) return <LoadingScreen />;

  // Link de recuperação: só entra no sistema depois de definir a nova senha (GAP #1).
  if (recoveryMode) return <SetNewPasswordPage />;

  if (!isAuthenticated) return <LoginPage />;

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        {loadError && (
          <div className="flex items-center justify-between gap-3 border-b border-accent-red/20 bg-accent-red/10 px-6 py-2 text-xs text-accent-red">
            <span>{loadError}</span>
            <button onClick={() => fetchProjects()} className="font-medium underline">Tentar de novo</button>
          </div>
        )}
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsListPage />} />
          <Route path="/projects/new" element={<NewProjectPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/prompts" element={<PromptsLibraryPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/users" element={<UsersPage />} />
          {/* Volta do link de recuperação, já com a nova senha salva. */}
          <Route path="/reset-password" element={<Navigate to="/" replace />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </div>
    </div>
  );
}
