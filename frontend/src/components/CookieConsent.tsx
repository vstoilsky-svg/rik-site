import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./CookieConsent.css";

const STORAGE_KEY = "rik_cookie_consent_v1";
const METRIKA_ID = 112649563;

type MetrikaFunction = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };

declare global {
  interface Window {
    ym?: MetrikaFunction;
    __rikMetrikaLoaded?: boolean;
  }
}

function enableMetrika() {
  if (window.__rikMetrikaLoaded) return;
  window.__rikMetrikaLoaded = true;

  const ym: MetrikaFunction = window.ym ?? Object.assign(
    (...args: unknown[]) => {
      (ym.a ??= []).push(args);
    },
    { l: Date.now() },
  );
  window.ym = ym;

  const source = `https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_ID}`;
  if (!document.querySelector(`script[src="${source}"]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = source;
    document.head.appendChild(script);
  }

  ym(METRIKA_ID, "init", {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: "dataLayer",
    referrer: document.referrer,
    url: window.location.href,
    accurateTrackBounce: true,
    trackLinks: true,
  });
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "accepted") enableMetrika();
    if (stored === "accepted" || stored === "rejected") setVisible(false);

    const reopen = () => setVisible(true);
    window.addEventListener("rik:cookie-settings", reopen);
    return () => window.removeEventListener("rik:cookie-settings", reopen);
  }, []);

  const accept = () => {
    window.localStorage.setItem(STORAGE_KEY, "accepted");
    enableMetrika();
    setVisible(false);
  };

  const reject = () => {
    const wasAccepted = window.localStorage.getItem(STORAGE_KEY) === "accepted";
    window.localStorage.setItem(STORAGE_KEY, "rejected");
    if (wasAccepted) {
      window.location.reload();
      return;
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside className="cookie-consent" role="dialog" aria-modal="false" aria-labelledby="cookie-consent-title" aria-describedby="cookie-consent-description">
      <div>
        <strong id="cookie-consent-title">Настройки cookie</strong>
        <p id="cookie-consent-description">Мы используем техническое хранилище для сохранения выбора. Яндекс Метрика и аналитические cookie включатся только с вашего согласия. Подробнее — в <Link to="/privacy#cookies">Политике обработки персональных данных</Link>.</p>
      </div>
      <div className="cookie-consent-actions">
        <button type="button" className="btn btn-primary" onClick={accept}>Принять необязательные</button>
        <button type="button" className="btn btn-outline" onClick={reject}>Отклонить необязательные</button>
      </div>
    </aside>
  );
}
