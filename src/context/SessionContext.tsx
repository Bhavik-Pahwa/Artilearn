import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { SessionResponse } from "../shared/domain";
import { api } from "../lib/api";

type SessionContextValue = SessionResponse & {
  loading: boolean;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  refresh(): Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionResponse>({ authenticated: false });
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try { setSession(await api<SessionResponse>("/session")); }
    finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, []);

  async function signIn() {
    setSession(await api<SessionResponse>("/session/demo", { method: "POST" }));
  }

  async function signOut() {
    await api("/session", { method: "DELETE" });
    setSession({ authenticated: false });
  }

  return <SessionContext.Provider value={{ ...session, loading, signIn, signOut, refresh }}>{children}</SessionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
