import { Link } from "react-router-dom";
import { PageHero } from "../components/rich";

export default function Contacts() {
  return (
    <>
      <PageHero
        crumbs={[{ label: "Контакты" }]}
        title="Контакты"
        lead="Отдел продаж РИК — подбор оборудования, расчёты и поставка по вашему проекту."
      />
      <div className="container section-body">
      <h2 className="sr-only" id="contacts-info-section-title">Контактная информация</h2>
      <div className="contacts-grid">
        <div>
          <h3>Отдел продаж</h3>
          <p><a href="tel:+74951043779">+7 (495) 104-37-79</a></p>
          <p><a href="mailto:zakaz@rik-vent.ru">zakaz@rik-vent.ru</a></p>
          <p className="soft">Пн–Пт с 9:00 до 18:00</p>
        </div>
        <div>
          <h3>Адрес</h3>
          <p>г. Москва, 119517,<br />Нежинская ул., дом 8, корпус К.2,<br />офис цоколь, помещ. 6А</p>
        </div>
        <div>
          <h3>Реквизиты</h3>
          <p className="soft">ООО «РИК» — Русская инжиниринговая компания.<br />Полные реквизиты и карту партнёра вышлем по запросу.</p>
        </div>
      </div>
      <div className="cta-final block"><h2>Отправить проект на расчёт</h2>
        <Link to="/request" className="btn btn-primary">Запросить расчёт</Link></div>
      </div>
    </>
  );
}
