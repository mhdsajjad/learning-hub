// ===== কথোপকথন ট্যাব (data/talk.js থেকে ডেটা নেয়) =====
// esc() আর toast() আসে app.js থেকে

let talkCat = "সব"; // compliment ফিল্টার

// তালিকা থেকে একটা র‍্যান্ডম জিনিস
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// আগে থেকে দেওয়া + নিজের যোগ করা compliment একসাথে (নিজেরগুলো state-এ সেভ থাকে)
function allCompliments() {
  const mine = (state.myCompliments || []).map((c) => ({ ...c, mine: true }));
  return mine.concat(COMPLIMENTS);
}

function renderTalk() {
  const el = document.getElementById("view-talk");

  // প্রথম কয়েক সেকেন্ড: ধাপে ধাপে
  const steps = FIRST_SECONDS.map((s) => `
    <div class="talk-step"><span class="tag">${esc(s.t)}</span>
      <div><b>${esc(s.do)}</b><p class="muted">${esc(s.why)}</p></div></div>`).join("");

  // প্রশ্নগুলো ধরন অনুযায়ী ভাগ
  const cats = [...new Set(STARTERS.map((s) => s.cat))];
  const starters = cats.map((c) => `
    <details class="card talk-group"><summary>${esc(c)} (${bn(STARTERS.filter((s) => s.cat === c).length)})</summary>
      <ul>${STARTERS.filter((s) => s.cat === c).map((s) => `<li>${esc(s.q)} <button class="btn small" data-talk="copy" data-text="${esc(s.q)}">📋</button></li>`).join("")}</ul>
    </details>`).join("");

  // compliment ফিল্টার চিপ
  const ALL = allCompliments();
  const cCats = ["সব", ...new Set(ALL.map((c) => c.cat))];
  const chips = cCats.map((c) => `<button class="btn small ${c === talkCat ? "primary" : ""}" data-talk="cat" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
  const list = ALL.filter((c) => talkCat === "সব" || c.cat === talkCat).map((c) => `
    <div class="card talk-comp">
      <p class="talk-say">“${esc(c.say)}”</p>
      <p class="muted">🕐 কখন: ${esc(c.when)}</p>
      <button class="btn small" data-talk="copy" data-text="${esc(c.say)}">📋 কপি</button>
      ${c.mine ? `<button class="btn small" data-talk="delC" data-id="${esc(c.id)}">🗑️ মুছুন</button>` : ""}
    </div>`).join("");

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
      <div class="talk-grid">${OPENERS.map((o) => `
        <div class="card talk-comp">
          <p class="talk-say">“${esc(o.say)}”</p>
          <p class="muted">🕐 কখন: ${esc(o.when)}</p>
          <button class="btn small" data-talk="copy" data-text="${esc(o.say)}">📋 কপি</button>
        </div>`).join("")}</div>
    </div>

    <div class="section">
      <h2>💬 কথা চালিয়ে নেওয়ার প্রশ্ন</h2>
      <p class="muted">‘কেমন আছেন, কী অবস্থা’-এর বদলে এগুলো। মানুষ ‘ভালো’ বলে থামবে না, নিজের গল্প বলতে শুরু করবে।</p>
      <div class="card talk-random">
        <p id="talkQ" class="talk-say">বাটন চাপো, একটা প্রশ্ন পাবে 👇</p>
        <button class="btn primary" data-talk="randQ">🎲 একটা প্রশ্ন দাও</button>
      </div>
      ${starters}
    </div>

    <div class="section">
      <h2>🌟 Compliment তালিকা</h2>
      <div class="card talk-random">
        <p id="talkC" class="talk-say">ভুলে গেলে এখান থেকে একটা নাও 👇</p>
        <button class="btn primary" data-talk="randC">🎲 একটা compliment দাও</button>
      </div>
      <form class="card add-form talk-add" id="addCompForm">
        <b style="width:100%">➕ নিজের compliment যোগ করো</b>
        <input name="say" placeholder="কী বলবে? যেমন: আপনার হাসিটা খুব genuine" required />
        <input name="when" placeholder="কখন বলবে? (ঐচ্ছিক)" />
        <input name="cat" placeholder="ধরন (ঐচ্ছিক)" list="compCats" />
        <datalist id="compCats">${cCats.slice(1).map((c) => `<option value="${esc(c)}">`).join("")}</datalist>
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

// এই ট্যাবের সব বাটনের ক্লিক এখানে
document.getElementById("view-talk").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-talk]");
  if (!b) return;
  const act = b.dataset.talk;
  if (act === "randQ") document.getElementById("talkQ").textContent = pick(STARTERS).q;
  else if (act === "randO") {
    const o = pick(OPENERS);
    document.getElementById("talkO").innerHTML = `“${esc(o.say)}”<br><small class="muted">🕐 ${esc(o.when)}</small>`;
  }
  else if (act === "randC") {
    const c = pick(allCompliments());
    document.getElementById("talkC").innerHTML = `“${esc(c.say)}”<br><small class="muted">🕐 ${esc(c.when)}</small>`;
  } else if (act === "delC") {
    if (!confirm("এই compliment মুছে ফেলবে?")) return;
    state.myCompliments = state.myCompliments.filter((c) => c.id !== b.dataset.id);
    save(); renderTalk(); toast("🗑️ মুছে ফেলা হয়েছে");
  } else if (act === "cat") { talkCat = b.dataset.cat; renderTalk(); }
  else if (act === "copy") {
    try { await navigator.clipboard.writeText(b.dataset.text); toast("📋 কপি হয়েছে"); }
    catch { toast("কপি করা গেল না"); }
  }
});

// নতুন compliment যোগ (ফর্ম সাবমিট)
document.getElementById("view-talk").addEventListener("submit", (e) => {
  if (e.target.id !== "addCompForm") return;
  e.preventDefault();
  const f = new FormData(e.target);
  const say = f.get("say").trim();
  if (!say) return;
  state.myCompliments ||= [];
  state.myCompliments.unshift({
    id: "my" + Date.now(),
    say,
    when: f.get("when").trim() || "নিজের যোগ করা",
    cat: f.get("cat").trim() || "আমার",
  });
  save(); // লোকাল + লগইন থাকলে ক্লাউডে
  talkCat = "সব";
  renderTalk();
  toast("✅ compliment যোগ হয়েছে");
});

renderTalk();
