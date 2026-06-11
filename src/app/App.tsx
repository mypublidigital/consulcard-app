import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
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
import { useAuthStore } from "@/store/auth-store";

// Full-screen loading spinner shown while Supabase restores the session
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F4F2EE] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-11 w-11 rounded-xl bg-brand-primary flex items-center justify-center font-bold text-white text-lg shadow-lg animate-pulse">
          C
        </div>
        <p className="text-sm text-text-faint">Carregando...</p>
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const { isAuthenticated, initialized, loading, initialize } = useAuthStore();

  // Initialize Supabase auth listener once on mount
  useEffect(() => {
    initialize();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  if (!isAuthenticated) return <LoginPage />;

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsListPage />} />
          <Route path="/projects/new" element={<NewProjectPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/prompts" element={<PromptsLibraryPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </div>
    </div>
  );
}
