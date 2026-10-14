import type { NextFunction, Request, Response } from "express";
import { DEMO_SESSION_TOKEN, DEMO_USER_ID, SESSION_COOKIE } from "../config.js";
import { AppError } from "../errors.js";

export function requireAuthentication(request: Request, response: Response, next: NextFunction): void {
  if (request.cookies?.[SESSION_COOKIE] !== DEMO_SESSION_TOKEN) {
    next(new AppError(401, "authentication_required", "Sign in to continue."));
    return;
  }
  response.locals.userId = DEMO_USER_ID;
  next();
}
