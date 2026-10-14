export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

export function notFound(entity: string): AppError {
  return new AppError(404, "not_found", `${entity} was not found.`);
}
