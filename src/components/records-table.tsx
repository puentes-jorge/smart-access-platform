function statusClass(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("offline") || lower.includes("suspend") || lower.includes("critical") || lower.includes("cancelad")) return "status danger";
  if (lower.includes("pending") || lower.includes("pendiente") || lower.includes("battery") || lower.includes("paused") || lower.includes("pausad") || lower.includes("deposit") || lower.includes("reserved") || lower.includes("alerta")) return "status warning";
  return "status";
}

export function RecordsTable({ columns, rows, empty }: { columns: string[]; rows: string[][]; empty?: string }) {
  return <>
    <div className="toolbar"><input aria-label="Buscar" placeholder="Buscar o filtrar registros"/><select aria-label="Filtrar estado"><option>Todos los estados</option><option>Activos</option><option>Pendientes</option></select></div>
    <div className="table-wrap">{rows.length === 0 ? <p className="muted" style={{padding: 24}}>{empty ?? "Sin registros todavía."}</p> : <table className="data-table"><thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row,index) => <tr key={index}>{row.map((cell,cellIndex) => <td key={cellIndex}>{cellIndex === row.length - 1 ? <span className={statusClass(cell)}><i className="dot"/>{cell}</span> : cell}</td>)}</tr>)}</tbody></table>}</div>
  </>;
}
