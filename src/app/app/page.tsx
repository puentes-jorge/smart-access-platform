import { icons } from "@/components/icons";
import { getDashboardData } from "@/lib/data/modules";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return <div className="page">
    <div className="page-head"><div><h1>Resumen de propiedad</h1><p>Estado operativo en tiempo real</p></div><button className="primary">Abrir consola de seguridad</button></div>
    <div className="metrics">{data.metrics.map(metric => <div className="metric" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small style={metric.warn ? {color:"var(--warn)"} : undefined}>{metric.detail}</small></div>)}</div>
    <div className="grid-two">
      <section className="card">
        <div className="card-head"><h2>Acceso en vivo</h2><span className="pill">Últimos eventos</span></div>
        {data.liveEvents.length === 0
          ? <p className="muted" style={{padding: 16}}>Todavía no hay eventos de acceso registrados.</p>
          : data.liveEvents.map((event, index) => <div className="event" key={index}><span>{event.time}</span><div><b>{event.who}</b><small>{event.where}</small></div><strong className={event.result === "Concedido" ? "granted" : "denied"}>{event.result}</strong></div>)}
      </section>
      <section className="card">
        <div className="card-head"><h2>Alertas</h2><span className="pill">{data.alerts.length} activas</span></div>
        {data.alerts.length === 0
          ? <p className="muted" style={{padding: 16}}>Sin alertas activas. Todo en orden.</p>
          : data.alerts.map((alert, index) => <div className="alert-item" key={index}><icons.alert size={18} color={alert.severity === "critical" ? "var(--bad)" : "var(--warn)"}/><div><strong>{alert.title}</strong><small>{alert.detail}</small></div></div>)}
      </section>
    </div>
  </div>;
}
