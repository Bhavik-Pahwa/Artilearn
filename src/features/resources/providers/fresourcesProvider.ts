import type { InstitutionEntryPoint, ResourceDirectory } from "../types";
import type { ResourceProvider } from "./resourceProvider";

export const FRESOURCES_HOME_URL = "https://fresources.tech/home";
export const FRESOURCES_DASHBOARD_URL = "https://fresources.tech/dashboard";
export const FRESOURCES_TERMS_URL = "https://fresources.tech/terms";
export const DIRECTORY_VERIFIED_ON = "2026-10-14";

const ALLOWED_HOST = "fresources.tech";

type RawInstitutionEntry = {
  id: string;
  institution: InstitutionEntryPoint["institution"];
  title: string;
  canonicalUrl: string;
};

const verifiedInstitutionEntries: RawInstitutionEntry[] = [
  {
    id: "fresources-dtu",
    institution: "DTU",
    title: "DTU resource entry point",
    canonicalUrl: FRESOURCES_DASHBOARD_URL,
  },
  {
    id: "fresources-igdtuw",
    institution: "IGDTUW",
    title: "IGDTUW resource entry point",
    canonicalUrl: FRESOURCES_DASHBOARD_URL,
  },
  {
    id: "fresources-iiit-delhi",
    institution: "IIIT-Delhi",
    title: "IIIT-Delhi resource entry point",
    canonicalUrl: FRESOURCES_DASHBOARD_URL,
  },
  {
    id: "fresources-nsut",
    institution: "NSUT",
    title: "NSUT resource entry point",
    canonicalUrl: FRESOURCES_DASHBOARD_URL,
  },
];

export function isAllowedFresourcesUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === ALLOWED_HOST &&
      url.username === "" &&
      url.password === "" &&
      url.port === ""
    );
  } catch {
    return false;
  }
}

export function mapInstitutionEntries(
  rawEntries: RawInstitutionEntry[],
): InstitutionEntryPoint[] {
  const seenIds = new Set<string>();

  return rawEntries.flatMap((entry) => {
    if (seenIds.has(entry.id) || !isAllowedFresourcesUrl(entry.canonicalUrl)) {
      return [];
    }

    seenIds.add(entry.id);
    return [
      {
        ...entry,
        providerId: "fresources" as const,
        kind: "institution-entry-point" as const,
        verifiedOn: DIRECTORY_VERIFIED_ON,
      },
    ];
  });
}

export function createFresourcesProvider(
  entries: RawInstitutionEntry[] = verifiedInstitutionEntries,
): ResourceProvider {
  return {
    async getDirectory(signal?: AbortSignal): Promise<ResourceDirectory> {
      if (signal?.aborted) {
        throw new DOMException("The request was cancelled.", "AbortError");
      }

      return {
        entries: mapInstitutionEntries(entries),
        status: {
          providerId: "fresources",
          status: "ready",
          checkedOn: DIRECTORY_VERIFIED_ON,
          mode: "verified-entry-points",
        },
      };
    },
  };
}

export const fresourcesProvider = createFresourcesProvider();
