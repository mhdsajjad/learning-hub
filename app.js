// =====================================================================
//  আমার শেখার ঘর: মূল লজিক
//  সব তথ্য ব্রাউজারের localStorage এ থাকে (কোনো সার্ভার লাগে না)।
// =====================================================================

const LS_KEY = "learningHub.v1";
const CYCLE_GAP_DAYS = 7; // এত দিন বা বেশি বিরতির পর ফিরলে "নতুন চক্র" ধরা হবে

const STATUS = {
  active: { label: "🟢 চলছে" },
  paused: { label: "⏸️ বিরতিতে" },
  dropped: { label: "🚫 বাদ দিয়েছি" },
  done: { label: "🏁 শেষ করেছি" },
};

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const BN_MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
const BN_DAYS = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
const COLORS = ["#2cb1bc", "#e85d75", "#4f8cff", "#43a047", "#f5a623", "#9c6ade"];

// ===================== ছোট সাহায্যকারী ফাংশন =====================
const bn = (n) => String(n).replace(/\d/g, (d) => BN_DIGITS[d]);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };

// টেস্টের জন্য ?today=2026-12-05 দিয়ে তারিখ বদলানো যায়
function today() {
  const override = new URLSearchParams(location.search).get("today");
  return override || iso(new Date());
}
function daysBetween(a, b) {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}
function addDays(s, n) { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
function fmtDate(s, withDay = false) {
  const d = parse(s);
  const base = `${bn(d.getDate())} ${BN_MONTHS[d.getMonth()]}`;
  return withDay ? `${BN_DAYS[d.getDay()]}, ${base} ${bn(d.getFullYear())}` : base;
}

// ===================== তথ্য (state) =====================
function newSkillState() {
  return {
    status: "active",
    sessions: [],      // যেসব দিনে এই স্কিল নিয়ে কাজ করেছি
    practice: [],      // লেসন ছাড়া "আজ অনুশীলন করেছি" দিনগুলো
    done: {},          // লেসন id -> কবে শেষ করেছি
    cycles: 0,         // কতবার শুরু করেছি (বিরতির পর ফেরা = নতুন চক্র)
    cycleStarts: [],
    restartPending: false,
    priority: null,
    statusSince: today(),
  };
}

let state = loadState();

function loadState() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(LS_KEY)); } catch { s = null; }
  const fresh = !s;
  if (fresh) s = { version: 1, skills: {}, customSkills: [] };
  s.customSkills ||= [];
  for (const def of SKILLS.concat(s.customSkills)) {
    if (!s.skills[def.id]) s.skills[def.id] = newSkillState();
  }
  if (fresh) applySeed(s);
  return s;
}

