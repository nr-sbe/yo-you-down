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

// Convert organizer wall-clock labels without changing their stored slot indexes.
const zoneFormatters = new Map();
const instantCache = new Map();
function zoneParts(ms, zone) {
  if (!zoneFormatters.has(zone)) zoneFormatters.set(zone, new Intl.DateTimeFormat('en-CA', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }));
  const p = Object.fromEntries(zoneFormatters.get(zone).formatToParts(new Date(ms)).map(p => [p.type, p.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function slotInstant(slot, zone) {
  const key = `${zone}/${slot}`;
  if (instantCache.has(key)) return instantCache.get(key);
  const wall = Date.parse(`${slot}:00Z`);
  const offsets = new Set([-36,-24,-12,0,12,24,36].map(h => {
    const sample = wall + h * 3600000;
    return Date.parse(`${zoneParts(sample, zone)}:00Z`) - sample;
  }));
  const candidates = [...offsets].map(offset => wall - offset).filter(ms => zoneParts(ms, zone) === slot);
  if (candidates.length !== 1) throw new Error('These hours include a skipped or repeated daylight-saving time. Choose hours outside the clock change.');
  instantCache.set(key, candidates[0]);
  return candidates[0];
}
export function clockLabel(clock) {
  const [h,m] = clock.split(':').map(Number);
  return `${h % 12 || 12}${m ? ':' + String(m).padStart(2,'0') : ''} ${h >= 12 ? 'PM' : 'AM'}`;
}
export function projectSlots(plan, zone) {
  const slots = plan.slots.map((slot,index) => {
    const instant = slotInstant(slot,plan.timezone);
    const local = zoneParts(instant,zone);
    const end = zoneParts(instant + 3600000,zone);
    const offset = (Date.parse(`${local}:00Z`) - instant) / 60000;
    const offsetLabel = `UTC${offset < 0 ? '−' : '+'}${String(Math.floor(Math.abs(offset)/60)).padStart(2,'0')}:${String(Math.abs(offset)%60).padStart(2,'0')}`;
    return {index,instant,day:local.slice(0,10),clock:local.slice(11),endDay:end.slice(0,10),endClock:end.slice(11),offsetLabel};
  });
  const seen = new Set(), repeated = new Set();
  for (const slot of slots) {
    const key = `${slot.day}/${slot.clock}`;
    if (seen.has(key)) repeated.add(slot.clock);
    seen.add(key);
  }
  for (const slot of slots) slot.row = slot.clock + (repeated.has(slot.clock) ? ` ${slot.offsetLabel}` : '');
  return {
    slots,
    days:[...new Set(slots.map(s => s.day))].sort(),
    rows:[...new Set(slots.map(s => s.row))].sort((a,b) => {
      if (a.slice(0,5) !== b.slice(0,5)) return a.localeCompare(b);
      return Math.min(...slots.filter(s=>s.row===a).map(s=>s.instant)) - Math.min(...slots.filter(s=>s.row===b).map(s=>s.instant));
    }),
  };
}
export function paintRectangle(initial, cells, anchor, end, add) {
  const result = new Set(initial);
  for (const cell of cells) {
    if (cell.row >= Math.min(anchor.row,end.row) && cell.row <= Math.max(anchor.row,end.row) &&
        cell.col >= Math.min(anchor.col,end.col) && cell.col <= Math.max(anchor.col,end.col)) {
      if (add) result.add(cell.index); else result.delete(cell.index);
    }
  }
  return result;
}
