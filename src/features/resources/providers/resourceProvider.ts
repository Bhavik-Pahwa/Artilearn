import type { ResourceDirectory } from "../types";

export interface ResourceProvider {
  getDirectory(signal?: AbortSignal): Promise<ResourceDirectory>;
}
