import {icon} from "./icons.js";
import {
  projectSlots, slotInstant, clockLabel, paintRectangle,
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
let viewerZone = null, projected = null, conversionWarning = "", cancelDrag = () => {};
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
      plan.slots.forEach(slot => slotInstant(slot, plan.timezone));
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
  return `<div class="results-header"><span class="eyebrow">HERE’S THE OVERLAP</span><h2>The best bets.</h2><p class="result-zone">${esc(zoneLabel(viewerZone || current.timezone))}</p><p>Based on ${total} saved ${total === 1 ? "response" : "responses"}. Ties show earliest first.</p></div>${
    ranked.length
      ? ranked
          .slice(0, 3)
          .map(
            (r, i) =>
              `<div class="best-time ${i === 0 ? "winner" : ""}"><span class="rank">0${i + 1}</span><div><strong>${dayLabel(projected?.slots[r.index]?.day || r.slot.slice(0,10))}</strong><span>${resultTime(r)}</span></div><span class="count">${r.people.length}/${total}</span><div class="who">${r.people.map((p) => esc(p.name)).join(", ")}${r.people.length === total ? " · Everyone’s down!" : ""}</div></div>`,
          )
          .join("")
      : `<div class="empty-result">${total ? "No available times yet. Try a different selection." : "Be the first one down. Best times will show up here."}</div>`
  }<div class="people-list"><h3>The crew <span>${total}</span></h3>${current.people.map((p, i) => `<div class="person"><span class="avatar color-${i % 3}">${esc(p.name.slice(0, 1).toUpperCase())}</span><span>${esc(p.name)}${p.id === ownId ? " (you)" : ""}</span><span class="response-state">${p.slots.length ? "I’m down" : "Can’t make it"}</span></div>`).join("")}${live && !current.id.startsWith("local-") && current.id !== "demo" ? '<p class="form-help">Refreshes every 15 seconds. Anyone with this link can view the crew’s responses.</p><p id="sync-state" class="form-help" aria-live="polite"></p>' : ""}</div>`;
}

