// Язык страницы до первой отрисовки: ?lang=, потом сохранённый выбор, потом язык браузера.
// Обычный скрипт в <head>: модули грузятся позже, без него английская версия мигала бы русским текстом.
(() => {
  const ok = (v) => v === "ru" || v === "en";
  let lang = new URLSearchParams(location.search).get("lang");
  try {
    if (ok(lang)) localStorage.setItem("merchant-ear.lang", lang);
    else lang = localStorage.getItem("merchant-ear.lang");
  } catch {}
  if (!ok(lang)) lang = /^(ru|uk|be|kk)\b/i.test(navigator.language || "") ? "ru" : "en";
  const root = document.documentElement;
  root.lang = lang;
  // Английский текст подставляет i18n.js; до этого страницу не показываем.
  // Если модули не загрузились, через 2 с показываем как есть.
  if (lang === "en") {
    root.setAttribute("data-i18n-pending", "");
    setTimeout(() => root.removeAttribute("data-i18n-pending"), 2000);
  }
})();
