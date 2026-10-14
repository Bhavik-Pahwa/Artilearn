import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

export function useApiResource<T>(path: string, initial: T) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setData(await api<T>(path)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load data."); }
    finally { setLoading(false); }
  }, [path]);
  useEffect(() => {
    let active = true;
    api<T>(path).then((result) => { if (active) setData(result); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load data."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path]);
  return { data, setData, loading, error, reload: load };
}