// আগে শেখা লেসনগুলো প্রথমবার বসিয়ে দেওয়া
function applySeed(s) {
  const dates = Object.entries(SEED_HISTORY.done).sort((a, b) => a[1].localeCompare(b[1]));
  for (const [lessonId, date] of dates) {
    const def = SKILLS.find((sk) => sk.lessons.some((l) => l.id === lessonId));
    if (!def) continue;
    const st = s.skills[def.id];
    st.done[lessonId] = date;
    logSession(st, date);
  }
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

function save() { localStorage.setItem(LS_KEY, JSON.stringify(state)); }

// সব স্কিল (আগে থেকে দেওয়া + নিজের যোগ করা), প্রায়োরিটি অনুযায়ী সাজানো
function allSkills() {
  return SKILLS.concat(state.customSkills)
    .map((def) => ({ def, st: state.skills[def.id] }))
    .sort((a, b) => prio(a) - prio(b));
}
const prio = ({ def, st }) => st.priority ?? def.priority ?? 99;

// ===================== হিসাব =====================
// একটা দিনে কাজ করলে সেশন যোগ হয়; বেশি দিন পর ফিরলে নতুন চক্র শুরু
function logSession(st, date) {
  if (st.sessions.includes(date)) return false;
  const last = st.sessions[st.sessions.length - 1];
  let newCycle = false;
  if (!last) {
    st.cycles = 1;
    st.cycleStarts = [date];
  } else if (st.restartPending || daysBetween(last, date) >= CYCLE_GAP_DAYS) {
    st.cycles += 1;
    st.cycleStarts.push(date);
    newCycle = true;
  }
  st.restartPending = false;
  st.sessions.push(date);
  st.sessions.sort();
  return newCycle;
}

// আজকের কাজ বাতিল করলে, ওই দিনে আর কিছু না থাকলে সেশনটাও সরাই
function unlogIfEmpty(st, date) {
  const stillDone = Object.values(st.done).includes(date) || st.practice.includes(date);
  if (stillDone) return;
  st.sessions = st.sessions.filter((d) => d !== date);
  if (st.cycleStarts[st.cycleStarts.length - 1] === date) {
    st.cycleStarts.pop();
    st.cycles = Math.max(0, st.cycles - 1);
  }
}

const lastSession = (st) => st.sessions[st.sessions.length - 1] || null;
const daysSince = (st) => (lastSession(st) ? daysBetween(lastSession(st), today()) : null);

function progress({ def, st }) {
  const total = def.lessons.length;
  const done = def.lessons.filter((l) => st.done[l.id]).length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

function gapBadge(st) {
  const d = daysSince(st);
  if (d === null) return `<span class="badge none">এখনো শুরু হয়নি</span>`;
  if (d === 0) return `<span class="badge fresh">✅ আজকে করেছেন</span>`;
  if (d === 1) return `<span class="badge fresh">গতকাল করেছেন</span>`;
  const cls = d <= 3 ? "warn" : d <= 9 ? "late" : "bad";
  return `<span class="badge ${cls}">⏳ ${bn(d)} দিন ধরে করা হয়নি</span>`;
}

function streak() {
  const days = new Set(Object.values(state.skills).flatMap((s) => s.sessions));
  let d = today();
  if (!days.has(d)) d = addDays(d, -1);
  let n = 0;
  while (days.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

// আজকে কী কী করব: প্রতিটা চলমান স্কিল থেকে পরের লেসনগুলো
function todayPlan() {
  const t = today();
  return allSkills()
    .filter(({ st }) => st.status === "active")
    .map(({ def, st }) => {
      const doneToday = def.lessons.filter((l) => st.done[l.id] === t);
      const remaining = def.lessons.filter((l) => !st.done[l.id]);
      const need = Math.max(0, (def.perDay || 1) - doneToday.length);
      return { def, st, lessons: [...doneToday, ...remaining.slice(0, need)], finished: remaining.length === 0 && def.lessons.length > 0 };
    });
}

// ===================== রেন্ডার: উপরের অংশ =====================
function renderTop() {
  document.getElementById("todayLabel").textContent = "আজ " + fmtDate(today(), true);
  const plan = todayPlan();
  const all = plan.flatMap((p) => p.lessons);
  const doneN = all.filter((l) => isDoneToday(l.id)).length;
  const active = allSkills().filter(({ st }) => st.status === "active").length;
  document.getElementById("topStats").innerHTML = `
    <div class="stat"><b>🔥 ${bn(streak())}</b><span>দিনের ধারা</span></div>
    <div class="stat"><b>${bn(doneN)}/${bn(all.length)}</b><span>আজকের কাজ</span></div>
    <div class="stat"><b>${bn(active)}</b><span>চলমান স্কিল</span></div>`;
}

function isDoneToday(lessonId) {
  return Object.values(state.skills).some((st) => st.done[lessonId] === today());
}

// ===================== রেন্ডার: আজকে =====================
function renderToday() {
  const el = document.getElementById("view-today");
  const plan = todayPlan();
  const all = plan.flatMap((p) => p.lessons);
  const doneN = all.filter((l) => isDoneToday(l.id)).length;
  const pct = all.length ? Math.round((doneN / all.length) * 100) : 0;

  // অনেকদিন করা হয়নি এমন স্কিলের সতর্কতা
  const alerts = allSkills().map(({ def, st }) => {
    const d = daysSince(st);
    if (st.status === "active" && d !== null && d >= 3) {
      return `<div class="alert ${d >= 10 ? "bad" : ""}"><span>${def.emoji} <b>${esc(def.name)}</b>: ${bn(d)} দিন ধরে করা হয়নি। আজ ছোট একটা কাজ দিয়ে ফিরে আসুন!</span></div>`;
    }
    if (st.status === "paused") {
      const since = daysBetween(st.statusSince, today());
      return `<div class="alert info"><span>${def.emoji} <b>${esc(def.name)}</b> ${bn(since)} দিন ধরে বিরতিতে আছে।</span><button class="btn small" data-action="status" data-skill="${def.id}" data-value="active">আবার শুরু করি</button></div>`;
    }
    return "";
  }).join("");

  const groups = plan.map(({ def, st, lessons, finished }) => {
    if (finished) {
      return `<div class="alert info"><span>${def.emoji} <b>${esc(def.name)}</b>: সব লেসন শেষ! 🎉 Claude কে বলুন নতুন লেসন যোগ করতে, অথবা স্কিলটা "শেষ" করে দিন।</span><button class="btn small" data-action="status" data-skill="${def.id}" data-value="done">শেষ করেছি</button></div>`;
    }
    if (!def.lessons.length) {
      const did = st.practice.includes(today());
      return `<article class="lesson ${did ? "done" : ""}" style="--c:${def.color}">
        <div class="lesson-head"><span class="tag">${def.emoji} ${esc(def.name)}</span></div>
        <h3>আজ ${esc(def.name)} নিয়ে কিছু করেছেন?</h3>
        <p class="why">এই স্কিলে এখনো লেসন নেই। নিজে কিছু করলে বা Claude এর সাথে করলে নিচে চাপুন।</p>
        <div class="lesson-actions" style="margin-top:10px">
          <button class="btn ${did ? "" : "good"}" data-action="practice" data-skill="${def.id}">${did ? "↩️ বাতিল করুন" : "✅ আজ করেছি"}</button>
        </div></article>`;
    }
    return lessons.map((l) => lessonCard(def, st, l)).join("");
  }).join("");

  el.innerHTML = `
    ${alerts ? `<div class="alerts">${alerts}</div>` : ""}
    <div class="section">
      <h2>☀️ আজকে কী শিখবো</h2>
      <div class="progress-today card">
        <span>${bn(doneN)}/${bn(all.length)} শেষ</span>
        <div class="bar"><div style="width:${pct}%"></div></div>
        <b>${bn(pct)}%</b>
      </div>
      <p class="muted" style="margin-bottom:14px">প্রায়োরিটি অনুযায়ী সাজানো। প্রতিটা লেসন খুলে "Claude-কে বলুন" অংশটা কপি করে দিন, Claude করবে আর আপনি দেখে দেখে নিজে করবেন।</p>
      <div class="lesson-grid">${groups || `<div class="empty card">আজ কোনো চলমান স্কিল নেই। "স্কিল ও প্রোগ্রেস" থেকে একটা চালু করুন।</div>`}</div>
    </div>`;
}

function lessonCard(def, st, l) {
  const done = st.done[l.id] === today();
  return `<article class="lesson ${done ? "done" : ""}" style="--c:${def.color}">
    <div class="lesson-head">
      <span class="tag">${def.emoji} ${esc(def.name)}</span>
      <span class="muted" style="font-size:.85rem">⏱ ${bn(l.min)} মিনিট</span>
    </div>
    <h3>${esc(l.title)}</h3>
    <p class="why">${esc(l.why)}</p>
    <details ${done ? "" : "open"}>
      <summary>কীভাবে করবেন</summary>
      <ol>${l.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
      <div class="prompt">
        <div class="prompt-label">🤖 Claude-কে বলুন (কপি করে দিন):</div>
        <p>${esc(l.prompt)}</p>
        <button class="btn small" data-action="copy" data-lesson="${l.id}">📋 কপি করুন</button>
      </div>
    </details>
    <div class="lesson-actions">
      <button class="btn ${done ? "" : "good"}" data-action="lesson" data-skill="${def.id}" data-lesson="${l.id}">
        ${done ? "↩️ বাতিল করুন" : "✅ করে ফেলেছি"}
      </button>
    </div>
  </article>`;
}

// ===================== রেন্ডার: স্কিল ও প্রোগ্রেস =====================
function renderSkills() {
  const el = document.getElementById("view-skills");
  const list = allSkills();
  const live = list.filter(({ st }) => st.status === "active" || st.status === "paused");
  const closed = list.filter(({ st }) => st.status === "dropped" || st.status === "done");

  el.innerHTML = `
    <div class="section">
      <h2>🎯 যা শিখছি</h2>
      <div class="skill-grid">${live.map((x, i) => skillCard(x, i, live.length)).join("") || `<div class="empty card">কোনো চলমান স্কিল নেই</div>`}</div>
    </div>
    ${closed.length ? `<div class="section"><h2>📦 শেষ করা বা বাদ দেওয়া</h2><div class="skill-grid">${closed.map((x) => skillCard(x, -1, 0)).join("")}</div></div>` : ""}
    <div class="section card">
      <h2>➕ নতুন স্কিল যোগ করুন</h2>
      <form class="add-form" id="addSkillForm">
        <input name="emoji" placeholder="🎸" maxlength="4" />
        <input name="name" placeholder="যেমন: ভিডিও এডিটিং" required />
        <button class="btn primary" type="submit">যোগ করুন</button>
      </form>
      <p class="muted" style="margin-top:8px;font-size:.88rem">নতুন স্কিলে শুরুতে লেসন থাকবে না, শুধু "আজ করেছি" দিয়ে দিন গুনবে। লেসন যোগ করতে Claude কে বলুন: "learning-hub এর ওই স্কিলে ১০টা করে-শেখা লেসন যোগ করো"।</p>
    </div>`;
}

function skillCard({ def, st }, index, count) {
  const p = progress({ def, st });
  const last = lastSession(st);
  const dim = st.status === "dropped" || st.status === "paused";
  const custom = def.id.startsWith("custom-");

  // চক্রে ঘুরছি কিনা বোঝার জন্য
  let cycleNote = "";
  if (st.cycles >= 2) {
    const tip = st.cycles >= 3 && p.pct < 50
      ? " বারবার শুরু-থামা হচ্ছে। লক্ষ্য ছোট করুন: দিনে মাত্র ১০ মিনিট।"
      : "";
    cycleNote = `<div class="cycle-note">🔄 এটা আপনার <b>${bn(st.cycles)} নম্বর চক্র</b>। শেষবার নতুন করে শুরু: ${fmtDate(st.cycleStarts[st.cycleStarts.length - 1])}।${tip}</div>`;
  }

  const statusOptions = Object.entries(STATUS)
    .map(([k, v]) => `<option value="${k}" ${st.status === k ? "selected" : ""}>${v.label}</option>`).join("");

  const lessons = def.lessons.length
    ? `<details><summary class="muted" style="cursor:pointer">সব লেসন দেখুন (${bn(p.done)}/${bn(p.total)})</summary>
        <ul class="lesson-list">${def.lessons.map((l) => `
          <li><input type="checkbox" data-action="check" data-skill="${def.id}" data-lesson="${l.id}" ${st.done[l.id] ? "checked" : ""} />
          <span>${esc(l.title)}</span>${st.done[l.id] ? `<span class="date">${fmtDate(st.done[l.id])}</span>` : ""}</li>`).join("")}
        </ul></details>`
    : "";

  return `<article class="card skill-card ${dim ? "dim" : ""}" style="--c:${def.color}">
    <div class="skill-top">
      <div class="skill-title">
        <span class="skill-emoji">${esc(def.emoji)}</span>
        <div><h3>${esc(def.name)}</h3>${index >= 0 ? `<span class="prio">প্রায়োরিটি #${bn(index + 1)}</span>` : ""}</div>
      </div>
      ${index >= 0 ? `<div class="prio-btns">
        <button data-action="prio" data-skill="${def.id}" data-dir="-1" ${index === 0 ? "disabled" : ""} title="প্রায়োরিটি বাড়ান">▲</button>
        <button data-action="prio" data-skill="${def.id}" data-dir="1" ${index === count - 1 ? "disabled" : ""} title="প্রায়োরিটি কমান">▼</button>
      </div>` : ""}
    </div>

    <div class="skill-progress">
      <div class="row"><span>${def.lessons.length ? `${bn(p.done)}/${bn(p.total)} লেসন` : "লেসন নেই"}</span><b>${def.lessons.length ? bn(p.pct) + "%" : ""}</b></div>
      <div class="bar"><div style="width:${p.pct}%"></div></div>
    </div>

    ${gapBadge(st)}

    <div class="facts">
      <div class="fact"><small>শেষবার করেছিলাম</small><b>${last ? fmtDate(last) : "—"}</b></div>
      <div class="fact"><small>মোট শেখার দিন</small><b>${bn(st.sessions.length)} দিন</b></div>
      <div class="fact"><small>প্রথম শুরু</small><b>${st.sessions[0] ? fmtDate(st.sessions[0]) : "—"}</b></div>
      <div class="fact"><small>কতবার শুরু করেছি</small><b>${bn(st.cycles)} বার</b></div>
    </div>

    ${cycleNote}

    <div class="skill-actions">
      <select data-action="status" data-skill="${def.id}">${statusOptions}</select>
      <button class="btn small" data-action="practice" data-skill="${def.id}">${st.practice.includes(today()) ? "↩️ আজকের অনুশীলন বাতিল" : "✅ আজ অনুশীলন করেছি"}</button>
      ${custom ? `<button class="btn small danger" data-action="delete" data-skill="${def.id}">মুছুন</button>` : ""}
    </div>
    ${lessons}
  </article>`;
}

// ===================== রেন্ডার: ইতিহাস =====================
function renderHistory() {
  const el = document.getElementById("view-history");
  const DAYS = 28;
  const t = today();
  const days = Array.from({ length: DAYS }, (_, i) => addDays(t, i - DAYS + 1));
  const list = allSkills();

  const head = days.map((d) => `<th>${parse(d).getDate() === 1 || d === days[0] ? BN_MONTHS[parse(d).getMonth()].slice(0, 3) : ""}<br>${bn(parse(d).getDate())}</th>`).join("");
  const rows = list.map(({ def, st }) => `<tr style="--c:${def.color}">
      <td class="name">${esc(def.emoji)} ${esc(def.name)}</td>
      ${days.map((d) => `<td class="cell ${st.sessions.includes(d) ? "on" : ""} ${st.cycleStarts.includes(d) && st.cycleStarts[0] !== d ? "cycle" : ""} ${d === t ? "today" : ""}" title="${fmtDate(d)}"></td>`).join("")}
    </tr>`).join("");

  // সব ঘটনার তালিকা (নতুন আগে)
  const events = [];
  for (const { def, st } of list) {
    for (const l of def.lessons) if (st.done[l.id]) events.push({ date: st.done[l.id], text: `${def.emoji} ${esc(l.title)}` });
    for (const d of st.practice) events.push({ date: d, text: `${def.emoji} ${esc(def.name)}: অনুশীলন` });
    st.cycleStarts.forEach((d, i) => { if (i > 0) events.push({ date: d, text: `🔄 ${esc(def.name)}: ${bn(i + 1)} নম্বর চক্র শুরু` }); });
  }
  events.sort((a, b) => b.date.localeCompare(a.date));

  const weekDays = new Set(list.flatMap(({ st }) => st.sessions.filter((d) => daysBetween(d, t) < 7)));

  el.innerHTML = `
    <div class="section card">
      <h2>📅 গত ${bn(DAYS)} দিন</h2>
      <p class="muted" style="margin-bottom:12px">রঙিন ঘর = ওই দিন শিখেছি। হলুদ বর্ডার = বিরতির পর নতুন চক্র শুরু। এই সপ্তাহে ${bn(weekDays.size)}/৭ দিন শিখেছেন।</p>
      <div class="heat-wrap"><table class="heat"><tr><th></th>${head}</tr>${rows}</table></div>
    </div>
    <div class="section card">
      <h2>📝 কী কবে করেছি</h2>
      ${events.length ? `<ul class="log">${events.slice(0, 40).map((e) => `<li><span class="when">${fmtDate(e.date)}</span><span>${e.text}</span></li>`).join("")}</ul>` : `<div class="empty">এখনো কিছু নেই</div>`}
    </div>`;
}

// ===================== রেন্ডার: সেটিংস =====================
function renderSettings() {
  document.getElementById("view-settings").innerHTML = `
    <div class="settings-grid">
      <div class="card">
        <h2>💾 ব্যাকআপ নিন</h2>
        <p>সব তথ্য শুধু এই ব্রাউজারে আছে। ব্রাউজারের ডেটা মুছলে বা অন্য ফোন/পিসিতে খুললে দেখা যাবে না। মাঝে মাঝে ব্যাকআপ ফাইল ডাউনলোড করে রাখুন।</p>
        <button class="btn primary" data-action="export">⬇️ ব্যাকআপ ডাউনলোড</button>
      </div>
      <div class="card">
        <h2>📂 ব্যাকআপ থেকে ফেরত আনুন</h2>
        <p>অন্য ডিভাইসে বা ডেটা হারালে আগের ব্যাকআপ ফাইলটা দিন। এখনকার তথ্য বদলে যাবে।</p>
        <button class="btn" data-action="import">⬆️ ফাইল বেছে নিন</button>
      </div>
      <div class="card">
        <h2>🧹 শুরু থেকে আবার</h2>
        <p>সব প্রোগ্রেস মুছে প্রথম দিনের অবস্থায় ফিরবে। আগে ব্যাকআপ নিয়ে নিন।</p>
        <button class="btn danger" data-action="reset">সব মুছে ফেলুন</button>
      </div>
    </div>`;
}

function renderAll() {
  renderTop();
  renderToday();
  renderSkills();
  renderHistory();
  renderSettings();
}

// ===================== কাজ (actions) =====================
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), 2600);
}

function findLesson(id) {
  for (const def of SKILLS.concat(state.customSkills)) {
    const l = def.lessons.find((x) => x.id === id);
    if (l) return l;
  }
}

function toggleLesson(skillId, lessonId, date = today()) {
  const st = state.skills[skillId];
  if (st.done[lessonId]) {
    const when = st.done[lessonId];
    delete st.done[lessonId];
    unlogIfEmpty(st, when);
    toast("বাতিল করা হলো");
  } else {
    st.done[lessonId] = date;
    if (st.status !== "active") setStatus(skillId, "active", true);
    const cycle = logSession(st, date);
    toast(cycle ? `🔄 আবার ফিরে এলেন! এটা ${bn(st.cycles)} নম্বর চক্র। এবার থামবেন না 💪` : "দারুণ! 🎉 একটা কাজ শেষ");
  }
}

function togglePractice(skillId) {
  const st = state.skills[skillId];
  const t = today();
  if (st.practice.includes(t)) {
    st.practice = st.practice.filter((d) => d !== t);
    unlogIfEmpty(st, t);
    toast("বাতিল করা হলো");
  } else {
    st.practice.push(t);
    if (st.status !== "active") setStatus(skillId, "active", true);
    const cycle = logSession(st, t);
    toast(cycle ? `🔄 আবার ফিরে এলেন! ${bn(st.cycles)} নম্বর চক্র শুরু।` : "✅ আজকের অনুশীলন লেখা হলো");
  }
}

function setStatus(skillId, value, silent = false) {
  const st = state.skills[skillId];
  if (st.status === value) return;
  // বিরতি বা বাদ থেকে ফিরলে, পরের কাজের দিনে নতুন চক্র গোনা হবে
  if (value === "active" && (st.status === "paused" || st.status === "dropped")) st.restartPending = true;
  st.status = value;
  st.statusSince = today();
  if (!silent) toast(`স্ট্যাটাস: ${STATUS[value].label}`);
}

function movePriority(skillId, dir) {
  const live = allSkills().filter(({ st }) => st.status === "active" || st.status === "paused");
  const i = live.findIndex((x) => x.def.id === skillId);
  const j = i + dir;
  if (j < 0 || j >= live.length) return;
  [live[i], live[j]] = [live[j], live[i]];
  live.forEach((x, k) => (x.st.priority = k + 1));
}

function addSkill(name, emoji) {
  const id = "custom-" + Date.now();
  state.customSkills.push({
    id, name, emoji: emoji || "⭐",
    color: COLORS[state.customSkills.length % COLORS.length],
    priority: 50, perDay: 1, lessons: [],
  });
  state.skills[id] = newSkillState();
  toast(`"${name}" যোগ হলো`);
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `learning-hub-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ===================== ইভেন্ট =====================
document.getElementById("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === btn));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + btn.dataset.tab));
  location.hash = btn.dataset.tab;
});

document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-action]");
  if (!el || el.tagName === "SELECT" || el.type === "checkbox") return;
  const { action, skill, lesson } = el.dataset;

  if (action === "copy") {
    try { await navigator.clipboard.writeText(findLesson(lesson).prompt); toast("📋 কপি হয়েছে! এখন Claude এ পেস্ট করুন"); }
    catch { toast("কপি করা গেল না"); }
    return;
  }
  if (action === "lesson") toggleLesson(skill, lesson);
  else if (action === "practice") togglePractice(skill);
  else if (action === "status") setStatus(skill, el.dataset.value);
  else if (action === "prio") movePriority(skill, Number(el.dataset.dir));
  else if (action === "delete") {
    if (!confirm("এই স্কিল আর এর সব প্রোগ্রেস মুছে ফেলবেন?")) return;
    state.customSkills = state.customSkills.filter((s) => s.id !== skill);
    delete state.skills[skill];
  }
  else if (action === "export") return exportData();
  else if (action === "import") return document.getElementById("importFile").click();
  else if (action === "reset") {
    if (!confirm("সত্যিই সব প্রোগ্রেস মুছে ফেলবেন? এটা ফেরানো যাবে না।")) return;
    localStorage.removeItem(LS_KEY);
    state = loadState();
    toast("শুরু থেকে আবার");
  }
  else return;
  save();
  renderAll();
});

document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.dataset.action === "status") setStatus(el.dataset.skill, el.value);
  else if (el.dataset.action === "check") {
    const st = state.skills[el.dataset.skill];
    if (el.checked !== Boolean(st.done[el.dataset.lesson])) toggleLesson(el.dataset.skill, el.dataset.lesson);
  } else return;
  save();
  renderAll();
});

document.addEventListener("submit", (e) => {
  if (e.target.id !== "addSkillForm") return;
  e.preventDefault();
  const f = new FormData(e.target);
  const name = String(f.get("name")).trim();
  if (!name) return;
  addSkill(name, String(f.get("emoji")).trim());
  save();
  renderAll();
});

document.getElementById("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data || typeof data.skills !== "object") throw new Error("bad file");
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    state = loadState();
    renderAll();
    toast("✅ ব্যাকআপ থেকে ফেরত আনা হলো");
  } catch {
    toast("এই ফাইলটা ঠিক ব্যাকআপ ফাইল না");
  }
  e.target.value = "";
});

// ঠিকানার শেষে #skills থাকলে সরাসরি ওই ট্যাব খুলবে
renderAll();
const startTab = location.hash.slice(1);
if (startTab) document.querySelector(`.tab[data-tab="${startTab}"]`)?.click();
