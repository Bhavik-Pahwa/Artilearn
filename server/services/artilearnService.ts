import { randomUUID } from "node:crypto";
import path from "node:path";
import type {
  ActivityEvent,
  AppDatabase,
  Assessment,
  AssessmentAttempt,
  Material,
  Message,
  Notebook,
  ProgressSummary,
  User,
} from "../../src/shared/domain.js";
import { SUPPORTED_MATERIAL_TYPES } from "../../src/shared/domain.js";
import { AppError, notFound } from "../errors.js";
import type { DataRepository } from "../repositories/dataRepository.js";

type NotebookInput = Pick<Notebook, "title" | "subject" | "description">;

type UploadInput = {
  title: string;
  notebookId?: string;
  originalFilename: string;
  mimeType: Material["mimeType"];
  sizeBytes: number;
  buffer: Buffer;
};

export class ArtilearnService {
  private mutationQueue: Promise<unknown> = Promise.resolve();

  constructor(private readonly repository: DataRepository) {}

  async getUser(userId: string): Promise<User> {
    return this.owned((await this.repository.read()).users, userId, "User");
  }

  updateUser(userId: string, input: Pick<User, "displayName" | "email">): Promise<User> {
    return this.mutate((database) => {
      const user = this.owned(database.users, userId, "User");
      user.displayName = input.displayName;
      user.email = input.email;
      user.updatedAt = this.now();
      return user;
    });
  }

