import { useResourceDirectory } from "../hooks/useResourceDirectory";
import {
  FRESOURCES_DASHBOARD_URL,
  FRESOURCES_HOME_URL,
  FRESOURCES_TERMS_URL,
  isAllowedFresourcesUrl,
} from "../providers/fresourcesProvider";
import type { ResourceProvider } from "../providers/resourceProvider";
import type { InstitutionEntryPoint } from "../types";
import { ExternalLinkIcon } from "./ExternalLinkIcon";

type ResourcesPanelProps = {
  provider: ResourceProvider;
  hideHeader?: boolean;
};

function ExternalLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (!isAllowedFresourcesUrl(href)) {
    return null;
  }

  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noopener noreferrer external"
    >
      {children}
      <ExternalLinkIcon />
    </a>
  );
}

function InstitutionCard({ entry }: { entry: InstitutionEntryPoint }) {
  return (
    <article className="institution-card">
      <div className="institution-monogram" aria-hidden="true">
        {entry.institution.slice(0, 2)}
      </div>
      <div className="institution-card-copy">
        <p className="provider-label">Source: Fresources</p>
        <h3>{entry.institution}</h3>
        <p>
          Fresources publicly lists this institution. Its detailed catalogue requires
          continuing on the provider website.
        </p>
        <ExternalLink href={entry.canonicalUrl} className="card-link">
          Open on Fresources
        </ExternalLink>
      </div>
    </article>
  );
}

export function ResourcesPanel({ provider, hideHeader = false }: ResourcesPanelProps) {
  const { state, retry } = useResourceDirectory(provider);

  return (
    <aside className="resources-panel" aria-labelledby="resources-title">
      {!hideHeader && <div className="panel-heading">
        <p className="eyebrow">External directory</p>
        <h2 id="resources-title">Study Resources</h2>
        <p>
          Browse verified institution entry points. Resources open on Fresources and
          may require you to sign in there.
        </p>
      </div>}

      <div className="provider-notice">
        <span className="provider-dot" aria-hidden="true" />
        <div>
          <strong>Verified links only</strong>
          <span>No files are copied, embedded, or hosted by Artilearn.</span>
        </div>
      </div>

      {state.kind === "loading" && (
        <div className="state-card" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <strong>Loading resource directory…</strong>
          <span>Checking Artilearn's verified provider index.</span>
        </div>
      )}

      {state.kind === "error" && (
        <div className="state-card error-state" role="alert">
          <strong>Fresources is temporarily unavailable.</strong>
          <span>You can try again or open the provider website directly.</span>
          <div className="state-actions">
            <button type="button" onClick={retry}>Try again</button>
            <ExternalLink href={FRESOURCES_HOME_URL} className="text-link">
              Open provider website
            </ExternalLink>
          </div>
        </div>
      )}

      {state.kind === "ready" && state.directory.entries.length === 0 && (
        <div className="state-card" role="status">
          <strong>No verified entry points are available.</strong>
          <span>Use the provider link below to continue on Fresources.</span>
        </div>
      )}

      {state.kind === "ready" && state.directory.entries.length > 0 && (
        <div className="institution-list" aria-label="Verified institution entry points">
          {state.directory.entries.map((entry) => (
            <InstitutionCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      <div className="panel-footer">
        <ExternalLink href={FRESOURCES_DASHBOARD_URL} className="primary-link">
          Browse all resources on Fresources
        </ExternalLink>
        <ExternalLink href={FRESOURCES_TERMS_URL} className="terms-link">
          Provider terms
        </ExternalLink>
        <p>Independent directory link. Artilearn is not affiliated with Fresources.</p>
      </div>
    </aside>
  );
}
