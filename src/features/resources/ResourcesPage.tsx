import { PageHeader } from "../../components/ui";
import { ResourcesPanel } from "./components/ResourcesPanel";
import { fresourcesProvider } from "./providers/fresourcesProvider";

export function ResourcesPage() {
  return <><PageHeader eyebrow="External directory" title="Study resources" description="Verified entry points open on Fresources and may require a separate sign-in. Artilearn does not copy, embed, or host provider content." /><ResourcesPanel provider={fresourcesProvider} hideHeader /></>;
}
