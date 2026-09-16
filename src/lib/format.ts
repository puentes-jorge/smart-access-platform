const timeFormatter = new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", hour12: true });
const dateFormatter = new Intl.DateTimeFormat("es-MX", { month: "short", day: "numeric" });

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatEventTime(date: Date | null | undefined): string {
  if (!date) return "Sin registros";
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, now)) return `Hoy ${timeFormatter.format(date)}`;
  if (isSameDay(date, yesterday)) return `Ayer ${timeFormatter.format(date)}`;
  return `${dateFormatter.format(date)}, ${timeFormatter.format(date)}`;
}

export function formatDateOnly(date: Date): string {
  return dateFormatter.format(date);
}

export function formatTime(date: Date): string {
  return timeFormatter.format(date);
}

export function formatHourString(value?: string | null): string {
  if (!value) return "—";
  const [hourStr, minuteStr] = value.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr ?? "0");
  if (Number.isNaN(hour)) return value;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function formatTimeRange(open?: string | null, close?: string | null): string {
  if (!open || !close) return "Sin horario definido";
  return `${formatHourString(open)} – ${formatHourString(close)}`;
}

export function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "hace segundos";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return formatEventTime(date);
}
