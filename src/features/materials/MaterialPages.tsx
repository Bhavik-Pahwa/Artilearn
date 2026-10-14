import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AsyncState, EmptyState, Field, PageHeader, StatusMessage } from "../../components/ui";
import { useApiResource } from "../../hooks/useApiResource";
import { api } from "../../lib/api";
import { formatBytes, formatDateTime } from "../../shared/format";
import { MAX_MATERIAL_SIZE_BYTES, type Material, type Notebook } from "../../shared/domain";
import { routes } from "../../shared/routes";

export function MaterialsPage() {
  const resource = useApiResource<Material[]>("/materials", []);
  return <><PageHeader eyebrow="Your source library" title="Materials" description="Private uploads remain available only through your signed-in workspace." action={<Link className="primary-button" to={routes.materialUpload}>Upload material</Link>} />
    <AsyncState loading={resource.loading} error={resource.error}>{resource.data.length ? <div className="card-grid">{resource.data.map((material) => <Link className="entity-card" to={routes.material(material.id)} key={material.id}><span className="file-pill">{material.originalFilename.split(".").pop()?.toUpperCase()}</span><h2>{material.title}</h2><p>{material.originalFilename}</p><span className="card-meta">{formatBytes(material.sizeBytes)} · {formatDateTime(material.createdAt)}</span></Link>)}</div> : <EmptyState title="No materials yet" action={<Link className="primary-button" to={routes.materialUpload}>Upload your first file</Link>}>Add a PDF, DOCX, or PPTX to start building your library.</EmptyState>}</AsyncState>
  </>;
}

export function MaterialUploadPage() {
  const [params] = useSearchParams(); const navigate = useNavigate();
  const notebooks = useApiResource<Notebook[]>("/notebooks", []);
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget); const file = form.get("file") as File;
    if (!file?.size) { setMessage("Choose a file to upload."); setBusy(false); return; }
    if (file.size > MAX_MATERIAL_SIZE_BYTES) { setMessage("Files must be 8 MB or smaller."); setBusy(false); return; }
    try { const material = await api<Material>("/materials", { method: "POST", body: form }); navigate(routes.material(material.id)); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "Upload failed."); setBusy(false); }
  }
  return <><PageHeader eyebrow="Add study context" title="Upload material" description="Accepted: PDF, DOCX, PPTX. Maximum file size: 8 MB." /><form className="panel stack-form upload-form" onSubmit={submit}>
    <Field label="File"><input name="file" type="file" required accept=".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation" /></Field>
    <Field label="Display title"><input name="title" maxLength={100} placeholder="Defaults to the filename" /></Field>
    <Field label="Notebook (optional)"><select name="notebookId" defaultValue={params.get("notebook") ?? ""}><option value="">Unfiled</option>{notebooks.data.map((notebook) => <option key={notebook.id} value={notebook.id}>{notebook.title}</option>)}</select></Field>
    <p className="privacy-note">Files are stored privately and served only after authorization. Do not upload content you do not have permission to use.</p>
    <button className="primary-button" disabled={busy}>{busy ? "Uploading…" : "Upload material"}</button><StatusMessage>{message}</StatusMessage>
  </form></>;
}

export function MaterialDetailPage() {
  const { id = "" } = useParams(); const navigate = useNavigate();
  const resource = useApiResource<Material>(`/materials/${id}`, {} as Material);
  async function remove() { if (!window.confirm("Permanently delete this uploaded material?")) return; await api(`/materials/${id}`, { method: "DELETE" }); navigate(routes.materials); }
  const material = resource.data;
  return <AsyncState loading={resource.loading} error={resource.error}><PageHeader eyebrow="Study material" title={material.title} description={material.originalFilename} action={<div className="button-row"><a className="primary-button" href={`/api/materials/${id}/download`}>Download</a><button className="danger-button" onClick={remove}>Delete</button></div>} /><section className="panel detail-list"><div><span>File type</span><strong>{material.mimeType}</strong></div><div><span>Size</span><strong>{formatBytes(material.sizeBytes)}</strong></div><div><span>Uploaded</span><strong>{formatDateTime(material.createdAt)}</strong></div><div><span>Status</span><strong className="success-text">Ready</strong></div></section></AsyncState>;
}
