import {icon} from "./icons.js";
import {
  addDays,
  localDate,
  buildSlots,
  rankSlots,
  dayLabel,
  hourLabel,
  zoneLabel,
  escapeHtml as esc,
  demoPlan,
} from "./domain.js";
import { live, createPlan, getPlan, getIdentity, saveResponse } from "./data.js";
const app = document.querySelector("#app");
const themeToggle = document.querySelector("#theme-toggle");
function updateThemeToggle() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  themeToggle.setAttribute("aria-label", `Switch to ${next} mode`);
  themeToggle.querySelector(".theme-icon").innerHTML = icon(next === "light" ? "sun" : "moon");
  themeToggle.querySelector(".theme-label").textContent =
    `${next === "light" ? "Light" : "Dark"} mode`;
}
themeToggle.addEventListener("click", () => {
  const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content =
    theme === "dark" ? "#121722" : "#f6f7fb";
  try {
    localStorage.setItem("yyd-theme", theme);
  } catch {
    /* The toggle still works this session. */
  }
  updateThemeToggle();
});
updateThemeToggle();
let current = null,
  selected = new Set(),
  ownId = null,
  dirty = false,
  generation = 0,
  poll = null;
const arrow = icon("arrow-up-right");
function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.hidden = true), 6500);
}
function showError(message) {
  const el = document.querySelector("#error");
  if (el) {
    el.textContent = message;
    el.hidden = false;
    el.focus();
  } else toast(message);
}
const errorArea = '<p id="error" class="error" role="alert" tabindex="-1" hidden></p>';
function recentPlans() {
  try {
    return JSON.parse(localStorage.getItem("yyd-recent") || "[]")
      .filter((p) => typeof p.id === "string" && /^(local-)?[a-f0-9-]{36}$/.test(p.id))
      .slice(0, 6);
  } catch {
    return [];
  }
}
function rememberPlan(plan) {
  if (plan.id === "demo") return;
  try {
    const recent = recentPlans().filter((p) => p.id !== plan.id);
    recent.unshift({ id: plan.id, title: plan.title, date: plan.slots[0].slice(0, 10) });
    localStorage.setItem("yyd-recent", JSON.stringify(recent.slice(0, 6)));
  } catch {
    /* Recent links are an optional browser preference. */
  }
}
function home() {
  creation();
}
function creation() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zones =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : [
          "America/New_York",
          "America/Chicago",
          "America/Denver",
          "America/Los_Angeles",
          "Europe/London",
          "Asia/Dhaka",
          "Asia/Tokyo",
          "Australia/Sydney",
        ];
  const recent = recentPlans();
  app.innerHTML = `<section class="quick-workspace"><div class="workspace-title"><h1>What’s the plan?</h1><span class="mode-badge">${live ? "Live sharing" : "Local demo"}</span></div><div class="quick-columns"><section class="quick-create" aria-label="Create a hangout">${errorArea}<form id="create-form"><label class="title-label">Hangout name<input name="title" required maxlength="80" placeholder="Movie night? Games? Dinner?" autocomplete="off"></label><div class="plan-presets" role="group" aria-label="Quick hangout names">${[['game-controller','Game night'],['film-strip','Movie night'],['fork-knife','Dinner'],['chat-circle-dots','Just hang']].map(([glyph,title])=>`<button type="button" class="preset" data-title="${title}" aria-pressed="false">${icon(glyph)}<span>${title}</span></button>`).join('')}</div><div class="form-row"><label>Starting<input name="start" type="date" required value="${localDate()}" min="${localDate()}"></label><label>Over<select name="days">${[1, 2, 3, 4, 5, 6, 7].map((n) => `<option value="${n}" ${n === 3 ? "selected" : ""}>${n} ${n === 1 ? "day" : "days"}</option>`).join("")}</select></label></div><div class="form-row"><label>Earliest<select name="from">${Array.from({ length: 24 }, (_, h) => `<option value="${h}" ${h === 18 ? "selected" : ""}>${hourLabel(h)}</option>`).join("")}</select></label><label>Latest<select name="until">${Array.from({ length: 24 }, (_, i) => `<option value="${i + 1}" ${i === 21 ? "selected" : ""}>${i === 23 ? "Midnight" : hourLabel(i + 1)}</option>`).join("")}</select></label></div><label class="zone-setting">Time zone <span class="optional">· applies to everyone</span><select name="timezone">${Array.from(
    new Set([zone, "UTC", ...zones]),
  )
    .map((z) => `<option value="${esc(z)}">${esc(zoneLabel(z))}</option>`)
    .join(
      "",
    )}</select><span class="zone-current" aria-live="polite">${esc(zoneLabel(zone))}</span></label><details class="extra-options"><summary>Add a note <span>optional</span></summary><div class="extra-fields"><label>Note<textarea name="note" maxlength="300" placeholder="Where? Who’s bringing snacks?"></textarea></label></div></details><button class="primary full" type="submit">${live ? "Create & copy invite" : "Create demo plan"} ${arrow}</button><p class="form-help">${live ? "Anyone with your link can respond. No accounts needed." : "Saved in this browser. Connect the optional database for live friend responses."}</p></form></section><aside class="recent-plans" aria-labelledby="recent-heading"><div class="recent-heading"><h2 id="recent-heading">Update your availability</h2><span class="shortcut-label">Back to the good stuff.</span></div>${recent.length ? recent.map((p) => `<a class="recent-plan" href="#plan/${esc(p.id)}"><div><strong>${esc(p.title)}</strong><span>${dayLabel(p.date)} · ${p.id.startsWith("local-") ? "Local demo" : "Shared plan"}</span></div><span class="recent-arrow" aria-hidden="true">${icon("arrow-right")}</span></a>`).join("") : '<p class="recent-empty">Open a friend’s invite or create a plan. Your recent hangouts will be right here.</p>'}<a class="demo-shortcut" href="#demo"><span class="demo-icon" aria-hidden="true">${icon("game-controller")}</span><div><strong>Game night, anyone?</strong><span>Try the availability grid · sample plan</span></div>${icon("arrow-right")}</a><p class="form-help">Recent links are remembered on this device.</p></aside></div></section>`;
  const zoneSelect = document.querySelector('select[name="timezone"]');
  zoneSelect.addEventListener('change', () => {
    document.querySelector('.zone-current').textContent = zoneLabel(zoneSelect.value);
  });
  const titleInput=document.querySelector('input[name="title"]');
  const updatePresets=()=>document.querySelectorAll('[data-title]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.title===titleInput.value)));
  document.querySelectorAll('[data-title]').forEach(button=>button.addEventListener('click',()=>{titleInput.value=button.dataset.title;updatePresets();}));
  titleInput.addEventListener('input',updatePresets);
  document.querySelector("#create-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    const routeGeneration = generation;
    button.disabled = true;
    button.textContent = "Creating…";
    try {
      const title = data.get("title").trim();
      if (!title) throw new Error("Give your hangout a name.");
      const plan = {
        title,
        note: data.get("note").trim(),
        timezone: data.get("timezone"),
        slots: buildSlots(
          data.get("start"),
          Number(data.get("days")),
          Number(data.get("from")),
          Number(data.get("until")),
        ),
      };
      const result = await createPlan(plan);
      if (routeGeneration !== generation) return;
      rememberPlan(result);
      if (live) {
        const url = new URL(location.href);
        url.hash = `plan/${result.id}`;
        try {
          await navigator.clipboard.writeText(url.href);
          toast("Invite copied. Send it to your friends.");
        } catch {
          toast("Plan ready. Use Copy invite link to share it.");
        }
      }
      location.hash = `plan/${result.id}`;
    } catch (e) {
      if (routeGeneration === generation)
        showError(e.message || "Could not save. Please try again.");
    } finally {
      button.disabled = false;
      button.innerHTML = `${live ? "Create & copy invite" : "Create demo plan"} ${arrow}`;
    }
  });
}
function results() {
  const ranked = rankSlots(current);
  const total = current.people.length;
  return `<div class="results-header"><span class="eyebrow">HERE’S THE OVERLAP</span><h2>The best bets.</h2><p>Based on ${total} saved ${total === 1 ? "response" : "responses"}. Ties show earliest first.</p></div>${
    ranked.length
      ? ranked
          .slice(0, 3)
          .map(
            (r, i) =>
              `<div class="best-time ${i === 0 ? "winner" : ""}"><span class="rank">0${i + 1}</span><div><strong>${dayLabel(r.slot.slice(0, 10))}</strong><span>${hourLabel(r.slot.slice(11, 13))} – ${hourLabel(Number(r.slot.slice(11, 13)) + 1)}</span></div><span class="count">${r.people.length}/${total}</span><div class="who">${r.people.map((p) => esc(p.name)).join(", ")}${r.people.length === total ? " · Everyone’s down!" : ""}</div></div>`,
          )
          .join("")
      : `<div class="empty-result">${total ? "No available times yet. Try a different selection." : "Be the first one down. Best times will show up here."}</div>`
  }<div class="people-list"><h3>The crew <span>${total}</span></h3>${current.people.map((p, i) => `<div class="person"><span class="avatar color-${i % 3}">${esc(p.name.slice(0, 1).toUpperCase())}</span><span>${esc(p.name)}${p.id === ownId ? " (you)" : ""}</span><span class="response-state">${p.slots.length ? "I’m down" : "Can’t make it"}</span></div>`).join("")}${live && !current.id.startsWith("local-") && current.id !== "demo" ? '<p class="form-help">Refreshes every 15 seconds. Anyone with this link can view the crew’s responses.</p><p id="sync-state" class="form-help" aria-live="polite"></p>' : ""}</div>`;
}
function planView() {
  rememberPlan(current);
  const days = Array.from(new Set(current.slots.map((s) => s.slice(0, 10))));
  const hours = Array.from(new Set(current.slots.map((s) => s.slice(11, 13))));
  let identity;
  try {
    identity = getIdentity(current.id);
  } catch {
    identity = null;
  }
  ownId = identity?.id;
  const mine = current.people.find((p) => p.id === ownId);
  selected = new Set(mine?.slots || []);
  dirty = false;
  const isDemo = current.id === "demo" || current.id.startsWith("local-");
  app.innerHTML = `<section class="plan-page"><div class="plan-heading"><div><a class="text-button" href="#">${icon("arrow-left")} All plans</a><span class="eyebrow">${isDemo ? "TRY IT OUT · DEMO MODE" : "THE GANG’S GETTING TOGETHER"}</span><h1>${esc(current.title)}</h1><p class="muted">${esc(current.note)}</p></div><button class="primary" id="share">${isDemo ? "Share the demo" : "Copy invite link"} ${icon("copy")}</button></div>${isDemo ? `<div class="demo-banner">${current.id === "demo" ? "Sample friends. Your changes here are temporary." : "Local demo: responses stay in this browser."} Sharing this demo does not collect live responses.</div>` : ""}${errorArea}<div class="plan-columns"><section class="availability" aria-labelledby="availability-title"><div class="section-heading"><div><h2 id="availability-title">When are you down?</h2><p>Tap every one-hour block that works for you.</p></div><span class="pill" id="selected-count">${selected.size} SELECTED</span></div><form id="response-form"><label class="name-label">Your name<input id="name" name="name" required maxlength="40" placeholder="The name your friends know" autocomplete="given-name" value="${esc(mine?.name || "")}"></label><div class="timezone"><span>YOU’RE ENTERING TIMES IN</span><strong>${esc(zoneLabel(current.timezone))}</strong></div><div class="grid-scroll" tabindex="0" role="region" aria-label="Availability grid; scroll horizontally for more dates"><div class="time-grid" style="grid-template-columns:52px repeat(${days.length},minmax(48px,1fr))"><div></div>${days.map((d) => `<div class="day-label">${dayLabel(d).split(",")[0]}<strong>${dayLabel(d).split(",")[1]}</strong></div>`).join("")}${hours
    .map(
      (h) =>
        `<div class="time-row"><span class="hour-label">${hourLabel(h)}</span>${days
          .map((d) => {
            const i = current.slots.indexOf(`${d}T${h}:00`);
            return `<button type="button" class="time-cell ${selected.has(i) ? "selected" : ""}" data-slot="${i}" aria-label="${esc(dayLabel(d))}, ${hourLabel(h)}, ${esc(current.timezone)}" aria-pressed="${selected.has(i)}">${selected.has(i) ? icon("check") : '<span class="cell-dash">–</span>'}</button>`;
          })
          .join("")}</div>`,
    )
    .join(
      "",
    )}</div></div><div class="grid-actions"><button type="button" class="text-button" id="clear">Clear selection</button><button class="primary" type="submit" id="save">${mine ? "Update my times" : "Save my times"} ${icon("arrow-right")}</button></div><p class="form-help">No times work? Save an empty selection to let the group know. You can edit your response in this browser.</p><span id="save-state" role="status" class="save-state"></span></form></section><aside class="results" aria-label="Best times and responses">${results()}</aside></div></section>`;
  document.querySelectorAll("[data-slot]").forEach((button) =>
    button.addEventListener("click", () => {
      const i = Number(button.dataset.slot);
      selected.has(i) ? selected.delete(i) : selected.add(i);
      button.classList.toggle("selected", selected.has(i));
      button.setAttribute("aria-pressed", String(selected.has(i)));
      button.innerHTML = selected.has(i) ? icon("check") : '<span class="cell-dash">–</span>';
      markDirty();
    }),
  );
  document.querySelector("#name").addEventListener("input", markDirty);
  document.querySelector("#clear").addEventListener("click", () => {
    selected.clear();
    document.querySelectorAll("[data-slot]").forEach((b) => {
      b.classList.remove("selected");
      b.setAttribute("aria-pressed", "false");
      b.innerHTML = '<span class="cell-dash">–</span>';
    });
    markDirty();
  });
  document.querySelector("#share").addEventListener("click", async () => {
    const url = new URL(location.href);
    if (isDemo) url.hash = "demo";
    try {
      await navigator.clipboard.writeText(url.href);
      toast(
        isDemo
          ? "Demo link copied. This shares the playground, not your saved responses."
          : "Link copied. Drop it in the group chat.",
      );
    } catch {
      toast(`Copy this link: ${url.href}`);
    }
  });
  document.querySelector("#response-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.querySelector("#name").value.trim();
    if (!name) {
      showError("Add your name first.");
      return;
    }
    const version = generation;
    const button = document.querySelector("#save");
    button.disabled = true;
    button.textContent = "Saving…";
    const responseSlots = [...selected];
    document
      .querySelectorAll("#response-form button, #response-form input")
      .forEach((el) => (el.disabled = true));
    try {
      const result = await saveResponse(current, name, responseSlots);
      if (version !== generation) return;
      current = result;
      ownId = getIdentity(current.id)?.id;
      dirty = false;
      document.querySelector(".results").innerHTML = results();
      document.querySelector("#error").hidden = true;
      document.querySelector("#save-state").textContent = "Saved. You’re on the list.";
      toast("Your availability is saved.");
    } catch (e) {
      if (version === generation) showError(e.message || "Could not save. Please try again.");
    } finally {
      if (version === generation) {
        document
          .querySelectorAll("#response-form button, #response-form input")
          .forEach((el) => (el.disabled = false));
        button.innerHTML = `Update my times ${icon("arrow-right")}`;
      }
    }
  });
}
function markDirty() {
  dirty = true;
  document.querySelector("#selected-count").textContent = `${selected.size} SELECTED`;
  document.querySelector("#save-state").textContent = "Unsaved changes";
}
async function route() {
  if (dirty && !confirm("Leave without saving your availability?")) {
    history.replaceState(null, "", `#${current.id === "demo" ? "demo" : `plan/${current.id}`}`);
    return;
  }
  dirty = false;
  generation++;
  const version = generation;
  clearInterval(poll);
  window.scrollTo(0, 0);
  current = null;
  const hash = location.hash.slice(1);
  if (!hash) {
    home();
    return;
  }
  if (hash === "create") {
    creation();
    return;
  }
  if (hash === "demo") {
    current = demoPlan();
    planView();
    return;
  }
  if (hash.startsWith("plan/")) {
    app.innerHTML = '<section class="loading" role="status">Getting the gang’s plan…</section>';
    try {
      const loaded = await getPlan(hash.slice(5));
      if (version !== generation) return;
      current = loaded;
      planView();
      if (!current.id.startsWith("local-")) {
        const id = current.id;
        poll = setInterval(async () => {
          if (document.hidden) return;
          try {
            const plan = await getPlan(id);
            if (version !== generation) return;
            current = plan;
            document.querySelector(".results").innerHTML = results();
          } catch {
            if (version === generation) {
              const status = document.querySelector("#sync-state");
              if (status)
                status.textContent = "Could not refresh. Showing the last saved responses.";
            }
          }
        }, 15000);
      }
    } catch (e) {
      if (version === generation)
        app.innerHTML = `<section class="create-page"><h1>Can’t find that plan.</h1><p class="error">${esc(e.message)}</p><a class="primary" href="#demo">Try the demo →</a><a class="text-button" href="#">Back to home</a></section>`;
    }
    return;
  }
  home();
}
addEventListener("hashchange", () => void route());
addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
void route();
