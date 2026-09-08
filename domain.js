export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function addDays(day, amount) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function buildSlots(start, days, from, until) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
    !Number.isFinite(Date.parse(`${start}T12:00:00Z`)) ||
    new Date(`${start}T12:00:00Z`).toISOString().slice(0, 10) !== start
  )
    throw new Error("Choose a valid starting date.");
  if (!Number.isInteger(days) || days < 1 || days > 7)
    throw new Error("Choose between 1 and 7 days.");
  if (![from, until].every(Number.isInteger) || from < 0 || until > 24 || until <= from)
    throw new Error("End time needs to be later than the start time.");
  return Array.from({ length: days }, (_, d) =>
    Array.from(
      { length: until - from },
      (_, h) => `${addDays(start, d)}T${String(h + from).padStart(2, "0")}:00`,
    ),
  ).flat();
}
export function rankSlots(plan) {
  return plan.slots
    .map((slot, index) => ({
      slot,
      index,
      people: plan.people.filter((p) => p.slots.includes(index)),
    }))
    .filter((x) => x.people.length)
    .sort((a, b) => b.people.length - a.people.length || a.index - b.index);
}
export function dayLabel(day) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
}
export function hourLabel(hour) {
  const h = Number(hour) % 24;
  return `${h % 12 || 12} ${h >= 12 ? "PM" : "AM"}`;
}
export function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}
export function demoPlan() {
  return {
    id: "demo",
    title: "Game night, anyone?",
    note: "Bring your questionable Mario Kart skills. Snacks encouraged.",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    slots: buildSlots(addDays(localDate(), 1), 4, 18, 22),
    people: [
      { id: "alex", name: "Alex", slots: [1, 2, 5, 6, 9, 10, 13] },
      { id: "sam", name: "Sam", slots: [2, 5, 6, 7, 10, 11, 13, 14] },
      { id: "jordan", name: "Jordan", slots: [0, 1, 5, 6, 9, 13, 14] },
    ],
  };
}

export function zoneLabel(zone) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longGeneric" })
    .formatToParts(new Date())
    .find((p) => p.type === "timeZoneName")?.value;
  return name && name !== zone ? `${name} · ${zone}` : zone;
}
