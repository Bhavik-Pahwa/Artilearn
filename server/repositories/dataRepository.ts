import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AppDatabase } from "../../src/shared/domain.js";
import { DEMO_USER_ID } from "../config.js";

export interface DataRepository {
  read(): Promise<AppDatabase>;
  write(database: AppDatabase): Promise<void>;
  saveUpload(reference: string, contents: Buffer): Promise<void>;
  readUpload(reference: string): Promise<Buffer>;
  deleteUpload(reference: string): Promise<void>;
}

export function createInitialDatabase(now = new Date().toISOString()): AppDatabase {
  return {
    users: [{
      id: DEMO_USER_ID,
      displayName: "Ansh",
      email: "learner@artilearn.local",
      createdAt: now,
      updatedAt: now,
    }],
    notebooks: [],
    materials: [],
    messages: [],
    assessments: [],
    attempts: [],
    activityEvents: [],
  };
}

export class JsonDataRepository implements DataRepository {
  constructor(
    private readonly databasePath: string,
    private readonly uploadDirectory: string,
  ) {}

  async read(): Promise<AppDatabase> {
    try {
      return JSON.parse(await readFile(this.databasePath, "utf8")) as AppDatabase;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const initial = createInitialDatabase();
      await this.write(initial);
      return initial;
    }
  }

  async write(database: AppDatabase): Promise<void> {
    await mkdir(path.dirname(this.databasePath), { recursive: true });
    const temporaryPath = `${this.databasePath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(database, null, 2)}\n`, "utf8");
    await rename(temporaryPath, this.databasePath);
  }

  async saveUpload(reference: string, contents: Buffer): Promise<void> {
    await mkdir(this.uploadDirectory, { recursive: true });
    await writeFile(this.resolveUpload(reference), contents);
  }

  readUpload(reference: string): Promise<Buffer> {
    return readFile(this.resolveUpload(reference));
  }

  async deleteUpload(reference: string): Promise<void> {
    await rm(this.resolveUpload(reference), { force: true });
  }

  private resolveUpload(reference: string): string {
    const resolved = path.resolve(this.uploadDirectory, reference);
    const root = `${path.resolve(this.uploadDirectory)}${path.sep}`;
    if (!resolved.startsWith(root)) throw new Error("Invalid upload reference");
    return resolved;
  }
}

export class MemoryDataRepository implements DataRepository {
  private database: AppDatabase;
  private readonly uploads = new Map<string, Buffer>();

  constructor(seed = createInitialDatabase("2026-01-01T00:00:00.000Z")) {
    this.database = structuredClone(seed);
  }

  async read(): Promise<AppDatabase> {
    return structuredClone(this.database);
  }

  async write(database: AppDatabase): Promise<void> {
    this.database = structuredClone(database);
  }

  async saveUpload(reference: string, contents: Buffer): Promise<void> {
    this.uploads.set(reference, Buffer.from(contents));
  }

  async readUpload(reference: string): Promise<Buffer> {
    const upload = this.uploads.get(reference);
    if (!upload) throw Object.assign(new Error("Upload not found"), { code: "ENOENT" });
    return Buffer.from(upload);
  }

  async deleteUpload(reference: string): Promise<void> {
    this.uploads.delete(reference);
  }
}
