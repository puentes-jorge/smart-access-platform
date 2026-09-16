"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { RecordsTable } from "./records-table";

const ROLES = [
  { value: "PROPERTY_MANAGER", label: "Property manager" },
  { value: "SECURITY_SUPERVISOR", label: "Security supervisor" },
  { value: "SECURITY_GUARD", label: "Security guard" },
  { value: "TECHNICIAN", label: "Technician" },
  { value: "RESIDENT", label: "Resident" },
  { value: "PLATFORM_OWNER", label: "Platform owner" }
];

export function UsersView({ columns, rows, empty }: { columns: string[]; rows: string[][]; empty: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = event.currentTarget;
    const values = new FormData(form);
    const body = {
      name: values.get("name"),
      email: values.get("email"),
      password: values.get("password"),
      role: values.get("role")
    };

    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "No se pudo crear el usuario.");
      setLoading(false);
      return;
    }

    setLoading(false);
    setOpen(false);
    form.reset();
    router.refresh();
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Usuarios</h1>
          <p>Cuentas con acceso al panel administrativo</p>
        </div>
        <div className="actions">
          <button className="primary" onClick={() => setOpen((v) => !v)}>
            {open ? "Cancelar" : "Agregar usuario"}
          </button>
        </div>
      </div>

      {open && (
        <section className="card" style={{ marginBottom: 14 }}>
          <form onSubmit={submit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="field">
                <label htmlFor="name">Nombre</label>
                <input id="name" name="name" required />
              </div>
              <div className="field">
                <label htmlFor="email">Correo</label>
                <input id="email" name="email" type="email" required />
              </div>
              <div className="field">
                <label htmlFor="password">Contraseña</label>
                <input id="password" name="password" type="password" minLength={8} required />
              </div>
              <div className="field">
                <label htmlFor="role">Rol</label>
                <select id="role" name="role" defaultValue="PROPERTY_MANAGER">
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {error && (
              <div className="error" role="alert" style={{ marginTop: 12 }}>
                {error}
              </div>
            )}
            <button className="primary" disabled={loading} style={{ marginTop: 16 }}>
              {loading ? "Guardando…" : "Guardar usuario"}
            </button>
          </form>
        </section>
      )}

      <section className="card">
        <RecordsTable columns={columns} rows={rows} empty={empty} />
      </section>
    </div>
  );
}