function zoneOptions(chosen) {
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['UTC','America/New_York','America/Los_Angeles','Europe/London','Asia/Kolkata','Asia/Tokyo'];
  return [...new Set([chosen,local,current.timezone,'UTC',...zones])].map(z => `<option value="${esc(z)}" ${z === chosen ? 'selected' : ''}>${esc(zoneLabel(z))}</option>`).join('');
}
function updateProjection() {
  conversionWarning = '';
  try { projected = projectSlots(current,viewerZone); }
  catch {
    // Old plans can contain DST wall-clock labels that do not identify one instant.
    viewerZone = current.timezone;
    conversionWarning = 'This older plan includes a skipped or repeated clock-change hour. It can only be shown in the organizer’s time zone. Ask the organizer to create a plan outside those hours.';
    const slots = current.slots.map((s,index) => ({index,day:s.slice(0,10),clock:s.slice(11),row:s.slice(11),endClock:`${String((Number(s.slice(11,13))+1)%24).padStart(2,'0')}:00`}));
    projected = {slots,days:[...new Set(slots.map(s=>s.day))].sort(),rows:[...new Set(slots.map(s=>s.row))].sort()};
  }
}
function resultTime(result) {
  const slot = projected?.slots[result.index];
  if (!slot) return `${hourLabel(result.slot.slice(11,13))} – ${hourLabel(Number(result.slot.slice(11,13))+1)}`;
  return `${clockLabel(slot.clock)} – ${clockLabel(slot.endClock)}${slot.endDay && slot.endDay !== slot.day ? ` (${dayLabel(slot.endDay)})` : ''}${slot.row.length > 5 ? ` · ${slot.offsetLabel}` : ''}`;
}
function renderGrid() {
  cancelDrag();
  const {days,rows,slots} = projected;
  document.querySelector('#zone-note').textContent = conversionWarning || `Plan time zone: ${zoneLabel(current.timezone)}. Your selections stay on the same moments when you switch.`;
  document.querySelector('#grid-host').innerHTML = `<div class="grid-scroll" tabindex="0" role="region" aria-label="Availability grid; scroll for more dates and times" aria-describedby="grid-help"><div class="time-grid" style="grid-template-columns:76px repeat(${days.length},minmax(64px,1fr))"><div class="grid-corner" aria-hidden="true">Time</div>${days.map(day=>`<div class="day-label">${dayLabel(day).split(',')[0]}<strong>${dayLabel(day).split(',')[1]}</strong></div>`).join('')}${rows.map((row,r)=>`<div class="hour-label">${clockLabel(row.slice(0,5))}${row.length > 5 ? `<small>${esc(row.slice(6))}</small>` : ''}</div>${days.map((day,c)=>{
    const slot=slots.find(s=>s.day===day && s.row===row);
    if (!slot) return `<div class="empty-slot" data-row="${r}" data-col="${c}" aria-label="No proposed time"></div>`;
    return `<button type="button" class="time-cell ${selected.has(slot.index)?'selected':''}" data-slot="${slot.index}" data-row="${r}" data-col="${c}" aria-label="${esc(dayLabel(day))}, ${clockLabel(slot.clock)}, ${esc(viewerZone)}${row.length>5 ? ', '+slot.offsetLabel : ''}" aria-pressed="${selected.has(slot.index)}">${selected.has(slot.index)?icon('check'):'<span class="cell-dash">–</span>'}</button>`;
  }).join('')}`).join('')}</div></div>`;
  wireGridDrag(document.querySelector('.grid-scroll'));
}
function redrawSelection() {
  document.querySelectorAll('[data-slot]').forEach(button=>{
    const on=selected.has(Number(button.dataset.slot));
    button.classList.toggle('selected',on);
    button.setAttribute('aria-pressed',String(on));
    button.innerHTML=on?icon('check'):'<span class="cell-dash">–</span>';
  });
  markDirty();
}
function wireGridDrag(scroller) {
  const buttons=[...scroller.querySelectorAll('[data-slot]')];
  const positions=[...scroller.querySelectorAll('[data-row]')];
  const cells=buttons.map(b=>({index:Number(b.dataset.slot),row:Number(b.dataset.row),col:Number(b.dataset.col)}));
  let drag=null, frame=0;
  const stop=()=>{
    cancelAnimationFrame(frame);
    if (drag && scroller.hasPointerCapture(drag.id)) scroller.releasePointerCapture(drag.id);
    drag=null;
    scroller.classList.remove('is-dragging');
  };
  cancelDrag=stop;
  function paint() {
    if (!drag || !scroller.isConnected) return stop();
    const bounds=scroller.getBoundingClientRect();
    const corner=scroller.querySelector('.grid-corner').getBoundingClientRect();
    const x=Math.max(corner.right+4,Math.min(bounds.right-12,drag.x));
    const y=Math.max(corner.bottom+4,Math.min(bounds.bottom-12,drag.y));
    let nearest=null, distance=Infinity;
    for (const element of positions) {
      const r=element.getBoundingClientRect();
      const dx=Math.max(r.left-x,0,x-r.right),dy=Math.max(r.top-y,0,y-r.bottom);
      if (dx*dx+dy*dy < distance) {distance=dx*dx+dy*dy;nearest=element;}
    }
    if (!nearest) return;
    const end={row:Number(nearest.dataset.row),col:Number(nearest.dataset.col)};
    const key=`${end.row}/${end.col}`;
    if (key===drag.last) return;
    drag.last=key;
    selected=paintRectangle(drag.initial,cells,drag.anchor,end,drag.add);
    redrawSelection();
  }
  function tick() {
    if (!drag || !scroller.isConnected) return stop();
    const b=scroller.getBoundingClientRect(),corner=scroller.querySelector('.grid-corner').getBoundingClientRect();
    const velocity=(value,min,max)=>value<min+26?-Math.min(12,(min+26-value)/3):value>max-26?Math.min(12,(value-max+26)/3):0;
    scroller.scrollBy(velocity(drag.x,corner.right,b.right-12),velocity(drag.y,corner.bottom,b.bottom-12));
    paint();
    frame=requestAnimationFrame(tick);
  }
  scroller.addEventListener('pointerdown',event=>{
    const button=event.target.closest('[data-slot]');
    if (!button || button.disabled || event.button!==0 || !event.isPrimary || drag) return;
    event.preventDefault();
    button.focus({preventScroll:true});
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,initial:new Set(selected),anchor:{row:Number(button.dataset.row),col:Number(button.dataset.col)},add:!selected.has(Number(button.dataset.slot))};
    scroller.setPointerCapture(event.pointerId);
    scroller.classList.add('is-dragging');
    paint();
    frame=requestAnimationFrame(tick);
  });
  scroller.addEventListener('pointermove',event=>{if(drag && event.pointerId===drag.id){drag.x=event.clientX;drag.y=event.clientY;paint();}});
  scroller.addEventListener('pointerup',event=>{if(drag && event.pointerId===drag.id){paint();stop();}});
  scroller.addEventListener('pointercancel',()=>{if(drag){selected=drag.initial;redrawSelection();stop();}});
  scroller.addEventListener('lostpointercapture',stop);
  scroller.addEventListener('keydown',event=>{if(event.key==='Escape' && drag){selected=drag.initial;redrawSelection();stop();}});
  buttons.forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault();
    // Native keyboard and assistive-technology activation has no pointer detail.
    if (event.detail!==0) return;
    const index=Number(button.dataset.slot);
    selected.has(index)?selected.delete(index):selected.add(index);
    redrawSelection();
  }));
}
function planView() {
  rememberPlan(current);
  viewerZone = current.timezone;
  updateProjection();
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
  app.innerHTML = `<section class="plan-page"><div class="plan-heading"><div><a class="text-button" href="#">${icon("arrow-left")} All plans</a><span class="eyebrow">${isDemo ? "TRY IT OUT · DEMO MODE" : "THE GANG’S GETTING TOGETHER"}</span><h1>${esc(current.title)}</h1><p class="muted">${esc(current.note)}</p></div><button class="primary" id="share">${isDemo ? "Share the demo" : "Copy invite link"} ${icon("copy")}</button></div>${isDemo ? `<div class="demo-banner">${current.id === "demo" ? "Sample friends. Your changes here are temporary." : "Local demo: responses stay in this browser."} Sharing this demo does not collect live responses.</div>` : ""}${errorArea}<div class="plan-columns"><section class="availability" aria-labelledby="availability-title"><div class="section-heading"><div><h2 id="availability-title">When are you down?</h2><p>Choose the one-hour blocks that work for you.</p></div><span class="pill" id="selected-count">${selected.size} SELECTED</span></div><form id="response-form"><label class="name-label">Your name<input id="name" name="name" required maxlength="40" placeholder="The name your friends know" autocomplete="given-name" value="${esc(mine?.name || "")}"></label><div class="timezone"><label for="viewer-zone">SHOW TIMES IN</label><select id="viewer-zone">${zoneOptions(viewerZone)}</select><strong id="viewer-zone-label">${esc(zoneLabel(viewerZone))}</strong><button class="text-button" type="button" id="my-zone">Use my time zone</button><p id="zone-note" class="form-help"></p></div><p class="grid-help" id="grid-help">Click or drag a block to select. Start on a selected slot to clear. Drag near an edge to scroll.</p><div id="grid-host"></div><div class="grid-actions"><button type="button" class="text-button" id="clear">Clear selection</button><button class="primary" type="submit" id="save">${mine ? "Update my times" : "Save my times"} ${icon("arrow-right")}</button></div><p class="form-help">No times work? Save an empty selection to let the group know. You can edit your response in this browser.</p><span id="save-state" role="status" class="save-state"></span></form></section><aside class="results" aria-label="Best times and responses">${results()}</aside></div></section>`;
  renderGrid();
  const changeZone = zone => {
    cancelDrag();
    viewerZone = zone;
    updateProjection();
    document.querySelector('#viewer-zone').value = viewerZone;
    document.querySelector('#viewer-zone-label').textContent = zoneLabel(viewerZone);
    renderGrid();
    document.querySelector('.results').innerHTML = results();
  };
  document.querySelector('#viewer-zone').addEventListener('change', e => changeZone(e.target.value));
  document.querySelector('#my-zone').addEventListener('click', () => changeZone(Intl.DateTimeFormat().resolvedOptions().timeZone));
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
      .querySelectorAll("#response-form button, #response-form input, #response-form select")
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
          .querySelectorAll("#response-form button, #response-form input, #response-form select")
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
  cancelDrag();
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
