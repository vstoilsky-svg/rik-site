import { useState } from "react";
import { PageHero } from "../components/rich";

const API = "/api/request";

export default function RequestForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending"); setErr("");
    const form = e.currentTarget;
    const data = new FormData(form);
    if (!String(data.get("name")).trim() || !String(data.get("phone")).trim() || !String(data.get("email")).trim()) {
      setStatus("err"); setErr("Заполните имя, телефон и e-mail."); return;
    }
    try {
      const r = await fetch(API, { method: "POST", body: data });
      if (!r.ok) throw new Error("Сервер вернул " + r.status);
      setStatus("ok"); form.reset();
    } catch {
      setStatus("err"); setErr("Не удалось отправить. Позвоните нам: +7 (495) 104-37-79.");
    }
  }

  if (status === "ok") return (
    <section className="container req-done">
      <h1>Заявка отправлена ✓</h1>
      <p className="soft">Мы подберём оборудование и подготовим расчёт по вашему проекту. Инженер свяжется с вами в ближайшее время.</p>
    </section>
  );

  return (
    <>
      <PageHero
        crumbs={[{ label: "Запросить расчёт" }]}
        title="Запросить расчёт"
        lead="Подберём оборудование и подготовим расчёт стоимости по вашему проекту или техническому заданию."
      />
      <section className="container req section-body">
      <form className="req-form" onSubmit={onSubmit}>
        <input type="hidden" name="form_kind" value="request-calculation" />
        <label>Имя *<input name="name" required autoComplete="name" /></label>
        <label>Компания<input name="company" autoComplete="organization" /></label>
        <label>Телефон *<input name="phone" required inputMode="tel" autoComplete="tel" /></label>
        <label>E-mail *<input name="email" required type="email" autoComplete="email" /></label>
        <label className="wide">Комментарий<textarea name="comment" rows={4} /></label>
        <label className="wide file">Прикрепить проект / ТЗ / спецификацию
          <input name="file" type="file" accept=".pdf,.xls,.xlsx,.doc,.docx,.dwg,.jpg,.png,.zip,.rar" />
        </label>
        <label className="wide consent">
          <input name="consent" type="checkbox" required /> Согласен на обработку персональных данных
        </label>
        <input type="text" name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <button className="btn btn-primary" disabled={status === "sending"}>
          {status === "sending" ? "Отправляем…" : "Отправить запрос"}
        </button>
        {status === "err" && <p className="req-err">{err}</p>}
      </form>
      </section>
    </>
  );
}
