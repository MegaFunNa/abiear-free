// js/i18n.js
var root = document.documentElement;
var lang = root.lang === "en" ? "en" : "ru";
var isRu = lang === "ru";
var L = (ru, en) => isRu ? ru : en;
var ATTRS = ["title", "aria-label", "placeholder", "alt", "content"];
function applyStatic() {
  if (!isRu) {
    for (const el of document.querySelectorAll("[data-en]")) el.textContent = el.dataset.en;
    for (const a of ATTRS) {
      for (const el of document.querySelectorAll(`[data-en-${a}]`)) el.setAttribute(a, el.getAttribute(`data-en-${a}`));
    }
    const title = document.querySelector("title[data-en]");
    if (title) document.title = title.dataset.en;
  }
  for (const btn of document.querySelectorAll("[data-lang-switch]")) {
    btn.textContent = isRu ? "EN" : "RU";
    btn.title = isRu ? "English" : "Русский";
    btn.addEventListener("click", () => {
      const next = isRu ? "en" : "ru";
      try {
        localStorage.setItem("merchant-ear.lang", next);
      } catch {
      }
      const url = new URL(location.href);
      url.searchParams.delete("lang");
      location.replace(url);
    });
  }
  root.removeAttribute("data-i18n-pending");
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyStatic);
else applyStatic();

// js/guide.js
var dialog = document.createElement("dialog");
dialog.className = "map-dialog guide-dialog";
dialog.setAttribute("aria-label", L("Видеоинструкция", "Video guide"));
dialog.innerHTML = `
  <div class="map-dialog-head">
    <h2>${L("Как пользоваться", "How to use")}</h2>
    <button class="btn ghost small icon-only" type="button" data-close aria-label="${L("Закрыть", "Close")}">
      <svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
  </div>
  <video controls playsinline preload="none" poster="video/poster-${lang}.jpg"></video>`;
document.body.append(dialog);
var video = dialog.querySelector("video");
for (const btn of document.querySelectorAll("[data-guide]")) {
  btn.addEventListener("click", () => {
    if (!video.src) video.src = `video/instruction-${lang}.mp4`;
    dialog.showModal();
    video.play().catch(() => {
    });
  });
}
dialog.addEventListener("click", (e) => {
  if (e.target === dialog || e.target.closest("[data-close]")) dialog.close();
});
dialog.addEventListener("close", () => video.pause());
