import { useEffect, useState } from "react";

type Item = { id: string; label: string };

// Плавающее оглавление длинной страницы: находит секции по [data-toc] с заголовком,
// ведёт к разделу, после клика сворачивается в бургер. Из бургера снова открывается.
export default function FloatingToc() {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const secs = Array.from(document.querySelectorAll<HTMLElement>("section[data-toc][id]"));
    const list = secs
      .map((s) => ({ id: s.id, label: s.getAttribute("data-toc") || s.querySelector("h2")?.textContent || "" }))
      .filter((x) => x.label);
    setItems(list);
  }, []);

  if (items.length < 3) return null; // короткие страницы — не показываем

  const go = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setOpen(false); // сворачиваем в бургер после перехода
  };

  return (
    <div className="toc-float">
      {open ? (
        <nav className="toc-panel" aria-label="Оглавление страницы">
          <div className="toc-head">
            <span>Разделы</span>
            <button className="toc-x" onClick={() => setOpen(false)} aria-label="Свернуть">✕</button>
          </div>
          {items.map((it) => (
            <button key={it.id} className="toc-link" onClick={() => go(it.id)}>{it.label}</button>
          ))}
        </nav>
      ) : (
        <button className="toc-burger" onClick={() => setOpen(true)} aria-label="Оглавление" title="Разделы страницы">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>
      )}
    </div>
  );
}
