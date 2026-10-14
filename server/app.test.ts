// @vitest-environment node
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { MemoryDataRepository } from "./repositories/dataRepository.js";
import { ArtilearnService } from "./services/artilearnService.js";

function testAgent() {
  const agent = request.agent(createApp(new ArtilearnService(new MemoryDataRepository())));
  return { agent, signIn: () => agent.post("/api/session/demo").expect(200) };
}

describe("Artilearn API", () => {
  it("protects private routes and returns a traceable error", async () => {
    const response = await request(createApp(new ArtilearnService(new MemoryDataRepository())))
      .get("/api/notebooks").expect(401);
    expect(response.body.error).toMatchObject({ code: "authentication_required", message: "Sign in to continue." });
    expect(response.body.error.requestId).toBeTruthy();
  });

  it("supports notebook CRUD and unlinks retained materials on deletion", async () => {
    const { agent, signIn } = testAgent(); await signIn();
    const notebook = (await agent.post("/api/notebooks").send({ title: "Algorithms", subject: "CS" }).expect(201)).body;
    const material = (await agent.post("/api/materials")
      .field("title", "Lecture notes").field("notebookId", notebook.id)
      .attach("file", Buffer.from("%PDF-1.7 test"), { filename: "notes.pdf", contentType: "application/pdf" }).expect(201)).body;
    expect(material.notebookId).toBe(notebook.id);
    const deletion = await agent.delete(`/api/notebooks/${notebook.id}`).expect(200);
    expect(deletion.body.unlinkedMaterials).toBe(1);
    const retained = await agent.get(`/api/materials/${material.id}`).expect(200);
    expect(retained.body.notebookId).toBeUndefined();
  });

  it("rejects disguised uploads using type, extension, and file signature", async () => {
    const { agent, signIn } = testAgent(); await signIn();
    const response = await agent.post("/api/materials")
      .attach("file", Buffer.from("not a pdf"), { filename: "unsafe.pdf", contentType: "application/pdf" }).expect(415);
    expect(response.body.error.code).toBe("unsupported_file");
  });

  it("keeps answer keys private until submission and scores on the server", async () => {
    const { agent, signIn } = testAgent(); await signIn();
    const assessment = (await agent.post("/api/assessments").send({ title: "Study check" }).expect(201)).body;
    expect(assessment.questions[0].correctOptionIndex).toBeUndefined();
    const answers = Object.fromEntries(assessment.questions.map((question: { id: string }, index: number) => [question.id, [1, 2, 2][index]]));
    const result = await agent.post(`/api/assessments/${assessment.id}/attempts`).send({ answers }).expect(201);
    expect(result.body.attempt.score).toBe(100);
    expect(result.body.assessment.questions[0].explanation).toBeTruthy();
    const persistedResult = await agent.get(`/api/attempts/${result.body.attempt.id}`).expect(200);
    expect(persistedResult.body.attempt.score).toBe(100);
  });

  it("computes progress from persisted activity rather than placeholder totals", async () => {
    const { agent, signIn } = testAgent(); await signIn();
    await agent.post("/api/notebooks").send({ title: "Physics" }).expect(201);
    await agent.post("/api/messages").send({ content: "Explain momentum" }).expect(201);
    const progress = await agent.get("/api/progress").expect(200);
    expect(progress.body).toMatchObject({ completedActivities: 2, notebooksCreated: 1 });
    expect(progress.body.recentActivity).toHaveLength(2);
  });
});
