import { randomUUID } from "node:crypto";
import cookieParser from "cookie-parser";
import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import type { ApiErrorShape } from "../src/shared/domain.js";
import { AppError } from "./errors.js";
import { createApiRouter } from "./routes/apiRouter.js";
import type { ArtilearnService } from "./services/artilearnService.js";

export function createApp(service: ArtilearnService) {
  const app = express();
  app.disable("x-powered-by");
  app.use((request, response, next) => {
    response.locals.requestId = request.header("x-request-id") ?? randomUUID();
    response.setHeader("x-request-id", response.locals.requestId);
    next();
  });
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use("/api", createApiRouter(service));
  app.use((_request, _response, next) => next(new AppError(404, "route_not_found", "That API route does not exist.")));
  app.use((error: unknown, _request: Request, response: Response<ApiErrorShape>, _next: NextFunction) => {
    void _next;
    const normalized = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
      ? new AppError(413, "file_too_large", "Files must be 8 MB or smaller.")
      : error instanceof AppError
        ? error
        : new AppError(500, "internal_error", "Something went wrong. Try again.");
    if (normalized.status >= 500) console.error(error);
    response.status(normalized.status).json({ error: {
      code: normalized.code,
      message: normalized.message,
      requestId: response.locals.requestId,
      ...(normalized.fieldErrors ? { fieldErrors: normalized.fieldErrors } : {}),
    } });
  });
  return app;
}
