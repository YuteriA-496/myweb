/* ==========================================================
   个人网站交互脚本
   ========================================================== */

(function () {
  "use strict";

  /* ---------- 主题切换（记忆用户选择） ---------- */
  const root = document.documentElement;
  const themeToggle = document.getElementById("theme-toggle");

  themeToggle.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    localStorage.setItem("theme", next);
  });

  /* ---------- 移动端菜单 ---------- */
  const header = document.getElementById("site-header");
  const menuToggle = document.getElementById("menu-toggle");
  const navLinks = document.getElementById("nav-links");

  menuToggle.addEventListener("click", () => {
    const open = header.classList.toggle("menu-open");
    menuToggle.setAttribute("aria-expanded", String(open));
  });

  navLinks.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      header.classList.remove("menu-open");
      menuToggle.setAttribute("aria-expanded", "false");
    }
  });

  /* ---------- 滚动状态：导航高亮 + 头部阴影 ---------- */
  const sections = Array.from(document.querySelectorAll("main section[id]"));
  const navLinkEls = Array.from(document.querySelectorAll(".nav-link"));

  function updateActiveLink() {
    const pos = window.scrollY + 120;
    let current = sections[0] ? sections[0].id : "";

    for (const section of sections) {
      if (section.offsetTop <= pos) current = section.id;
    }

    navLinkEls.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === "#" + current);
    });

    header.classList.toggle("scrolled", window.scrollY > 10);
  }

  window.addEventListener("scroll", updateActiveLink, { passive: true });
  updateActiveLink();

  /* ---------- 入场动画 ---------- */
  const revealEls = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("visible"));
  }

  /* ---------- 联系表单：留言写入 Supabase（替代 mailto，不依赖本地邮件客户端） ---------- */
  const SUPABASE_URL = "https://mfgmvnpapndqmudfxdxa.supabase.co";
  const SUPABASE_KEY = "sb_publishable_uvbGsf4aLqPASyrjkrwAAg_Ov2JGkPn";

  const form = document.getElementById("contact-form");
  const formName = document.getElementById("form-name");
  const formEmail = document.getElementById("form-email");
  const formMessage = document.getElementById("form-message");
  const formStatus = document.getElementById("form-status");
  const formSubmit = document.getElementById("form-submit");

  function showStatus(text, type) {
    formStatus.textContent = text;
    formStatus.className = "form-status " + type;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = formName.value.trim();
    const email = formEmail.value.trim();
    const message = formMessage.value.trim();

    if (!name || !email || !message) {
      showStatus("请把名字、邮箱和想说的话都填上～", "error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showStatus("邮箱格式不太对，检查一下？", "error");
      return;
    }

    formSubmit.disabled = true;
    showStatus("正在发送…", "info");
    try {
      const res = await fetch(SUPABASE_URL + "/rest/v1/messages", {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: "Bearer " + SUPABASE_KEY,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({ name, email, message })
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      form.reset();
      showStatus("发送成功，谢谢你的留言！", "success");
    } catch {
      showStatus("发送失败，请稍后再试。", "error");
    } finally {
      formSubmit.disabled = false;
    }
  });

  /* ---------- 页脚年份 ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();
})();
