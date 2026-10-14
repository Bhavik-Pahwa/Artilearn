export const routes = {
  home: "/",
  notebooks: "/notebooks",
  notebook: (notebookId: string) => `/notebooks/${encodeURIComponent(notebookId)}`,
  materials: "/materials",
  materialUpload: "/materials/upload",
  material: (materialId: string) => `/materials/${encodeURIComponent(materialId)}`,
  tutor: "/tutor",
  quizzes: "/quizzes",
  quizNew: "/quizzes/new",
  quiz: (quizId: string) => `/quizzes/${encodeURIComponent(quizId)}`,
  quizResults: (quizId: string, attemptId: string) =>
    `/quizzes/${encodeURIComponent(quizId)}/results?attempt=${encodeURIComponent(attemptId)}`,
  resources: "/resources",
  progress: "/progress",
  settings: "/settings",
} as const;

export const primaryNavigation = [
  { label: "Workspace", to: routes.home },
  { label: "Notebooks", to: routes.notebooks },
  { label: "Materials", to: routes.materials },
  { label: "Quizzes", to: routes.quizzes },
  { label: "Resources", to: routes.resources },
  { label: "Progress", to: routes.progress },
] as const;
