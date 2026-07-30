import { Link } from "react-router-dom";
import { CENTRAL_SECTIONS } from "../data/central-sections";

// Секции ЦК: только сетка uniform-карточек. Подробности — на отдельных страницах.
export default function CentralSections() {
  return (
    <section className="block" id="central-sections" data-toc="Секции центральных кондиционеров">
      <h2>Секции центральных кондиционеров</h2>
      <p className="soft">Центральные установки RIK-M / RIK-S собираются из функциональных секций под задачи объекта.
        Откройте секцию — подробное описание, структура обозначения, характеристики и чертежи.</p>

      <div className="cs-cards">
        {CENTRAL_SECTIONS.map((s) => (
          <Link className="cs-card" to={`/product/centralnye-ustanovki/${s.route}`} key={s.id}>
            <div className="cs-card-media"><img src={s.photo} alt={s.name} loading="lazy" /></div>
            <span className="cs-card-btn">{s.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
