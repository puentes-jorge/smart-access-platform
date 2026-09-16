"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
    if (!response.ok) { setError("Correo o contraseña incorrectos."); setLoading(false); return; }
    router.replace("/app"); router.refresh();
  }

  return <main className="login-page">
    <section className="login-visual"><div><strong>SMART ACCESS</strong><h1>Control, seguridad y automatización.</h1><p>Administra residentes, invitados, puertas, amenidades, incidentes y dispositivos desde una plataforma centralizada.</p></div><small>Access Control as a Service</small></section>
    <section className="login-form-wrap"><form className="login-card" onSubmit={submit}><h2>Iniciar sesión</h2><p className="muted">Ingresa al panel de administración.</p><div className="field"><label htmlFor="email">Correo</label><input id="email" name="email" type="email" defaultValue="admin@smartaccess.local" required /></div><div className="field"><label htmlFor="password">Contraseña</label><input id="password" name="password" type="password" required /></div>{error && <div className="error" role="alert">{error}</div>}<button className="primary" disabled={loading}>{loading ? "Validando…" : "Ingresar"}</button></form></section>
  </main>;
}
