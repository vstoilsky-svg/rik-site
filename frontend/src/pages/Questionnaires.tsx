import { Link } from "react-router-dom";
import { PageHero } from "../components/rich";

const D = (f: string) => `/docs/oprosnye/${f}`;

const SHEETS: { title: string; note: string; file: string }[] = [
  { title: "Опросный лист на вентилятор", note: "Крышные, канальные, радиальные вентиляторы", file: "oprosnyj-list-ventilyator.xlsx" },
  { title: "Опросный лист на центральный кондиционер", note: "Центральные приточные и приточно-вытяжные установки RIK-M / RIK-S", file: "oprosnyj-list-central.xlsx" },
];

export default function Questionnaires() {
  return (
    <>
      <PageHero
        crumbs={[{ label: "Проектировщикам", to: "/designers" }, { label: "Опросные листы" }]}
        title="Опросные листы"
        lead="Скачайте форму, заполните исходные данные и пришлите нам — подберём оборудование и подготовим расчёт."
      />
      <div className="container section-body">
      <h2 className="sr-only" id="questionnaires-list-section-title">Доступные опросные листы</h2>
      <div className="cert-grid">
        {SHEETS.map((s) => (
          <div className="cert-card" key={s.file}>
            <div className="cert-card-ico" aria-hidden>XLS</div>
            <div className="cert-card-body">
              <div className="cert-kind">Excel · для заполнения</div>
              <h3>{s.title}</h3>
              <span className="tile-note" style={{ marginBottom: 12 }}>{s.note}</span>
              <div className="cert-card-actions">
                <a className="btn btn-primary" href={D(s.file)} download>Скачать .xlsx</a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="cta-final block">
        <h2>Заполнили опросный лист?</h2>
        <p className="soft">Прикрепите его в форме запроса — вернёмся с подбором и спецификацией.</p>
        <Link to="/request" className="btn btn-primary">Отправить на расчёт</Link>
      </div>
      </div>
    </>
  );
}
