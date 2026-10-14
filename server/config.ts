import path from "node:path";

export const SERVER_PORT = Number(process.env.ARTILEARN_PORT ?? 8787);
export const DATA_DIRECTORY = path.resolve(process.cwd(), "data");
export const DATABASE_PATH = path.join(DATA_DIRECTORY, "artilearn.json");
export const UPLOAD_DIRECTORY = path.join(DATA_DIRECTORY, "uploads");
export const SESSION_COOKIE = "artilearn_session";
export const DEMO_SESSION_TOKEN = "artilearn-demo-session";
export const DEMO_USER_ID = "demo-user";
