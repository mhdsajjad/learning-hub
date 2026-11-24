// ===== কথোপকথন ট্যাব (data/talk.js থেকে ডেটা নেয়) =====
// esc(), toast(), save(), state আসে app.js থেকে

let talkCat = "সব"; // compliment ফিল্টার

// তালিকা থেকে একটা র‍্যান্ডম জিনিস
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// নিজের যোগ করা জিনিস state-এর এই ৩টা তালিকায় সেভ থাকে
// key = state-এ কোন নামে, base = আগে থেকে দেওয়া তালিকা
const MINE = {
  myOpeners: () => OPENERS,
  myStarters: () => STARTERS,
  myCompliments: () => COMPLIMENTS,
};

// আগে থেকে দেওয়া + নিজের যোগ করা একসাথে (নিজেরগুলো আগে, mine: true দাগ দিয়ে)
function withMine(key) {
  const mine = (state[key] || []).map((x) => ({ ...x, mine: true }));
  return mine.concat(MINE[key]());
}

// নিজের যোগ করা জিনিসে মোছার বাটন
const delBtn = (key, x) => x.mine
  ? `<button class="btn small" data-talk="del" data-key="${key}" data-id="${esc(x.id)}">🗑️</button>` : "";

// say + when কার্ড (opener আর compliment দুটোতেই একই ধাঁচ)
const sayCard = (key, x) => `
  <div class="card talk-comp">
    <p class="talk-say">“${esc(x.say)}”</p>
    <p class="muted">🕐 কখন: ${esc(x.when)}</p>
    <button class="btn small" data-talk="copy" data-text="${esc(x.say)}">📋 কপি</button>
    ${delBtn(key, x)}
  </div>`;

