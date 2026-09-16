import { notFound } from "next/navigation";
import { ModuleView } from "@/components/module-view";
import { getModuleData } from "@/lib/data/modules";

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const data = await getModuleData(module);
  if (!data) notFound();
  return <ModuleView data={data}/>;
}
