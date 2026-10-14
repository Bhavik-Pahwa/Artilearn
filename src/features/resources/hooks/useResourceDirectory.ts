import { useCallback, useEffect, useState } from "react";
import type { ResourceProvider } from "../providers/resourceProvider";
import type { ResourceDirectory } from "../types";

type DirectoryState =
  | { kind: "loading" }
  | { kind: "ready"; directory: ResourceDirectory }
  | { kind: "error"; message: string };

export function useResourceDirectory(provider: ResourceProvider) {
  const [state, setState] = useState<DirectoryState>({ kind: "loading" });
  const [requestKey, setRequestKey] = useState(0);

  const retry = useCallback(() => {
    setState({ kind: "loading" });
    setRequestKey((key) => key + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    provider
      .getDirectory(controller.signal)
      .then((directory) => setState({ kind: "ready", directory }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setState({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Fresources is temporarily unavailable.",
        });
      });

    return () => controller.abort();
  }, [provider, requestKey]);

  return { state, retry };
}
