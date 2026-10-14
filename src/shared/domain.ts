export type EntityId = string;

export type User = {
  id: EntityId;
  displayName: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type Notebook = {
  id: EntityId;
  ownerId: EntityId;
  title: string;
  subject?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

export const SUPPORTED_MATERIAL_TYPES = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
} as const;

export const MAX_MATERIAL_SIZE_BYTES = 8 * 1024 * 1024;

export type MaterialStatus = "ready" | "failed";

export type Material = {
  id: EntityId;
  ownerId: EntityId;
  notebookId?: EntityId;
  title: string;
  originalFilename: string;
  mimeType: keyof typeof SUPPORTED_MATERIAL_TYPES;
  sizeBytes: number;
  storageReference: string;
  sourceType: "user-upload";
  status: MaterialStatus;
  createdAt: string;
  updatedAt: string;
};

export type Message = {
  id: EntityId;
  ownerId: EntityId;
  notebookId?: EntityId;
  role: "user" | "assistant";
  content: string;
  status: "sent";
  createdAt: string;
};

export type AssessmentQuestion = {
  id: EntityId;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
};

export type Assessment = {
  id: EntityId;
  ownerId: EntityId;
  notebookId?: EntityId;
  title: string;
  status: "ready";
  durationMinutes: number;
  questions: AssessmentQuestion[];
  createdAt: string;
};

export type AssessmentAttempt = {
  id: EntityId;
  assessmentId: EntityId;
  ownerId: EntityId;
  startedAt: string;
  submittedAt?: string;
  status: "in-progress" | "submitted";
  answers: Record<string, number>;
  score?: number;
};

export type ActivityEventType =
  | "notebook_created"
  | "notebook_updated"
  | "material_uploaded"
  | "assistant_message_sent"
  | "tutor_session_started"
  | "assessment_completed";

export type ActivityEvent = {
  id: EntityId;
  ownerId: EntityId;
  eventType: ActivityEventType;
  entityType: "notebook" | "material" | "conversation" | "tutor" | "assessment";
  entityId: EntityId;
  occurredAt: string;
  metadata: Record<string, string | number | boolean>;
};

export type ProgressSummary = {
  completedActivities: number;
  assessmentAttempts: number;
  materialsUploaded: number;
  notebooksCreated: number;
  recentActivity: ActivityEvent[];
};

export type AppDatabase = {
  users: User[];
  notebooks: Notebook[];
  materials: Material[];
  messages: Message[];
  assessments: Assessment[];
  attempts: AssessmentAttempt[];
  activityEvents: ActivityEvent[];
};

export type ApiErrorShape = {
  error: {
    code: string;
    message: string;
    requestId: string;
    fieldErrors?: Record<string, string>;
  };
};

export type SessionResponse = {
  authenticated: boolean;
  user?: User;
};
