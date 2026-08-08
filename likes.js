/* ==========================================================
   点赞模块
   - 每人每天最多点赞 10 次（按浏览器/设备统计）
   - 默认使用本地计数；如需全网统一统计，接入后端即可
   ========================================================== */

(function () {
  "use strict";

  const DAILY_LIMIT = 10;
  const STATE_KEY = "yuteria_likes_state"; // { date: "YYYY-MM-DD", used: n }
  const LOCAL_TOTAL_KEY = "yuteria_likes_total"; // 本地兜底总数

  /* ---------- 计数后端（可替换） ----------
     当前默认本地计数：每台设备的点赞各自统计。
     想变成全网真实统计时，在这里换成后端接口即可，例如：
     const BACKEND = {
       async get() { const r = await fetch("你的后端/get"); return (await r.json()).value; },
       async hit() { const r = await fetch("你的后端/hit"); return (await r.json()).value; }
     };
  */
  const BACKEND = {
    async get() {
      return null;
    },
    async hit() {
      return null;
    }
  };

  /* ---------- 安全存储（隐私模式下不报错） ---------- */
  const store = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* 忽略 */
      }
    }
  };

  function todayKey() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function readState() {
    const raw = store.get(STATE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.date === todayKey() && typeof parsed.used === "number") {
          return parsed;
        }
      } catch {
        /* 数据损坏则重置 */
      }
    }
    return { date: todayKey(), used: 0 };
  }

  function saveState(state) {
    store.set(STATE_KEY, JSON.stringify(state));
  }

  function localTotal() {
    return parseInt(store.get(LOCAL_TOTAL_KEY) || "0", 10) || 0;
  }

  /* ---------- DOM ---------- */
  const box = document.getElementById("likes-box");
  const btn = document.getElementById("like-btn");
  const totalEl = document.getElementById("like-total");
  const todayEl = document.getElementById("like-today");
  const particles = document.getElementById("like-particles");
  if (!box || !btn || !totalEl || !todayEl) return;

  const state = readState();
  let total = localTotal();

  function renderToday() {
    const left = Math.max(0, DAILY_LIMIT - state.used);
    todayEl.textContent =
      left > 0 ? "今日还可点赞 " + left + " 次" : "今日点赞已达上限，明天再来吧～";
  }

  function renderTotal(value) {
    total = value;
    totalEl.textContent = String(total);
    totalEl.classList.remove("pop");
    void totalEl.offsetWidth; // 强制重排以重放动画
    totalEl.classList.add("pop");
  }

  function spawnParticles() {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      p.className = "particle";
      const angle = Math.random() * Math.PI * 2;
      const dist = 46 + Math.random() * 46;
      p.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      p.style.setProperty("--dy", Math.sin(angle) * dist - 28 + "px");
      p.style.setProperty("--rot", Math.random() * 200 - 100 + "deg");
      p.style.setProperty("--size", 8 + Math.random() * 8 + "px");
      p.style.setProperty("--delay", Math.random() * 0.08 + "s");
      particles.appendChild(p);
      p.addEventListener("animationend", () => p.remove(), { once: true });
    }

    const plus = document.createElement("span");
    plus.className = "like-plus";
    plus.textContent = "+1";
    particles.appendChild(plus);
    plus.addEventListener("animationend", () => plus.remove(), { once: true });
  }

  function showLimited() {
    box.classList.remove("limited");
    void box.offsetWidth;
    box.classList.add("limited");
    todayEl.textContent = "今日点赞已达上限（10 次），明天再来吧～";
  }

  btn.addEventListener("click", async () => {
    if (state.used >= DAILY_LIMIT) {
      showLimited();
      return;
    }

    state.used += 1;
    saveState(state);
    renderToday();
    btn.classList.add("liked");

    btn.classList.remove("liking");
    void btn.offsetWidth;
    btn.classList.add("liking");
    spawnParticles();
    renderTotal(total + 1);

    // 若接入了后端，用后端返回的真实总数覆盖
    const next = await BACKEND.hit();
    if (typeof next === "number") {
      renderTotal(next);
      store.set(LOCAL_TOTAL_KEY, String(next));
    } else {
      store.set(LOCAL_TOTAL_KEY, String(total));
    }
  });

  /* ---------- 初始化 ---------- */
  (async () => {
    const serverTotal = await BACKEND.get();
    if (typeof serverTotal === "number") {
      renderTotal(serverTotal);
      store.set(LOCAL_TOTAL_KEY, String(serverTotal));
    } else {
      renderTotal(localTotal());
    }
    if (state.used > 0) btn.classList.add("liked");
    renderToday();
  })();
})();
