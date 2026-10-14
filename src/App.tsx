import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { useSession } from "./context/SessionContext";
import { AssessmentAttemptPage, AssessmentCreatePage, AssessmentResultsPage, AssessmentsPage } from "./features/assessments/AssessmentPages";
import { MaterialDetailPage, MaterialsPage, MaterialUploadPage } from "./features/materials/MaterialPages";
import { NotebookDetailPage, NotebooksPage } from "./features/notebooks/NotebookPages";
import { ResourcesPage } from "./features/resources/ResourcesPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { ProgressPage, TutorPage, WorkspacePage } from "./features/workspace/WorkspacePages";
import { routes } from "./shared/routes";

function SignInPage() {
  const session = useSession();
  return <main className="auth-page"><section className="auth-card"><span className="brand-mark">A</span><p className="eyebrow">Artilearn workspace</p><h1>Turn scattered study material into a clear next step.</h1><p>This local demo keeps your notebooks, uploads, practice, and progress together.</p><button className="primary-button" onClick={session.signIn}>Enter demo workspace</button><small>No password is required in this development implementation.</small></section></main>;
}

export function App() {
  const session = useSession();
  if (session.loading) return <main className="auth-page"><div className="loading-block"><span className="spinner" /> Loading Artilearn…</div></main>;
  if (!session.authenticated) return <SignInPage />;
  return <Routes><Route element={<AppShell />}>
    <Route path={routes.home} element={<WorkspacePage />} />
    <Route path={routes.notebooks} element={<NotebooksPage />} />
    <Route path="/notebooks/:id" element={<NotebookDetailPage />} />
    <Route path={routes.materials} element={<MaterialsPage />} />
    <Route path={routes.materialUpload} element={<MaterialUploadPage />} />
    <Route path="/materials/:id" element={<MaterialDetailPage />} />
    <Route path={routes.tutor} element={<TutorPage />} />
    <Route path={routes.quizzes} element={<AssessmentsPage />} />
    <Route path={routes.quizNew} element={<AssessmentCreatePage />} />
    <Route path="/quizzes/:id/results" element={<AssessmentResultsPage />} />
    <Route path="/quizzes/:id" element={<AssessmentAttemptPage />} />
    <Route path={routes.resources} element={<ResourcesPage />} />
    <Route path={routes.progress} element={<ProgressPage />} />
    <Route path={routes.settings} element={<SettingsPage />} />
    <Route path="*" element={<Navigate to={routes.home} replace />} />
  </Route></Routes>;
}
