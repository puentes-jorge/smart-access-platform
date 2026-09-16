"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { ModuleData } from "@/lib/data/types";
import { RecordsTable } from "./records-table";

const PERSON_TYPES = [
  { value: "RESIDENT", label: "Residente" },
  { value: "HOUSEHOLD_MEMBER", label: "Miembro del hogar" },
  { value: "GUEST", label: "Invitado" },
  { value: "EMPLOYEE", label: "Empleado" },
  { value: "CONTRACTOR", label: "Contratista" }
];

export function ResidentsView({ data }: { data: ModuleData }) {
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
    const credentialType = values.get("credentialType");

    const body = {
      firstName: values.get("firstName"),
      lastName: values.get("lastName"),
      unitLabel: values.get("unitLabel"),
      email: values.get("email") || undefined,
      phone: values.get("phone") || undefined,
      type: values.get("type"),
      credentialType: credentialType && credentialType !== "NONE" ? credentialType : undefined,
      credentialIdentifier: values.get("credentialIdentifier") || undefined
    };

    const response = await fetch("/api/residents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "No se pudo crear el residente.");
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
          <h1>{data.title}</h1>
          <p>{data.subtitle}</p>
        </div>
        <div className="actions">
          <button className="secondary">Exportar</button>
          <button className="primary" onClick={() => setOpen((v) => !v)}>
            {open ? "Cancelar" : data.action}
          </button>
        </div>
      </div>

      {open && (
        <section className="card" style={{ marginBottom: 14 }}>
          <form onSubmit={submit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="field">
                <label htmlFor="firstName">Nombre</label>
                <input id="firstName" name="firstName" required />
              </div>
              <div className="field">
                <label htmlFor="lastName">Apellido</label>
                <input id="lastName" name="lastName" required />
              </div>
              <div className="field">
                <label htmlFor="unitLabel">Unidad</label>
                <input id="unitLabel" name="unitLabel" placeholder="Ej. 204" required />
              </div>
              <div className="field">
                <label htmlFor="type">Tipo</label>
                <select id="type" name="type" defaultValue="RESIDENT">
                  {PERSON_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="email">Correo (opcional)</label>
                <input id="email" name="email" type="email" />
              </div>
              <div className="field">
                <label htmlFor="phone">Teléfono (opcional)</label>
                <input id="phone" name="phone" />
              </div>
              <div className="field">
                <label htmlFor="credentialType">Credencial (opcional)</label>
                <select id="credentialType" name="credentialType" defaultValue="NONE">
                  <option value="NONE">Sin credencial por ahora</option>
                  <option value="RFID">RFID</option>
                  <option value="Mobile">Mobile</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="credentialIdentifier">Identificador de credencial</label>
                <input id="credentialIdentifier" name="credentialIdentifier" placeholder="Ej. número de tarjeta" />
              </div>
            </div>
            {error && (
              <div className="error" role="alert" style={{ marginTop: 12 }}>
                {error}
              </div>
            )}
            <button className="primary" disabled={loading} style={{ marginTop: 16 }}>
              {loading ? "Guardando…" : "Guardar residente"}
            </button>
          </form>
        </section>
      )}

      <section className="card">
        <RecordsTable columns={data.columns} rows={data.rows} empty={data.empty} />
      </section>
    </div>
  );
}
