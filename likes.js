/* ==========================================================
   点赞模块
   - 每人每天最多点赞 10 次（按浏览器/设备统计）
   - 总点赞数接入 Supabase 实现全网统一统计
   - 未配置 Supabase 密钥时自动降级为本地计数
   ========================================================== */

(function () {
  "use strict";

  const DAILY_LIMIT = 10;
  const STATE_KEY = "yuteria_likes_state"; // { date: "YYYY-MM-DD", used: n }
  const LOCAL_TOTAL_KEY = "yuteria_likes_total"; // 本地兜底总数

  /* ---------- Supabase 后端配置 ----------
     1. 注册 supabase.com（免费），新建项目
     2. 在项目 SQL Editor 里运行仓库中的 supabase-setup.sql
     3. 把下面两个值换成你项目的（Project Settings → API）：
        SUPABASE_URL  = Project URL，形如 https://xxxx.supabase.co
        SUPABASE_KEY  = Publishable key（旧版叫 anon key，可公开，安全）
     注意：不要使用 service_role key，绝不能放进网站。
  */
  const SUPABASE_URL = "https://mfgmvnpapndqmudfxdxa.supabase.co";
  const SUPABASE_KEY = "sb_publishable_uvbGsf4aLqPASyrjkrwAAg_Ov2JGkPn";

  const BACKEND = {
    async get() {
      if (!SUPABASE_KEY) return null;
      try {
        const r = await fetch(SUPABASE_URL + "/rest/v1/likes?select=count", {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: "Bearer " + SUPABASE_KEY
          }
        });
        if (!r.ok) return null;
        const data = await r.json();
        const n = Number(data && data[0] && data[0].count);
        return Number.isFinite(n) ? n : null;
      } catch {
        return null;
      }
    },
    async hit() {
      if (!SUPABASE_KEY) return null;
      try {
        const r = await fetch(SUPABASE_URL + "/rest/v1/rpc/add_like", {
          method: "POST",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: "Bearer " + SUPABASE_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ p_visitor: visitorId() })
        });
        if (!r.ok) return null;
        return await r.json(); // { total, used }
      } catch {
        return null;
      }
    }
  };

  function visitorId() {
    let id = store.get("yuteria_visitor");
    if (!id) {
      id =
        (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID()) ||
        Date.now().toString(36) + Math.random().toString(36).slice(2);
      store.set("yuteria_visitor", id);
    }
    return id;
  }

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

    // 后端返回 { total, used }：用真实总数覆盖，并同步服务端的当日次数
    const res = await BACKEND.hit();
    if (res && typeof res.total === "number") {
      renderTotal(res.total);
      store.set(LOCAL_TOTAL_KEY, String(res.total));
      if (typeof res.used === "number") {
        state.used = Math.min(DAILY_LIMIT, Math.max(state.used, res.used));
        saveState(state);
        renderToday();
      }
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
