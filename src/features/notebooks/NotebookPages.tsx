import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, jsonBody } from "../../lib/api";
import { useApiResource } from "../../hooks/useApiResource";
import type { Material, Notebook } from "../../shared/domain";
import { routes } from "../../shared/routes";
import { AsyncState, EmptyState, Field, PageHeader, StatusMessage } from "../../components/ui";

const emptyForm = { title: "", subject: "", description: "" };

export function NotebooksPage() {
  const { data, setData, loading, error } = useApiResource<Notebook[]>("/notebooks", []);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setMessage("");
    try {
      const notebook = await api<Notebook>("/notebooks", { method: "POST", ...jsonBody(form) });
      setData([notebook, ...data]); setForm(emptyForm); setMessage("Notebook created.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Unable to create notebook."); }
  }
  return <>
    <PageHeader eyebrow="Organise your learning" title="Notebooks" description="Keep materials, conversations, and practice grouped by subject." />
    <div className="split-layout">
      <section className="panel"><h2>Create a notebook</h2><form className="stack-form" onSubmit={submit}>
        <Field label="Title"><input required maxLength={80} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Data structures" /></Field>
        <Field label="Subject"><input maxLength={60} value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Computer science" /></Field>
        <Field label="Description"><textarea maxLength={300} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
        <button className="primary-button" type="submit">Create notebook</button><StatusMessage>{message}</StatusMessage>
      </form></section>
      <section><AsyncState loading={loading} error={error}>{data.length ? <div className="card-grid">{data.map((notebook) => <Link className="entity-card" to={routes.notebook(notebook.id)} key={notebook.id}><span className="card-kicker">{notebook.subject || "General"}</span><h2>{notebook.title}</h2><p>{notebook.description || "Ready for your materials and questions."}</p><span className="card-cta">Open notebook →</span></Link>)}</div> : <EmptyState title="Your first notebook starts here">Create one to give your study materials a durable home.</EmptyState>}</AsyncState></section>
    </div>
  </>;
}

export function NotebookDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const notebookResource = useApiResource<Notebook>(`/notebooks/${id}`, {} as Notebook);
  const materials = useApiResource<Material[]>(`/materials?notebookId=${encodeURIComponent(id)}`, []);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const notebook = notebookResource.data;
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    try {
      const updated = await api<Notebook>(`/notebooks/${id}`, { method: "PUT", ...jsonBody({ title: values.get("title"), subject: values.get("subject"), description: values.get("description") }) });
      notebookResource.setData(updated); setEditing(false); setMessage("Changes saved.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Unable to save changes."); }
  }
  async function remove() {
    if (!window.confirm("Delete this notebook? Its materials will stay in your library.")) return;
    await api(`/notebooks/${id}`, { method: "DELETE" }); navigate(routes.notebooks);
  }
  return <AsyncState loading={notebookResource.loading} error={notebookResource.error}>
    <PageHeader eyebrow={notebook.subject || "Notebook"} title={notebook.title} description={notebook.description || "Add study materials or ask a focused question."} action={<div className="button-row"><button className="secondary-button" onClick={() => setEditing(!editing)}>Edit</button><button className="danger-button" onClick={remove}>Delete</button></div>} />
    <StatusMessage>{message}</StatusMessage>
    {editing && <form className="panel stack-form compact-form" onSubmit={save}><Field label="Title"><input name="title" required defaultValue={notebook.title} /></Field><Field label="Subject"><input name="subject" defaultValue={notebook.subject} /></Field><Field label="Description"><textarea name="description" defaultValue={notebook.description} /></Field><button className="primary-button">Save changes</button></form>}
    <div className="dashboard-grid">
      <section className="panel span-two"><div className="section-heading"><div><p className="eyebrow">Connected context</p><h2>Materials</h2></div><Link className="text-button" to={`${routes.materialUpload}?notebook=${id}`}>Upload material</Link></div>
        <AsyncState loading={materials.loading} error={materials.error}>{materials.data.length ? <div className="simple-list">{materials.data.map((material) => <Link to={routes.material(material.id)} key={material.id}><span>{material.title}</span><small>{material.originalFilename}</small></Link>)}</div> : <p className="muted-copy">No material is connected yet.</p>}</AsyncState>
      </section>
      <section className="panel"><p className="eyebrow">Next action</p><h2>Study this notebook</h2><div className="vertical-actions"><Link className="primary-button" to={`${routes.home}?notebook=${id}`}>Ask the assistant</Link><Link className="secondary-button" to={`${routes.quizNew}?notebook=${id}`}>Create a quiz</Link><Link className="secondary-button" to={`${routes.tutor}?notebook=${id}`}>Start tutor</Link></div></section>
    </div>
  </AsyncState>;
}