  async listNotebooks(userId: string): Promise<Notebook[]> {
    return this.byOwner((await this.repository.read()).notebooks, userId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getNotebook(userId: string, notebookId: string): Promise<Notebook> {
    return this.owned((await this.repository.read()).notebooks, userId, "Notebook", notebookId);
  }

  createNotebook(userId: string, input: NotebookInput): Promise<Notebook> {
    return this.mutate((database) => {
      const now = this.now();
      const notebook: Notebook = { id: randomUUID(), ownerId: userId, ...input, createdAt: now, updatedAt: now };
      database.notebooks.push(notebook);
      this.record(database, userId, "notebook_created", "notebook", notebook.id, { title: notebook.title });
      return notebook;
    });
  }

  updateNotebook(userId: string, notebookId: string, input: NotebookInput): Promise<Notebook> {
    return this.mutate((database) => {
      const notebook = this.owned(database.notebooks, userId, "Notebook", notebookId);
      Object.assign(notebook, input, { updatedAt: this.now() });
      this.record(database, userId, "notebook_updated", "notebook", notebook.id, { title: notebook.title });
      return notebook;
    });
  }

  deleteNotebook(userId: string, notebookId: string): Promise<{ unlinkedMaterials: number }> {
    return this.mutate((database) => {
      this.owned(database.notebooks, userId, "Notebook", notebookId);
      database.notebooks = database.notebooks.filter((notebook) => notebook.id !== notebookId);
      let unlinkedMaterials = 0;
      for (const material of database.materials) {
        if (material.ownerId === userId && material.notebookId === notebookId) {
          delete material.notebookId;
          material.updatedAt = this.now();
          unlinkedMaterials += 1;
        }
      }
      for (const message of database.messages) {
        if (message.ownerId === userId && message.notebookId === notebookId) delete message.notebookId;
      }
      return { unlinkedMaterials };
    });
  }

  async listMaterials(userId: string, notebookId?: string): Promise<Material[]> {
    let materials = this.byOwner((await this.repository.read()).materials, userId);
    if (notebookId) materials = materials.filter((material) => material.notebookId === notebookId);
    return materials.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async getMaterial(userId: string, materialId: string): Promise<Material> {
    return this.owned((await this.repository.read()).materials, userId, "Material", materialId);
  }

  createMaterial(userId: string, input: UploadInput): Promise<Material> {
    return this.mutate(async (database) => {
      if (input.notebookId) this.owned(database.notebooks, userId, "Notebook", input.notebookId);
      const id = randomUUID();
      const reference = `${id}${SUPPORTED_MATERIAL_TYPES[input.mimeType]}`;
      await this.repository.saveUpload(reference, input.buffer);
      const now = this.now();
      const material: Material = {
        id,
        ownerId: userId,
        notebookId: input.notebookId,
        title: input.title,
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        storageReference: reference,
        sourceType: "user-upload",
        status: "ready",
        createdAt: now,
        updatedAt: now,
      };
      database.materials.push(material);
      this.record(database, userId, "material_uploaded", "material", material.id, { title: material.title });
      return material;
    });
  }

  async downloadMaterial(userId: string, materialId: string): Promise<{ material: Material; contents: Buffer }> {
    const material = await this.getMaterial(userId, materialId);
    return { material, contents: await this.repository.readUpload(material.storageReference) };
  }

  deleteMaterial(userId: string, materialId: string): Promise<void> {
    return this.mutate(async (database) => {
      const material = this.owned(database.materials, userId, "Material", materialId);
      await this.repository.deleteUpload(material.storageReference);
      database.materials = database.materials.filter((candidate) => candidate.id !== materialId);
    });
  }

  async listMessages(userId: string, notebookId?: string): Promise<Message[]> {
    let messages = this.byOwner((await this.repository.read()).messages, userId);
    if (notebookId) messages = messages.filter((message) => message.notebookId === notebookId);
    return messages.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  sendMessage(userId: string, content: string, notebookId?: string): Promise<Message[]> {
    return this.mutate((database) => {
      if (notebookId) this.owned(database.notebooks, userId, "Notebook", notebookId);
      const userMessage = this.message(userId, "user", content, notebookId);
      const assistantMessage = this.message(
        userId,
        "assistant",
        `Demo response: I can help you unpack “${content.slice(0, 80)}”. Start by naming what you already know, then identify the smallest unclear step.`,
        notebookId,
      );
      database.messages.push(userMessage, assistantMessage);
      this.record(database, userId, "assistant_message_sent", "conversation", assistantMessage.id, { demo: true });
      return [userMessage, assistantMessage];
    });
  }

  startTutorSession(userId: string, topic: string, notebookId?: string): Promise<{ sessionId: string; steps: string[]; demo: true }> {
    return this.mutate((database) => {
      if (notebookId) this.owned(database.notebooks, userId, "Notebook", notebookId);
      const sessionId = randomUUID();
      this.record(database, userId, "tutor_session_started", "tutor", sessionId, { topic, demo: true });
      return {
        sessionId,
        demo: true,
        steps: [
          `Define ${topic} in your own words.`,
          "List one example and one non-example.",
          "Explain the hardest part as if teaching a classmate.",
        ],
      };
    });
  }

  async listAssessments(userId: string): Promise<Assessment[]> {
    return this.byOwner((await this.repository.read()).assessments, userId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async getAssessment(userId: string, assessmentId: string): Promise<Assessment> {
    return this.owned((await this.repository.read()).assessments, userId, "Assessment", assessmentId);
  }

  createAssessment(userId: string, title: string, notebookId?: string): Promise<Assessment> {
    return this.mutate((database) => {
      if (notebookId) this.owned(database.notebooks, userId, "Notebook", notebookId);
      const assessment: Assessment = {
        id: randomUUID(), ownerId: userId, notebookId, title, status: "ready", durationMinutes: 5,
        createdAt: this.now(),
        questions: [
          { id: randomUUID(), prompt: "Which approach best strengthens long-term recall?", options: ["Rereading once", "Active recall over time", "Highlighting everything", "Skipping feedback"], correctOptionIndex: 1, explanation: "Active recall combined with spacing repeatedly exercises retrieval." },
          { id: randomUUID(), prompt: "What should you do after answering incorrectly?", options: ["Ignore it", "Memorize the letter", "Review why and retry later", "Change the question"], correctOptionIndex: 2, explanation: "Feedback plus a later retry turns an error into a learning signal." },
          { id: randomUUID(), prompt: "A good study note should primarily…", options: ["Copy every sentence", "Use the longest possible wording", "Capture ideas in your own structure", "Avoid examples"], correctOptionIndex: 2, explanation: "Reorganizing ideas in your own words improves understanding and retrieval cues." },
        ],
      };
      database.assessments.push(assessment);
      return assessment;
    });
  }

  async listAttempts(userId: string): Promise<AssessmentAttempt[]> {
    return this.byOwner((await this.repository.read()).attempts, userId)
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  }

  async getAttempt(userId: string, attemptId: string): Promise<{ attempt: AssessmentAttempt; assessment: Assessment }> {
    const database = await this.repository.read();
    const attempt = this.owned(database.attempts, userId, "Assessment attempt", attemptId);
    const assessment = this.owned(database.assessments, userId, "Assessment", attempt.assessmentId);
    return { attempt, assessment };
  }

  submitAssessment(userId: string, assessmentId: string, answers: Record<string, number>): Promise<AssessmentAttempt> {
    return this.mutate((database) => {
      const assessment = this.owned(database.assessments, userId, "Assessment", assessmentId);
      const invalidQuestion = Object.keys(answers).find((questionId) => !assessment.questions.some((question) => question.id === questionId));
      if (invalidQuestion) throw new AppError(400, "invalid_answer", "An answer references an unknown question.");
      const correct = assessment.questions.filter((question) => answers[question.id] === question.correctOptionIndex).length;
      const now = this.now();
      const attempt: AssessmentAttempt = {
        id: randomUUID(), assessmentId, ownerId: userId, startedAt: now, submittedAt: now,
        status: "submitted", answers, score: Math.round((correct / assessment.questions.length) * 100),
      };
      database.attempts.push(attempt);
      this.record(database, userId, "assessment_completed", "assessment", attempt.id, { score: attempt.score ?? 0 });
      return attempt;
    });
  }

  async getProgress(userId: string): Promise<ProgressSummary> {
    const database = await this.repository.read();
    const events = this.byOwner(database.activityEvents, userId);
    return {
      completedActivities: events.length,
      assessmentAttempts: database.attempts.filter((attempt) => attempt.ownerId === userId && attempt.status === "submitted").length,
      materialsUploaded: database.materials.filter((material) => material.ownerId === userId).length,
      notebooksCreated: database.notebooks.filter((notebook) => notebook.ownerId === userId).length,
      recentActivity: events.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)).slice(0, 8),
    };
  }

  private async mutate<T>(operation: (database: AppDatabase) => T | Promise<T>): Promise<T> {
    const task = this.mutationQueue.then(async () => {
      const database = await this.repository.read();
      const result = await operation(database);
      await this.repository.write(database);
      return structuredClone(result);
    });
    this.mutationQueue = task.catch(() => undefined);
    return task;
  }

  private owned<T extends { id: string }>(items: T[], userId: string, entity: string, id = userId): T {
    const item = items.find((candidate) => candidate.id === id && (!("ownerId" in candidate) || candidate.ownerId === userId));
    if (!item) throw notFound(entity);
    return item;
  }

  private byOwner<T extends { ownerId: string }>(items: T[], userId: string): T[] {
    return items.filter((item) => item.ownerId === userId);
  }

  private message(userId: string, role: Message["role"], content: string, notebookId?: string): Message {
    return { id: randomUUID(), ownerId: userId, notebookId, role, content, status: "sent", createdAt: this.now() };
  }

  private record(
    database: AppDatabase,
    ownerId: string,
    eventType: ActivityEvent["eventType"],
    entityType: ActivityEvent["entityType"],
    entityId: string,
    metadata: ActivityEvent["metadata"],
  ): void {
    database.activityEvents.push({ id: randomUUID(), ownerId, eventType, entityType, entityId, occurredAt: this.now(), metadata });
  }

  private now(): string {
    return new Date().toISOString();
  }
}

export function isSupportedUpload(file: Express.Multer.File): file is Express.Multer.File & { mimetype: Material["mimeType"] } {
  const expectedExtension = SUPPORTED_MATERIAL_TYPES[file.mimetype as Material["mimeType"]];
  if (!expectedExtension || path.extname(file.originalname).toLowerCase() !== expectedExtension) return false;
  if (file.mimetype === "application/pdf") return file.buffer.subarray(0, 4).toString() === "%PDF";
  return file.buffer[0] === 0x50 && file.buffer[1] === 0x4b;
}
