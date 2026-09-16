import type { ModuleData } from "@/lib/data/types";

function statusClass(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("offline") || lower.includes("suspend") || lower.includes("critical") || lower.includes("cancelad")) return "status danger";
  if (lower.includes("pending") || lower.includes("pendiente") || lower.includes("battery") || lower.includes("paused") || lower.includes("pausad") || lower.includes("deposit") || lower.includes("reserved") || lower.includes("alerta")) return "status warning";
  return "status";
}

export function ModuleView({ data }: { data: ModuleData }) {
  return <div className="page"><div className="page-head"><div><h1>{data.title}</h1><p>{data.subtitle}</p></div><div className="actions"><button className="secondary">Exportar</button><button className="primary">{data.action}</button></div></div>
    {data.metrics && <div className="metrics">{data.metrics.map(metric => <div className="metric" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}</small></div>)}</div>}
    <section className="card"><div className="toolbar"><input aria-label="Buscar" placeholder="Buscar o filtrar registros"/><select aria-label="Filtrar estado"><option>Todos los estados</option><option>Activos</option><option>Pendientes</option></select></div><div className="table-wrap">{data.rows.length === 0 ? <p className="muted" style={{padding: 24}}>{data.empty ?? "Sin registros todavía."}</p> : <table className="data-table"><thead><tr>{data.columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{data.rows.map((row,index) => <tr key={index}>{row.map((cell,cellIndex) => <td key={cellIndex}>{cellIndex === row.length - 1 ? <span className={statusClass(cell)}><i className="dot"/>{cell}</span> : cell}</td>)}</tr>)}</tbody></table>}</div></section>
  </div>;
}
