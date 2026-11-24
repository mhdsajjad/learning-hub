// ===== কথোপকথন ট্যাব (data/talk.js থেকে ডেটা নেয়) =====
// esc() আর toast() আসে app.js থেকে

let talkCat = "সব"; // compliment ফিল্টার

// তালিকা থেকে একটা র‍্যান্ডম জিনিস
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

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
  const cCats = ["সব", ...new Set(COMPLIMENTS.map((c) => c.cat))];
  const chips = cCats.map((c) => `<button class="btn small ${c === talkCat ? "primary" : ""}" data-talk="cat" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
  const list = COMPLIMENTS.filter((c) => talkCat === "সব" || c.cat === talkCat).map((c) => `
    <div class="card talk-comp">
      <p class="talk-say">“${esc(c.say)}”</p>
      <p class="muted">🕐 কখন: ${esc(c.when)}</p>
      <button class="btn small" data-talk="copy" data-text="${esc(c.say)}">📋 কপি</button>
    </div>`).join("");

  el.innerHTML = `
    <div class="section">
      <h2>⚡ প্রথম ৩-৪ সেকেন্ড</h2>
      <div class="card">${steps}</div>
    </div>

    <div class="section">
      <h2>💬 কথা শুরুর প্রশ্ন</h2>
      <p class="muted">‘কেমন আছেন, নাম কী’ এর বদলে এগুলো জিজ্ঞেস করো, মানুষ নিজের গল্প বলতে শুরু করবে।</p>
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
  else if (act === "randC") {
    const c = pick(COMPLIMENTS);
    document.getElementById("talkC").innerHTML = `“${esc(c.say)}”<br><small class="muted">🕐 ${esc(c.when)}</small>`;
  } else if (act === "cat") { talkCat = b.dataset.cat; renderTalk(); }
  else if (act === "copy") {
    try { await navigator.clipboard.writeText(b.dataset.text); toast("📋 কপি হয়েছে"); }
    catch { toast("কপি করা গেল না"); }
  }
});

renderTalk();
