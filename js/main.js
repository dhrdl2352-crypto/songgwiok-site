// 모바일 메뉴 토글
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
  }

  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  if (lightbox && lightboxImg) {
    document.querySelectorAll(".gallery-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        lightboxImg.src = btn.getAttribute("data-src");
        lightbox.hidden = false;
      });
    });
    const closeLightbox = () => {
      lightbox.hidden = true;
      lightboxImg.src = "";
    };
    lightbox.addEventListener("click", closeLightbox);
    const closeBtn = lightbox.querySelector(".lightbox-close");
    if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
    });
  }

  const form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("cf-name").value.trim();
      const phone = document.getElementById("cf-phone").value.trim();
      const message = document.getElementById("cf-message").value.trim();

      if (!name || !message) {
        alert("이름과 문의 내용을 입력해 주세요.");
        return;
      }

      const subject = encodeURIComponent(`[강의문의] ${name}님의 문의`);
      const body = encodeURIComponent(
        `이름: ${name}\n연락처: ${phone || "미기재"}\n\n문의내용:\n${message}`
      );
      const to = CONFIG.CONTACT_EMAIL.startsWith("여기에_") ? "" : CONFIG.CONTACT_EMAIL;

      if (!to) {
        alert("아직 문의를 받을 이메일 주소가 설정되지 않았습니다. data-loader.js의 CONTACT_EMAIL을 설정해 주세요.");
        return;
      }

      window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    });
  }
});