function renderTalk() {
  const el = document.getElementById("view-talk");

  // প্রথম কয়েক সেকেন্ড: ধাপে ধাপে
  const steps = FIRST_SECONDS.map((s) => `
    <div class="talk-step"><span class="tag">${esc(s.t)}</span>
      <div><b>${esc(s.do)}</b><p class="muted">${esc(s.why)}</p></div></div>`).join("");

  // প্রশ্নগুলো ধরন অনুযায়ী ভাগ
  const QS = withMine("myStarters");
  const cats = [...new Set(QS.map((s) => s.cat))];
  const starters = cats.map((c) => {
    const items = QS.filter((s) => s.cat === c);
    return `
    <details class="card talk-group"><summary>${esc(c)} (${bn(items.length)})</summary>
      <ul>${items.map((s) => `<li>${esc(s.q)} <button class="btn small" data-talk="copy" data-text="${esc(s.q)}">📋</button> ${delBtn("myStarters", s)}</li>`).join("")}</ul>
    </details>`;
  }).join("");

  // compliment ফিল্টার চিপ
  const ALL = withMine("myCompliments");
  const cCats = ["সব", ...new Set(ALL.map((c) => c.cat))];
  const chips = cCats.map((c) => `<button class="btn small ${c === talkCat ? "primary" : ""}" data-talk="cat" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
  const list = ALL.filter((c) => talkCat === "সব" || c.cat === talkCat).map((c) => sayCard("myCompliments", c)).join("");

  // ধরন বাছাইয়ের সাজেশন (datalist)
  const opts = (arr) => arr.map((c) => `<option value="${esc(c)}">`).join("");

  el.innerHTML = `
    <div class="section">
      <h2>⚡ প্রথম ৩-৪ সেকেন্ড</h2>
      <div class="card">${steps}</div>
    </div>

    <div class="section">
      <h2>🎯 হঠাৎ মনোযোগ কাড়া কথা</h2>
      <p class="muted">Unexpected বা মজার একটা লাইন, যাতে মানুষের autopilot ভেঙে পুরো attention তোমার দিকে আসে। হুবহু না বলে নিজের style-এ বলো।</p>
      <div class="card talk-random">
        <p id="talkO" class="talk-say">একটা fun opener নাও 👇</p>
        <button class="btn primary" data-talk="randO">🎲 Opener দাও</button>
      </div>
      <form class="card add-form talk-add" data-key="myOpeners">
        <b style="width:100%">➕ নিজের opener যোগ করো</b>
        <input name="say" placeholder="কী বলবে? যেমন: অবশেষে কেউ skip করলো না 😄" required />
        <input name="when" placeholder="কখন বলবে? (ঐচ্ছিক)" />
        <button class="btn primary" type="submit">যোগ করো</button>
      </form>
      <div class="talk-grid">${withMine("myOpeners").map((o) => sayCard("myOpeners", o)).join("")}</div>
    </div>

    <div class="section">
      <h2>💬 কথা চালিয়ে নেওয়ার প্রশ্ন</h2>
      <p class="muted">‘কেমন আছেন, কী অবস্থা’-এর বদলে এগুলো। মানুষ ‘ভালো’ বলে থামবে না, নিজের গল্প বলতে শুরু করবে।</p>
      <div class="card talk-random">
        <p id="talkQ" class="talk-say">বাটন চাপো, একটা প্রশ্ন পাবে 👇</p>
        <button class="btn primary" data-talk="randQ">🎲 একটা প্রশ্ন দাও</button>
      </div>
      <form class="card add-form talk-add" data-key="myStarters">
        <b style="width:100%">➕ নিজের প্রশ্ন যোগ করো</b>
        <input name="q" placeholder="প্রশ্ন, যেমন: চা না কফি? 😄" required />
        <input name="cat" placeholder="ধরন (ঐচ্ছিক)" list="qCats" />
        <datalist id="qCats">${opts(cats)}</datalist>
        <button class="btn primary" type="submit">যোগ করো</button>
      </form>
      ${starters}
    </div>

    <div class="section">
      <h2>🌟 Compliment তালিকা</h2>
      <div class="card talk-random">
        <p id="talkC" class="talk-say">ভুলে গেলে এখান থেকে একটা নাও 👇</p>
        <button class="btn primary" data-talk="randC">🎲 একটা compliment দাও</button>
      </div>
      <form class="card add-form talk-add" data-key="myCompliments">
        <b style="width:100%">➕ নিজের compliment যোগ করো</b>
        <input name="say" placeholder="কী বলবে? যেমন: আপনার হাসিটা খুব genuine" required />
        <input name="when" placeholder="কখন বলবে? (ঐচ্ছিক)" />
        <input name="cat" placeholder="ধরন (ঐচ্ছিক)" list="compCats" />
        <datalist id="compCats">${opts(cCats.slice(1))}</datalist>
        <button class="btn primary" type="submit">যোগ করো</button>
      </form>
      <div class="talk-chips">${chips}</div>
      <div class="talk-grid">${list}</div>
    </div>

    <div class="section talk-rules">
      <div class="card"><h3>✅ কখন compliment দেবে</h3><ul>${DO_RULES.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></div>
      <div class="card"><h3>🚫 কখন দেবে না</h3><ul>${DONT_RULES.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></div>
    </div>`;
}

// র‍্যান্ডম বাটনে say + when দেখানো
const showSay = (id, x) => {
  document.getElementById(id).innerHTML = `“${esc(x.say)}”<br><small class="muted">🕐 ${esc(x.when)}</small>`;
};

// এই ট্যাবের সব বাটনের ক্লিক এখানে
document.getElementById("view-talk").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-talk]");
  if (!b) return;
  const act = b.dataset.talk;
  if (act === "randQ") document.getElementById("talkQ").textContent = pick(withMine("myStarters")).q;
  else if (act === "randO") showSay("talkO", pick(withMine("myOpeners")));
  else if (act === "randC") showSay("talkC", pick(withMine("myCompliments")));
  else if (act === "del") {
    if (!confirm("এটা মুছে ফেলবে?")) return;
    const key = b.dataset.key;
    state[key] = (state[key] || []).filter((x) => x.id !== b.dataset.id);
    save(); renderTalk(); toast("🗑️ মুছে ফেলা হয়েছে");
  } else if (act === "cat") { talkCat = b.dataset.cat; renderTalk(); }
  else if (act === "copy") {
    try { await navigator.clipboard.writeText(b.dataset.text); toast("📋 কপি হয়েছে"); }
    catch { toast("কপি করা গেল না"); }
  }
});

// নতুন জিনিস যোগ (৩টা ফর্মই এখানে আসে, data-key দেখে বুঝি কোন তালিকায়)
document.getElementById("view-talk").addEventListener("submit", (e) => {
  const key = e.target.dataset.key;
  if (!MINE[key]) return;
  e.preventDefault();
  const f = new FormData(e.target);
  const val = (name) => (f.get(name) || "").trim();
  const item = { id: "my" + Date.now() };
  if (key === "myStarters") {
    item.q = val("q");
    if (!item.q) return;
    item.cat = val("cat") || "আমার";
  } else {
    item.say = val("say");
    if (!item.say) return;
    item.when = val("when") || "নিজের যোগ করা";
    if (key === "myCompliments") item.cat = val("cat") || "আমার";
  }
  state[key] ||= [];
  state[key].unshift(item);
  save(); // লোকাল + লগইন থাকলে ক্লাউডে
  if (key === "myCompliments") talkCat = "সব";
  renderTalk();
  toast("✅ যোগ হয়েছে");
});

renderTalk();
