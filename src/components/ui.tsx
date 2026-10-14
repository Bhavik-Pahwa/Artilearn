import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action}</header>;
}

export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="empty-state" role="status"><span className="empty-orbit" aria-hidden="true">✦</span><h2>{title}</h2><p>{children}</p>{action}</div>;
}

export function AsyncState({ loading, error, children }: { loading: boolean; error: string; children: ReactNode }) {
  if (loading) return <div className="loading-block" role="status"><span className="spinner" /> Loading…</div>;
  if (error) return <div className="error-banner" role="alert">{error}</div>;
  return children;
}

export function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
  return <label className="field"><span>{label}</span>{children}{error && <small className="field-error">{error}</small>}</label>;
}

export function StatusMessage({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="status-message" role="status">{children}</p>;
}
