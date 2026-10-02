import Experience from "@/components/Experience";
import { engineMode } from "@/lib/engine";
import { loadMethodology, publicConfig } from "@/lib/methodology";

export const dynamic = "force-dynamic";

export default async function Page() {
  const m = await loadMethodology();
  return <Experience config={publicConfig(m)} mode={engineMode()} />;
}
