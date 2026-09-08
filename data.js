import { config } from "./config.js";
export const live = Boolean(config.supabaseUrl && config.supabasePublishableKey);
async function rpc(name, body) {
  const response = await fetch(`${config.supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: config.supabasePublishableKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Could not connect. Please try again.");
  return data;
}
export async function createPlan(plan) {
  if (!live) {
    const data = { ...plan, id: `local-${crypto.randomUUID()}`, people: [] };
    localStorage.setItem(`yyd-plan:${data.id}`, JSON.stringify(data));
    return data;
  }
  return rpc("yyd_create_plan", {
    p_title: plan.title,
    p_note: plan.note,
    p_timezone: plan.timezone,
    p_slots: plan.slots,
  });
}
export async function getPlan(id) {
  if (id.startsWith("local-")) {
    const data = localStorage.getItem(`yyd-plan:${id}`);
    if (!data)
      throw new Error(
        "This is a local demo plan. Open it in the browser where it was created, or try the sample demo.",
      );
    return JSON.parse(data);
  }
  if (!live) throw new Error("Live sharing is not connected on this copy of the app yet.");
  return rpc("yyd_get_plan", { p_id: id });
}
export function getIdentity(planId) {
  const raw = localStorage.getItem(`yyd-me:${planId}`);
  return raw ? JSON.parse(raw) : null;
}
export async function saveResponse(plan, name, slots) {
  // Browser storage holds only the edit capability in live mode, not shared responses.
  let identity = getIdentity(plan.id);
  if (!identity) {
    identity = { id: crypto.randomUUID(), token: crypto.randomUUID() };
    localStorage.setItem(`yyd-me:${plan.id}`, JSON.stringify(identity));
  }
  if (plan.id === "demo" || plan.id.startsWith("local-")) {
    const result = {
      ...plan,
      people: [
        ...plan.people.filter((p) => p.id !== identity.id),
        { id: identity.id, name, slots },
      ],
    };
    if (plan.id !== "demo") localStorage.setItem(`yyd-plan:${plan.id}`, JSON.stringify(result));
    return result;
  }
  return rpc("yyd_save_response", {
    p_plan: plan.id,
    p_id: identity.id,
    p_token: identity.token,
    p_name: name,
    p_slots: slots,
  });
}
