import { useParams, Link } from "react-router-dom";
import { sectionByRoute } from "../data/central-sections";
import FloatingToc from "../components/FloatingToc";
import SafeHtml from "../components/SafeHtml";

// Техлисты секций ЦК (прямое скачивание PDF)
const CK_TECHSHEET: Record<string, string> = {
  "sekcii-filtracii": "/downloads/tehlist/Tehlist_CK_Filtracii.pdf",
  "ventilyatornye-sekcii": "/downloads/tehlist/Tehlist_CK_Ventilyatornye.pdf",
  "ventilyatornye-s-rezervom": "/downloads/tehlist/Tehlist_CK_Ventilyatornye_Rezerv.pdf",
  "ventilyatornye-vzryvozashchishchennye": "/downloads/tehlist/Tehlist_CK_Ventilyatornye_Vzryvo.pdf",
  "vodyanye-nagrevateli": "/downloads/tehlist/Tehlist_CK_Vodyanye_Nagrev.pdf",
  "elektricheskie-nagrevateli": "/downloads/tehlist/Tehlist_CK_Elektro_Nagrev.pdf",
  "gazovye-nagrevateli": "/downloads/tehlist/Tehlist_CK_Gazovye_Nagrev.pdf",
  "vodyanye-ohladiteli": "/downloads/tehlist/Tehlist_CK_Vodyanye_Ohlad.pdf",
  "freonovye-ohladiteli": "/downloads/tehlist/Tehlist_CK_Freonovye_Ohlad.pdf",
  "plastinchatye-rekuperatory": "/downloads/tehlist/Tehlist_CK_Plastinchatye_Rekup.pdf",
  "rotornye-regeneratory": "/downloads/tehlist/Tehlist_CK_Rotornye_Regen.pdf",
  "shumoglushiteli": "/downloads/tehlist/Tehlist_CK_Shumoglushiteli.pdf",
  "sotovye-uvlazhniteli": "/downloads/tehlist/Tehlist_CK_Uvlazhniteli.pdf",
  "baktericidnaya-obrabotka": "/downloads/tehlist/Tehlist_CK_Baktericidnaya.pdf",
  "sekcii-smesheniya": "/downloads/tehlist/Tehlist_CK_Smesheniya.pdf",
  "reguliruyushchaya-zaslonka": "/downloads/tehlist/Tehlist_CK_Zaslonka.pdf",
  "zaslonka-s-obogrevom": "/downloads/tehlist/Tehlist_CK_Zaslonka_Obogrev-20260728.pdf",
  "glikolevyj-rekuperator": "/downloads/tehlist/Tehlist_CK_Glikolevyj_Rekuperator.pdf",
};

export default function CentralSectionPage() {
  const { section } = useParams();
  const s = section ? sectionByRoute(section) : undefined;
  const techSheet = section ? CK_TECHSHEET[section] : undefined;

  if (!s) {
    return (
      <div className="container product">
        <nav className="crumbs container">
          <Link to="/product/centralnye-ustanovki">Центральные установки</Link> <span>→</span> <span>Секция</span>
        </nav>
        <section className="block"><h1>Секция не найдена</h1>
          <p className="soft">Вернитесь к <Link to="/product/centralnye-ustanovki">центральным установкам</Link>.</p>
        </section>
      </div>
    );
  }

  return (
    <article className="product">
      <nav className="crumbs container">
        <Link to="/products">Вся продукция</Link> <span>→</span>
        <Link to="/product/centralnye-ustanovki"> Центральные установки RIK-M и RIK-S</Link> <span>→</span> <span>{s.name}</span>
      </nav>

      <div className="container product-grid">
        <div className="cs-hero-media"><img src={s.photo} alt={s.name} loading="lazy" /></div>
        <div className="product-head">
          <h1>{s.name} <span className="cs-mark">{s.marking}</span></h1>
          {s.desc && <p className="lead">{s.desc}</p>}
          <div className="cta-row">
            <Link to="/request" className="btn btn-primary">Запросить расчёт</Link>
            {techSheet && <a href={techSheet} download className="btn btn-ghost dark">Скачать тех. лист</a>}
            <Link to="/product/centralnye-ustanovki" className="btn btn-ghost dark">← Все секции</Link>
          </div>
        </div>
      </div>

      <div className="container">
        {s.structure && (
          <section className="block" id="marking" data-toc="Структура обозначения">
            <h2>Структура обозначения</h2>
            <p className="cs-structure">{s.structure}</p>
          </section>
        )}

        {s.variants && s.variants.length > 0 && (
          <section className="block" id="variants" data-toc="Варианты исполнения">
            <h2>{s.id === "fan-reserve" ? "Варианты резервирования" : "Варианты исполнения вентиляторных секций"}</h2>
            <div className="cs-variants">
              {s.variants.map((v) => (
                <article className={v.photo ? "cs-variant" : "cs-variant cs-variant-notext"} key={v.title}>
                  {v.photo && <div className="cs-variant-media"><img src={v.photo} alt={v.title} loading="lazy" /></div>}
                  <div className="cs-variant-body">
                    <h3>{v.title}</h3>
                    <p className="soft">{v.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {(s.schemes.length > 0 || s.tables.length > 0) && (
          <section className="block" id="tech" data-toc="Характеристики">
            <h2>Технические характеристики</h2>
            {s.schemes.length > 0 && (
              <div className="cs-scheme-row">
                {s.schemes.map((sc) => (
                  <figure className="scheme-fig" key={sc.img}>
                    <img className="scheme-img" src={sc.img} alt={sc.label || `Чертёж — ${s.name}`} loading="lazy" />
                    {sc.label && <figcaption>{sc.label}</figcaption>}
                  </figure>
                ))}
              </div>
            )}
            {s.tables.map((tb, i) => (
              <div className="cs-table-block" key={i}>
                <h3 className="table-h">{tb.title}</h3>
                {tb.schemes && tb.schemes.length > 0 && (
                  <div className="cs-scheme-row">
                    {tb.schemes.map((sc) => (
                      <figure className="scheme-fig" key={sc.img}>
                        <img className="scheme-img" src={sc.img} alt={sc.label || tb.title} loading="lazy" />
                        {sc.label && <figcaption>{sc.label}</figcaption>}
                      </figure>
                    ))}
                  </div>
                )}
                <SafeHtml className="waer-table" html={tb.html} />
              </div>
            ))}
            {s.tables.length === 0 && (
              <p className="soft">Характеристики подбираются под проект. Пришлите ТЗ — подготовим расчёт.</p>
            )}
          </section>
        )}

        <section className="block cta-final">
          <h2>Нужен подбор центральной установки?</h2>
          <Link to="/request" className="btn btn-primary">Запросить расчёт</Link>
        </section>
      </div>

      <FloatingToc />
    </article>
  );
}
