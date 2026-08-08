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

  /* ---------- 联系表单：生成邮件链接 ---------- */
  const form = document.getElementById("contact-form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();
    const subject = encodeURIComponent("来自个人网站的留言");
    const body = encodeURIComponent("姓名：" + name + "\n邮箱：" + email + "\n\n" + message);
    window.location.href = "mailto:your@email.com?subject=" + subject + "&body=" + body;
  });

  /* ---------- 页脚年份 ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();
})();
