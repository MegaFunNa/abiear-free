(async () => {
// js/i18n.js
var root = document.documentElement;
var current = root.lang === "en" ? "en" : "ru";
var L = (ru, en) => current === "ru" ? ru : en;
var ATTRS = ["title", "aria-label", "placeholder", "alt", "content"];
var label = (el, toEn) => el.tagName === "BUTTON" ? toEn ? "RU" : "EN" : toEn ? "Русский" : "English";
function remember(el, attr) {
  const key = attr ? `data-ru-${attr}` : "data-ru";
  if (el.hasAttribute(key)) return;
  el.setAttribute(key, attr ? el.getAttribute(attr) ?? "" : el.textContent);
}
function apply(next) {
  const toEn = next === "en";
  if (toEn) {
    for (const el of document.querySelectorAll("[data-en]")) {
      remember(el);
      el.textContent = el.dataset.en;
    }
    for (const a of ATTRS) {
      for (const el of document.querySelectorAll(`[data-en-${a}]`)) {
        remember(el, a);
        el.setAttribute(a, el.getAttribute(`data-en-${a}`));
      }
    }
  } else {
    for (const el of document.querySelectorAll("[data-ru]")) el.textContent = el.getAttribute("data-ru");
    for (const a of ATTRS) {
      for (const el of document.querySelectorAll(`[data-ru-${a}]`)) el.setAttribute(a, el.getAttribute(`data-ru-${a}`));
    }
  }
  const title = document.querySelector("title[data-en]");
  if (title) document.title = title.textContent.trim();
}
function bindSwitch(btn) {
  if (btn.dataset.langBound) return;
  btn.dataset.langBound = "1";
  btn.addEventListener("click", () => {
    const next = current === "ru" ? "en" : "ru";
    try {
      localStorage.setItem("merchant-ear.lang", next);
    } catch {
    }
    current = next;
    root.lang = next;
    apply(next);
    const url = new URL(location.href);
    if (next === "ru") url.searchParams.delete("lang");
    else url.searchParams.set("lang", "en");
    history.replaceState(null, "", url);
    for (const b of document.querySelectorAll("[data-lang-switch]")) {
      const toEn = current !== "ru";
      const spans = b.querySelectorAll("[data-lang]");
      if (spans.length) continue;
      b.textContent = label(b, toEn);
      b.title = toEn ? "English" : "Русский";
    }
  });
}
function applyStatic() {
  const app = !!document.querySelector("section.console");
  for (const btn of document.querySelectorAll("[data-lang-switch]")) {
    const toEn = current !== "ru";
    const spans = btn.querySelectorAll("[data-lang]");
    if (!spans.length) {
      btn.textContent = label(btn, toEn);
      btn.title = toEn ? "English" : "Русский";
    }
    if (app) {
      btn.addEventListener("click", () => {
        try {
          localStorage.setItem("merchant-ear.lang", current === "ru" ? "en" : "ru");
        } catch {
        }
        const url = new URL(location.href);
        url.searchParams.delete("lang");
        location.replace(url);
      });
    } else {
      bindSwitch(btn);
    }
  }
  if (current === "en") apply("en");
  root.removeAttribute("data-i18n-pending");
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyStatic);
else applyStatic();

// js/gate.js
var $ = (id) => document.getElementById(id);
var input = $("key");
var msg = $("msg");
var submit = $("submit");
{
  const box = $("ver");
  if (box) box.textContent = window.APP_VERSION ? `Версия ${window.APP_VERSION}` : "";
}
var wantsAdmin = /\/admin\.html$/.test(location.pathname);
if (wantsAdmin) $("buy").hidden = true;
var lockTimer = null;
async function windowsVersion() {
  const hints = navigator.userAgentData;
  if (hints?.platform !== "Windows") return null;
  try {
    const major = parseInt((await hints.getHighEntropyValues(["platformVersion"])).platformVersion, 10);
    return major >= 13 ? "Windows 11" : major >= 1 ? "Windows 10" : null;
  } catch {
    return null;
  }
}
var osVersion = windowsVersion();
var session = await fetch("/api/session").then((r) => r.json()).catch(() => ({ ok: false }));
if (session.ok && wantsAdmin && session.role !== "admin") {
  $("title").textContent = L("Нужен админ-ключ", "Admin key required");
  $("lead").textContent = L("С обычным ключом админка не открывается.", "A regular key does not open the admin panel.");
  $("logout").hidden = false;
} else if (wantsAdmin) {
  $("title").textContent = L("Админка", "Admin");
  $("lead").textContent = L("Введите админ-ключ.", "Enter the admin key.");
}
input.addEventListener("input", () => {
  input.classList.remove("bad");
  if (!lockTimer) say("");
});
function say(text, ok = false) {
  msg.textContent = text;
  msg.classList.toggle("ok", ok);
}
function lock(seconds) {
  clearInterval(lockTimer);
  const until = Date.now() + seconds * 1e3;
  submit.disabled = true;
  const tick = () => {
    const left = Math.ceil((until - Date.now()) / 1e3);
    if (left <= 0) {
      clearInterval(lockTimer);
      lockTimer = null;
      submit.disabled = false;
      say("");
      return;
    }
    const m = Math.floor(left / 60), s = left % 60;
    say(L(`Слишком много попыток. Повторите через ${m ? `${m} мин ` : ""}${s} с`, `Too many attempts. Try again in ${m ? `${m} min ` : ""}${s} s`));
  };
  tick();
  lockTimer = setInterval(tick, 1e3);
}
$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (submit.disabled) return;
  if (!input.value.trim()) {
    input.classList.add("bad");
    say(L("Введите ключ", "Enter a key"));
    return;
  }
  submit.disabled = true;
  say(L("Проверяю…", "Checking…"));
  try {
    const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: input.value, os: await osVersion }) });
    const body = await r.json();
    if (body.ok) {
      say(L("Готово", "Done"), true);
      location.reload();
      return;
    }
    input.classList.remove("bad");
    void input.offsetWidth;
    input.classList.add("bad");
    if (body.error === "locked" || body.error === "busy") return lock(body.retryAfter ?? 60);
    if (body.error === "devices") say(L(`На этом ключе уже занято устройств: ${body.devices}. Обратитесь к тому, кто выдал ключ.`, `This key is already used on ${body.devices} devices. Contact whoever gave you the key.`));
    else say(L("Ключ не подходит", "Invalid key"));
  } catch {
    say(L("Сервер не отвечает, попробуйте ещё раз", "Server not responding, try again"));
  }
  submit.disabled = false;
  input.select();
});
$("logout").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  location.reload();
});

})();
