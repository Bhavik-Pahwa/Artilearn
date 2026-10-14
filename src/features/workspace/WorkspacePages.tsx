import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AsyncState, EmptyState, Field, PageHeader, StatusMessage } from "../../components/ui";
import { useApiResource } from "../../hooks/useApiResource";
import { api, jsonBody } from "../../lib/api";
import type { Message, Notebook, ProgressSummary } from "../../shared/domain";
import { formatDateTime } from "../../shared/format";
import { routes } from "../../shared/routes";

export function WorkspacePage() {
  const [params] = useSearchParams();
  const initialNotebook = params.get("notebook") ?? "";
  const notebooks = useApiResource<Notebook[]>("/notebooks", []);
  const progress = useApiResource<ProgressSummary>("/progress", { completedActivities: 0, assessmentAttempts: 0, materialsUploaded: 0, notebooksCreated: 0, recentActivity: [] });
  const [selected, setSelected] = useState(initialNotebook);
  const messages = useApiResource<Message[]>(`/messages${selected ? `?notebookId=${encodeURIComponent(selected)}` : ""}`, []);
  const [content, setContent] = useState(""); const [status, setStatus] = useState("");
  async function send(event: FormEvent) {
    event.preventDefault(); setStatus("");
    try { const added = await api<Message[]>("/messages", { method: "POST", ...jsonBody({ content, notebookId: selected || undefined }) }); messages.setData([...messages.data, ...added]); setContent(""); }
    catch (reason) { setStatus(reason instanceof Error ? reason.message : "Unable to send message."); }
  }
  return <><PageHeader eyebrow="Your learning desk" title="Make the next step smaller." description="Bring a question, connect a notebook, and work forward from what you know." />
    <div className="workspace-dashboard">
      <aside className="panel notebook-rail"><div className="section-heading"><h2>Notebooks</h2><Link to={routes.notebooks}>Manage</Link></div>{notebooks.data.length ? notebooks.data.map((notebook) => <button key={notebook.id} className={selected === notebook.id ? "notebook-chip active" : "notebook-chip"} onClick={() => setSelected(notebook.id)}><strong>{notebook.title}</strong><span>{notebook.subject || "General"}</span></button>) : <p className="muted-copy">Create a notebook to connect context.</p>}</aside>
      <section className="panel conversation-panel"><div className="section-heading"><div><p className="eyebrow">Study assistant</p><h2>{selected ? notebooks.data.find((item) => item.id === selected)?.title ?? "Conversation" : "General conversation"}</h2></div><span className="demo-badge">Demo responses</span></div>
        <AsyncState loading={messages.loading} error={messages.error}>{messages.data.length ? <div className="message-list" aria-live="polite">{messages.data.map((message) => <article className={`message ${message.role}`} key={message.id}><strong>{message.role === "assistant" ? "Artilearn" : "You"}</strong><p>{message.content}</p></article>)}</div> : <EmptyState title="Ask your first question">Try asking for a concept breakdown or a study plan. Responses are deterministic demos, not a live AI model.</EmptyState>}</AsyncState>
        <form className="composer" onSubmit={send}><label htmlFor="assistant-message" className="sr-only">Message</label><textarea id="assistant-message" required maxLength={2000} value={content} onChange={(event) => setContent(event.target.value)} placeholder="What would you like to understand?" /><button className="primary-button">Send</button></form><StatusMessage>{status}</StatusMessage>
      </section>
      <aside className="panel progress-rail"><p className="eyebrow">Momentum</p><strong className="big-number">{progress.data.completedActivities}</strong><span>recorded learning actions</span><div className="mini-stat"><strong>{progress.data.materialsUploaded}</strong><span>materials</span></div><div className="mini-stat"><strong>{progress.data.assessmentAttempts}</strong><span>quizzes complete</span></div><Link className="text-button" to={routes.progress}>View progress</Link></aside>
    </div>
  </>;
}

export function TutorPage() {
  const [params] = useSearchParams(); const notebooks = useApiResource<Notebook[]>("/notebooks", []);
  const [result, setResult] = useState<{ steps: string[] } | null>(null); const [status, setStatus] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); setStatus(""); try { setResult(await api("/tutor/sessions", { method: "POST", ...jsonBody({ topic: form.get("topic"), notebookId: form.get("notebookId") || undefined }) })); } catch (reason) { setStatus(reason instanceof Error ? reason.message : "Unable to start tutor."); } }
  return <><PageHeader eyebrow="Guided learning" title="Tutor mode" description="Turn a topic into a short sequence of active learning prompts." /><div className="split-layout"><form className="panel stack-form" onSubmit={submit}><span className="demo-badge">Demo guidance</span><Field label="What are you studying?"><input name="topic" required maxLength={120} placeholder="e.g. Binary search trees" /></Field><Field label="Notebook (optional)"><select name="notebookId" defaultValue={params.get("notebook") ?? ""}><option value="">No notebook</option>{notebooks.data.map((notebook) => <option value={notebook.id} key={notebook.id}>{notebook.title}</option>)}</select></Field><button className="primary-button">Build guided session</button><StatusMessage>{status}</StatusMessage></form><section className="panel">{result ? <><p className="eyebrow">Your session</p><ol className="step-list">{result.steps.map((step) => <li key={step}>{step}</li>)}</ol><p className="privacy-note">This is a deterministic product demo, not a live AI tutor.</p></> : <EmptyState title="A path appears here">Choose a topic to generate three guided study steps.</EmptyState>}</section></div></>;
}

export function ProgressPage() {
  const resource = useApiResource<ProgressSummary>("/progress", { completedActivities: 0, assessmentAttempts: 0, materialsUploaded: 0, notebooksCreated: 0, recentActivity: [] });
  return <><PageHeader eyebrow="Based on real activity" title="Progress" description="These totals come from actions recorded in your workspace, not placeholder percentages." /><AsyncState loading={resource.loading} error={resource.error}><div className="stat-grid"><div><strong>{resource.data.completedActivities}</strong><span>Learning actions</span></div><div><strong>{resource.data.notebooksCreated}</strong><span>Notebooks</span></div><div><strong>{resource.data.materialsUploaded}</strong><span>Materials</span></div><div><strong>{resource.data.assessmentAttempts}</strong><span>Quizzes</span></div></div><section className="panel"><h2>Recent activity</h2>{resource.data.recentActivity.length ? <div className="activity-list">{resource.data.recentActivity.map((event) => <div key={event.id}><span className="activity-dot" /><div><strong>{event.eventType.replaceAll("_", " ")}</strong><small>{formatDateTime(event.occurredAt)}</small></div></div>)}</div> : <p className="muted-copy">Your activity history will grow as you study.</p>}</section></AsyncState></>;
}
