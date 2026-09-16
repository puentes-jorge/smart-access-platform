import { ResidentsView } from "@/components/residents-view";
import { getResidentsModule } from "@/lib/data/modules";

export default async function ResidentsPage() {
  const data = await getResidentsModule();
  return <ResidentsView data={data} />;
}
