import { useState, type FormEvent } from "react";
import { Field, PageHeader, StatusMessage } from "../../components/ui";
import { useSession } from "../../context/SessionContext";
import { api, jsonBody } from "../../lib/api";
import type { User } from "../../shared/domain";

export function SettingsPage() {
  const session = useSession(); const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); try { await api<User>("/profile", { method: "PATCH", ...jsonBody({ displayName: form.get("displayName"), email: form.get("email") }) }); await session.refresh(); setMessage("Profile updated."); } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Unable to update profile."); } }
  return <><PageHeader eyebrow="Account" title="Settings" description="Manage the profile shown within this local workspace." /><div className="split-layout"><form className="panel stack-form" onSubmit={submit}><h2>Profile</h2><Field label="Display name"><input name="displayName" required defaultValue={session.user?.displayName} /></Field><Field label="Email"><input name="email" type="email" required defaultValue={session.user?.email} /></Field><button className="primary-button">Save profile</button><StatusMessage>{message}</StatusMessage></form><section className="panel"><h2>Session</h2><p className="muted-copy">This implementation uses a local demo identity and an HTTP-only session cookie. Replace the session adapter with your production identity provider before deployment.</p><button className="secondary-button" onClick={session.signOut}>Sign out</button></section></div></>;
}
