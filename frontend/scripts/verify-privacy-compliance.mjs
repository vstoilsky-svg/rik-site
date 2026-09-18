import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const requireText = (content, value, label) => {
  if (!content.includes(value)) throw new Error(`${label}: не найдено «${value}»`);
};

const request = read("src/pages/RequestForm.tsx");
const contractors = read("src/pages/ForContractors.tsx");
const privacy = read("src/pages/Privacy.tsx");
const consent = read("src/pages/PersonalDataConsent.tsx");
const cookie = read("src/components/CookieConsent.tsx");
const template = read("index.html");

for (const [label, source] of [["Форма расчёта", request], ["Форма проекта", contractors]]) {
  requireText(source, "Даю согласие на обработку персональных данных", label);
  requireText(source, 'to="/personal-data-consent"', label);
  requireText(source, 'to="/privacy"', label);
  if (/name="email"\s+required/.test(source) || /name="email"[^>]*\srequired/.test(source)) {
    throw new Error(`${label}: e-mail не должен быть обязательным`);
  }
  requireText(source, 'name="phone" required', label);
}

requireText(consent, "Согласие на обработку персональных данных", "Документ согласия");
requireText(privacy, "Персональные данные, которые обрабатывает Оператор", "Политика");
requireText(cookie, 'window.localStorage.setItem(STORAGE_KEY, "accepted")', "Cookie-баннер");
requireText(cookie, "enableMetrika();", "Cookie-баннер");

if (template.includes("mc.yandex.ru/metrika/tag.js") || template.includes("mc.yandex.ru/watch/")) {
  throw new Error("Яндекс Метрика запускается до выбора пользователя");
}

const consentHtml = resolve(root, "dist/personal-data-consent/index.html");
if (!existsSync(consentHtml)) throw new Error("Не создана статическая страница согласия");
requireText(readFileSync(consentHtml, "utf8"), "Согласие на обработку персональных данных", "Статическая страница согласия");

console.log("Проверка ПДн пройдена: отдельное согласие, ссылки в формах, один обязательный контакт, управляемая аналитика.");
