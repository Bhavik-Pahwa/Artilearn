import { describe, expect, it } from "vitest";
import {
  FRESOURCES_DASHBOARD_URL,
  createFresourcesProvider,
  isAllowedFresourcesUrl,
  mapInstitutionEntries,
} from "./fresourcesProvider";

describe("Fresources provider mapping", () => {
  it("accepts only canonical HTTPS URLs on the configured provider host", () => {
    expect(isAllowedFresourcesUrl("https://fresources.tech/dashboard")).toBe(true);
    expect(isAllowedFresourcesUrl("http://fresources.tech/dashboard")).toBe(false);
    expect(isAllowedFresourcesUrl("https://fresources.tech.evil.example/dashboard")).toBe(false);
    expect(isAllowedFresourcesUrl("https://user@fresources.tech/dashboard")).toBe(false);
    expect(isAllowedFresourcesUrl("not-a-url")).toBe(false);
  });

  it("maps verified entry points and removes duplicate IDs and unsafe URLs", () => {
    const entries = mapInstitutionEntries([
      {
        id: "dtu",
        institution: "DTU",
        title: "DTU resource entry point",
        canonicalUrl: FRESOURCES_DASHBOARD_URL,
      },
      {
        id: "dtu",
        institution: "DTU",
        title: "Duplicate DTU entry",
        canonicalUrl: FRESOURCES_DASHBOARD_URL,
      },
      {
        id: "unsafe",
        institution: "NSUT",
        title: "Unsafe entry",
        canonicalUrl: "https://example.com/resources",
      },
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: "dtu",
      providerId: "fresources",
      institution: "DTU",
      kind: "institution-entry-point",
    });
  });

  it("returns the four verified public institution entry points", async () => {
    const directory = await createFresourcesProvider().getDirectory();

    expect(directory.entries.map((entry) => entry.institution)).toEqual([
      "DTU",
      "IGDTUW",
      "IIIT-Delhi",
      "NSUT",
    ]);
    expect(directory.entries.every((entry) => entry.canonicalUrl === FRESOURCES_DASHBOARD_URL)).toBe(true);
    expect(directory.status).toMatchObject({
      status: "ready",
      mode: "verified-entry-points",
    });
  });
});
