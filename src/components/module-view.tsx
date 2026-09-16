import type { ModuleData } from "@/lib/data/types";
import { RecordsTable } from "./records-table";

export function ModuleView({ data }: { data: ModuleData }) {
  return <div className="page"><div className="page-head"><div><h1>{data.title}</h1><p>{data.subtitle}</p></div><div className="actions"><button className="secondary">Exportar</button><button className="primary">{data.action}</button></div></div>
    {data.metrics && <div className="metrics">{data.metrics.map(metric => <div className="metric" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}</small></div>)}</div>}
    <section className="card"><RecordsTable columns={data.columns} rows={data.rows} empty={data.empty}/></section>
  </div>;
}
