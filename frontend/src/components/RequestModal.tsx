import { useEffect, useRef, useState } from "react";
import RequestForm from "../pages/RequestForm";
import { useAccessibleModal } from "./AccessibleModal";

// Обычные ссылки остаются рабочими без JavaScript и для открытия в новой вкладке.
export default function RequestModal() {
  const [open, setOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLAnchorElement | null>(null);
  const { dialogRef, rememberTrigger } = useAccessibleModal(open, () => setOpen(false));
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
      const target = new URL(link.href, location.href);
      if (target.origin !== location.origin || target.pathname.replace(/\/+$/, "") !== "/request" || target.search || target.hash) return;
      if (location.pathname.replace(/\/+$/, "") === "/request") return;
      event.preventDefault();
      event.stopPropagation();
      rememberTrigger(link);
      returnFocusRef.current = link;
      setOpen(true);
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [rememberTrigger]);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const siblings = [...(document.getElementById("root")?.children ?? [])]
      .filter((node): node is HTMLElement => node instanceof HTMLElement && node !== overlayRef.current)
      .map((node) => ({ node, inert: node.inert }));
    for (const { node } of siblings) node.inert = true;
    return () => {
      document.body.style.overflow = previousOverflow;
      for (const { node, inert } of siblings) node.inert = inert;
      window.requestAnimationFrame(() => returnFocusRef.current?.focus({ preventScroll: true }));
    };
  }, [open]);
  if (!open) return null;
  return <div className="request-modal-backdrop" ref={overlayRef} onClick={(event) => {
    if (event.target === event.currentTarget) setOpen(false);
  }}>
    <div ref={dialogRef} className="request-modal" role="dialog" aria-modal="true" aria-labelledby="request-modal-title" tabIndex={-1}>
      <button type="button" className="request-modal-close" aria-label="Закрыть форму заявки" data-modal-initial-focus onClick={() => setOpen(false)}>×</button>
      <h2 id="request-modal-title">Запросить расчёт</h2>
      <p>Прикрепите проект или опишите задачу. Обязательные поля отмечены звёздочкой.</p>
      <RequestForm embedded />
    </div>
  </div>;
}
