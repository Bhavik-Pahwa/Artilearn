import { Router } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { DEMO_SESSION_TOKEN, DEMO_USER_ID, SESSION_COOKIE } from "../config.js";
import { AppError } from "../errors.js";
import { requireAuthentication } from "../middleware/auth.js";
import { isSupportedUpload, type ArtilearnService } from "../services/artilearnService.js";
import { assessmentInput, attemptInput, messageInput, notebookInput, profileInput, tutorInput } from "../validation/schemas.js";
import { MAX_MATERIAL_SIZE_BYTES } from "../../src/shared/domain.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_MATERIAL_SIZE_BYTES } });

function input<T>(parser: { parse: (value: unknown) => T }, value: unknown): T {
  try {
    return parser.parse(value);
  } catch (error) {
    if (!(error instanceof ZodError)) throw error;
    const fieldErrors = Object.fromEntries(error.issues.map((issue) => [issue.path.join("."), issue.message]));
    throw new AppError(400, "validation_failed", "Check the highlighted fields.", fieldErrors);
  }
}

function publicAssessment(assessment: Awaited<ReturnType<ArtilearnService["getAssessment"]>>) {
  return {
    ...assessment,
    questions: assessment.questions.map((question) => ({ id: question.id, prompt: question.prompt, options: question.options })),
  };
}

export function createApiRouter(service: ArtilearnService): Router {
  const router = Router();

  router.get("/health", (_request, response) => response.json({ status: "ok" }));
  router.get("/session", async (request, response) => {
    if (request.cookies?.[SESSION_COOKIE] !== DEMO_SESSION_TOKEN) return response.json({ authenticated: false });
    return response.json({ authenticated: true, user: await service.getUser(DEMO_USER_ID) });
  });
  router.post("/session/demo", async (_request, response) => {
    response.cookie(SESSION_COOKIE, DEMO_SESSION_TOKEN, { httpOnly: true, sameSite: "lax", secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 });
    response.json({ authenticated: true, user: await service.getUser(DEMO_USER_ID) });
  });
  router.delete("/session", (_request, response) => {
    response.clearCookie(SESSION_COOKIE);
    response.status(204).end();
  });

  router.use(requireAuthentication);
  const userId = (response: Parameters<Parameters<Router["get"]>[1]>[1]) => response.locals.userId as string;

  router.patch("/profile", async (request, response) => response.json(await service.updateUser(userId(response), input(profileInput, request.body))));

  router.get("/notebooks", async (_request, response) => response.json(await service.listNotebooks(userId(response))));
  router.post("/notebooks", async (request, response) => response.status(201).json(await service.createNotebook(userId(response), input(notebookInput, request.body))));
  router.get("/notebooks/:id", async (request, response) => response.json(await service.getNotebook(userId(response), request.params.id)));
  router.put("/notebooks/:id", async (request, response) => response.json(await service.updateNotebook(userId(response), request.params.id, input(notebookInput, request.body))));
  router.delete("/notebooks/:id", async (request, response) => response.json(await service.deleteNotebook(userId(response), request.params.id)));

  router.get("/materials", async (request, response) => response.json(await service.listMaterials(userId(response), request.query.notebookId as string | undefined)));
  router.get("/materials/:id", async (request, response) => response.json(await service.getMaterial(userId(response), request.params.id)));
  router.get("/materials/:id/download", async (request, response) => {
    const { material, contents } = await service.downloadMaterial(userId(response), request.params.id);
    response.type(material.mimeType).attachment(material.originalFilename).send(contents);
  });
  router.post("/materials", upload.single("file"), async (request, response) => {
    if (!request.file) throw new AppError(400, "file_required", "Choose a file to upload.");
    if (!isSupportedUpload(request.file)) throw new AppError(415, "unsupported_file", "Upload a valid PDF, DOCX, or PPTX file.");
    const title = String(request.body.title || request.file.originalname.replace(/\.[^.]+$/, "")).trim();
    if (!title || title.length > 100) throw new AppError(400, "validation_failed", "Enter a title of 100 characters or fewer.");
    response.status(201).json(await service.createMaterial(userId(response), {
      title,
      notebookId: request.body.notebookId || undefined,
      originalFilename: request.file.originalname,
      mimeType: request.file.mimetype,
      sizeBytes: request.file.size,
      buffer: request.file.buffer,
    }));
  });
  router.delete("/materials/:id", async (request, response) => {
    await service.deleteMaterial(userId(response), request.params.id);
    response.status(204).end();
  });

  router.get("/messages", async (request, response) => response.json(await service.listMessages(userId(response), request.query.notebookId as string | undefined)));
  router.post("/messages", async (request, response) => {
    const body = input(messageInput, request.body);
    response.status(201).json(await service.sendMessage(userId(response), body.content, body.notebookId));
  });
  router.post("/tutor/sessions", async (request, response) => {
    const body = input(tutorInput, request.body);
    response.status(201).json(await service.startTutorSession(userId(response), body.topic, body.notebookId));
  });

  router.get("/assessments", async (_request, response) => response.json((await service.listAssessments(userId(response))).map(publicAssessment)));
  router.post("/assessments", async (request, response) => {
    const body = input(assessmentInput, request.body);
    response.status(201).json(publicAssessment(await service.createAssessment(userId(response), body.title, body.notebookId)));
  });
  router.get("/assessments/:id", async (request, response) => response.json(publicAssessment(await service.getAssessment(userId(response), request.params.id))));
  router.post("/assessments/:id/attempts", async (request, response) => {
    const body = input(attemptInput, request.body);
    const attempt = await service.submitAssessment(userId(response), request.params.id, body.answers);
    const assessment = await service.getAssessment(userId(response), request.params.id);
    response.status(201).json({ attempt, assessment });
  });
  router.get("/attempts", async (_request, response) => response.json(await service.listAttempts(userId(response))));
  router.get("/attempts/:id", async (request, response) => response.json(await service.getAttempt(userId(response), request.params.id)));
  router.get("/progress", async (_request, response) => response.json(await service.getProgress(userId(response))));

  return router;
}
