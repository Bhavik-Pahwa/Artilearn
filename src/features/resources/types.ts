export type ResourceProviderId = "fresources";

export type InstitutionEntryPoint = {
  id: string;
  providerId: ResourceProviderId;
  institution: "DTU" | "IGDTUW" | "IIIT-Delhi" | "NSUT";
  title: string;
  canonicalUrl: string;
  kind: "institution-entry-point";
  verifiedOn: string;
};

export type ResourceProviderStatus = {
  providerId: ResourceProviderId;
  status: "ready" | "degraded" | "unavailable";
  checkedOn: string;
  mode: "verified-entry-points";
};

export type ResourceDirectory = {
  entries: InstitutionEntryPoint[];
  status: ResourceProviderStatus;
};
