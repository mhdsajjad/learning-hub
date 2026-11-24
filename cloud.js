// =====================================================================
//  ব্যাকএন্ড: Firebase দিয়ে Google লগইন আর ক্লাউডে প্রোগ্রেস সেভ
//
//  কীভাবে কাজ করে:
//  - লগইন না করলে: আগের মতো শুধু এই ব্রাউজারে সেভ হয়।
//  - লগইন করলে: প্রোগ্রেস Firestore ডেটাবেসে users/{আপনার-id} ডকুমেন্টে
//    সেভ হয়, তাই পিসি আর ফোনে একই প্রোগ্রেস দেখা যায়।
//  - প্রথম লগইনে এই ব্রাউজারের আর ক্লাউডের প্রোগ্রেস মিলিয়ে (merge) এক করা হয়।
//
//  নিচের apiKey গোপন কিছু না, Firebase ওয়েব অ্যাপে এটা সবাই দেখতে পায়।
//  আসল সুরক্ষা হলো firestore.rules: শুধু আপনি নিজের ডেটা পড়তে/লিখতে পারবেন।
// =====================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDBVOhYSzfHZPdY9C6hxFAsyafLFF4rMAA",
  authDomain: "learning-hub-mhdsajjad.firebaseapp.com",
  projectId: "learning-hub-mhdsajjad",
  storageBucket: "learning-hub-mhdsajjad.firebasestorage.app",
  messagingSenderId: "42878209471",
  appId: "1:42878209471:web:e48e310381cba4ea3ce50a",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const box = document.getElementById("cloudBox");
let user = null;
let unsubscribe = null;
let saveTimer = null;
let syncStatus = "idle"; // idle | saving | saved | error

// ===================== উপরের লগইন বক্স =====================
function renderBox() {
  if (!user) {
    box.innerHTML = `<button class="btn primary" id="loginBtn">🔐 Google দিয়ে লগইন</button>
      <span class="cloud-note">লগইন করলে ফোন আর পিসিতে একই প্রোগ্রেস</span>`;
    return;
  }
  const statusText = {
    idle: "☁️ সিঙ্ক চালু",
    saving: "⏳ সেভ হচ্ছে...",
    saved: "☁️ ক্লাউডে সেভ হয়েছে",
    error: "⚠️ সেভ হয়নি, ইন্টারনেট দেখুন",
  }[syncStatus];
  const photo = user.photoURL ? `<img src="${user.photoURL}" alt="" referrerpolicy="no-referrer" />` : "👤";
  box.innerHTML = `<span class="cloud-user">${photo}<span><b>${escapeHtml(user.displayName || "আমি")}</b><small>${statusText}</small></span></span>
    <button class="btn small" id="logoutBtn">লগআউট</button>`;
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

box.addEventListener("click", async (e) => {
  if (e.target.id === "loginBtn") {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      console.error(err);
      if (err.code !== "auth/popup-closed-by-user") window.hub.toast("লগইন হয়নি: " + err.code);
    }
  }
  if (e.target.id === "logoutBtn") {
    await signOut(auth);
    window.hub.toast("লগআউট হয়েছে। প্রোগ্রেস এই ব্রাউজারেও থাকবে।");
  }
});

// ===================== ক্লাউডে সেভ =====================
const userDoc = () => doc(db, "users", user.uid);

async function pushToCloud() {
  if (!user) return;
  syncStatus = "saving";
  renderBox();
  try {
    const state = window.hub.getState();
    await setDoc(userDoc(), { data: JSON.stringify(state), updatedAt: state.updatedAt || Date.now(), savedAt: serverTimestamp() });
    syncStatus = "saved";
  } catch (err) {
    console.error(err);
    syncStatus = "error";
  }
  renderBox();
}

// app.js প্রতিবার কিছু বদলালে "hub:saved" পাঠায়; একটু পর একসাথে সেভ করি
window.addEventListener("hub:saved", () => {
  if (!user) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(pushToCloud, 800);
});

// ===================== দুই জায়গার প্রোগ্রেস মেলানো =====================
// সেশন, শেষ করা লেসন, অনুশীলন: দুই দিক থেকে সব রাখি (কিছু হারায় না)
// স্ট্যাটাস, প্রায়োরিটি: যেটা পরে বদলানো হয়েছে সেটা রাখি
function merge(local, remote) {
  const newer = (remote.updatedAt || 0) > (local.updatedAt || 0) ? remote : local;
  const older = newer === remote ? local : remote;
  const out = structuredClone(newer);

  const known = new Set((out.customSkills || []).map((s) => s.id));
  out.customSkills = [...(out.customSkills || []), ...(older.customSkills || []).filter((s) => !known.has(s.id))];

  const ids = new Set([...Object.keys(local.skills || {}), ...Object.keys(remote.skills || {})]);
  out.skills ||= {};
  for (const id of ids) {
    const a = local.skills?.[id];
    const b = remote.skills?.[id];
    if (!a || !b) { out.skills[id] = structuredClone(a || b); continue; }
    const o = out.skills[id];
    o.sessions = [...new Set([...a.sessions, ...b.sessions])].sort();
    o.practice = [...new Set([...(a.practice || []), ...(b.practice || [])])].sort();
    o.done = { ...b.done };
    for (const [k, d] of Object.entries(a.done)) if (!o.done[k] || d < o.done[k]) o.done[k] = d;
    o.cycleStarts = [...new Set([...a.cycleStarts, ...b.cycleStarts])].sort();
    o.cycles = o.cycleStarts.length;
  }
  out.updatedAt = Math.max(local.updatedAt || 0, remote.updatedAt || 0);
  out.seedFix1 = true;
  return out;
}

// ===================== লগইন অবস্থা বদলালে =====================
onAuthStateChanged(auth, async (u) => {
  user = u;
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  syncStatus = "idle";
  renderBox();
  if (!user) return;

  try {
    // প্রথমবার: ক্লাউড আর এই ব্রাউজারের প্রোগ্রেস মিলিয়ে নিই
    const snap = await getDoc(userDoc());
    const local = window.hub.getState();
    if (snap.exists()) {
      const remote = JSON.parse(snap.data().data);
      window.hub.replaceState(merge(local, remote));
      window.hub.toast("☁️ ক্লাউড থেকে প্রোগ্রেস আনা হলো");
    } else {
      window.hub.toast("☁️ প্রথমবার: এই ব্রাউজারের প্রোগ্রেস ক্লাউডে তোলা হচ্ছে");
    }
    await pushToCloud();

    // অন্য ডিভাইসে কিছু বদলালে এখানে সাথে সাথে চলে আসবে
    unsubscribe = onSnapshot(userDoc(), (s) => {
      if (!s.exists() || s.metadata.hasPendingWrites) return;
      const remote = JSON.parse(s.data().data);
      if ((remote.updatedAt || 0) > (window.hub.getState().updatedAt || 0)) {
        window.hub.replaceState(remote);
        window.hub.toast("🔄 অন্য ডিভাইস থেকে আপডেট এসেছে");
      }
    });
  } catch (err) {
    console.error(err);
    syncStatus = "error";
    renderBox();
    window.hub.toast("ক্লাউডের সাথে যুক্ত হতে পারিনি: " + (err.code || err.message));
  }
});

renderBox();
