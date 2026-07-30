import { Link } from "react-router-dom";
import { PageHero } from "../components/rich";
import { BIM } from "../data/bim";
import { PRODUCTS } from "../data/catalog";

const nameOf = (slug: string) => PRODUCTS.find((p) => p.slug === slug)?.name ?? slug;

export default function BimLibrary() {
  const groups = Object.entries(BIM)
    .filter(([, models]) => models.length > 0)
    .map(([slug, models]) => ({ slug, name: nameOf(slug), models }))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const total = groups.reduce((n, g) => n + g.models.length, 0);

  return (
    <>
      <PageHero
        crumbs={[{ label: "Проектировщикам", to: "/designers" }, { label: "BIM-модели" }]}
        title="Библиотека BIM-моделей"
        lead={`BIM-модели оборудования РИК (формат .rfa для Revit) — ${total} моделей по ${groups.length} позициям каталога. Скачивайте и подставляйте в проект.`}
      />
      <div className="container section-body">
        <div className="bim-lib">
          {groups.map((g) => (
            <div className="bim-lib-group" key={g.slug}>
              <h3><Link to={`/product/${g.slug}`}>{g.name}</Link></h3>
              <div className="bim-lib-list">
                {g.models.map((m) => (
                  <a key={m.path} className="bim-lib-item" href={m.path} download={m.file}>
                    <span className="bim-lib-label">{m.label}</span>
                    <span className="bim-lib-dl">Скачать .rfa</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="cta-final block">
          <h2>Нужна помощь с подбором?</h2>
          <Link to="/request" className="btn btn-primary">Запросить расчёт</Link>
        </div>
      </div>
    </>
  );
}
