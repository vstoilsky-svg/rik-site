import { useState } from "react";
import { Link } from "react-router-dom";
import type { Product } from "../data/catalog";
import { certsOf, techSheetOf, TECH_SHEET_EXTRAS } from "../data/catalog";
import { EXTRA_TABLES } from "../data/extra-tables";
import { DIM_TABLES } from "../data/dim-tables";
import { RAW_TABLES } from "../data/raw-tables";
import { SPECIAL_FAN_TABLES } from "../data/special-fans.generated";
import { BIM } from "../data/bim";
import FloatingToc from "../components/FloatingToc";
import { useAccessibleModal } from "../components/AccessibleModal";
import CentralSections from "../components/CentralSections";
import ChannelRoundCards from "../components/ChannelRoundCards";
import ChannelRectCards from "../components/ChannelRectCards";
import DuctSections from "../components/DuctSections";
import DuctProductCards from "../components/DuctProductCards";
import { ductFamilyOf, familyForHubSlug } from "../data/duct-families";
import SafeHtml from "../components/SafeHtml";
import ResponsiveCardImage from "../components/ResponsiveCardImage";
import { hasGenericResponsiveSource } from "../data/responsive-images";
import { productDisplayName } from "../seo/routes";

const PRODUCT_HERO_IMAGE_SIZES = "(max-width: 760px) calc(100vw - 84px), 600px";

const PRODUCT_NOTICE_EXCLUSIONS = new Set([
  "vozduhovody-i-fasonnye-izdeliya",
  "detali-sistem-ventilyacii",
  "kruglye-vozduhovody",
  "pryamougolnye-vozduhovody",
  "flancy-dlya-ventilyacii",
  "kanalnoe-oborudovanie",
  "kanalnoe-krugloe",
  "kanalnoe-pryamougolnoe",
  "specialnye-klapany",
]);

// Универсальный рендер карточки товара (8 блоков ТЗ). Один компонент — все товары.
const isRedundantTechnicalHeading = (title: string) =>
  title.trim().toLocaleLowerCase("ru-RU") === "технические характеристики";

export default function ProductView({ p, embedded = false }: { p: Product; embedded?: boolean }) {
  const [certOpen, setCertOpen] = useState(false);
  const { dialogRef, rememberTrigger } = useAccessibleModal(certOpen, () => setCertOpen(false));
  const certs = certsOf(p.slug);
  const cert = certs.length === 1 ? certs[0].path : null; // одиночный — через модалку
  const bim = BIM[p.slug];
  // WR/WRN: две прямые кнопки BIM без details (пакет 24.07)
  const directBimButtons = p.slug === "ventilyator-wr" && bim?.length === 2 ? bim : null;
  const techSheet = techSheetOf(p.slug) ?? p.techSheet;
  const extraTechSheets = TECH_SHEET_EXTRAS.filter((sheet) => sheet.slug === p.slug);
  // Опросный лист: ЦК + вентиляторы, кроме канальных KR/VR/WR (по решению — без опросника)
  const noQuest = ["kanalnyj-ventilyator-kr", "ventilyator-vr", "ventilyator-wr", "montazhnye-stakany-rms"];
  const quest =
    p.slug === "centralnye-ustanovki"
      ? "/downloads/oprosny-list-centralny-konditsioner.xlsx"
      : p.group === "fans" && !noQuest.includes(p.slug)
        ? "/downloads/oprosny-list-ventilyator.xlsx"
        : null;
  // Хабы канального оборудования: вместо тех.блоков — карточки товаров
  const isRoundHub = p.slug === "kanalnoe-krugloe";
  const isRectHub = p.slug === "kanalnoe-pryamougolnoe";
  const isHub = isRoundHub || isRectHub;
  const ductHubFamily = familyForHubSlug(p.slug);
  const ductFamily = ductFamilyOf(p);
  const isDuctItem = Boolean(ductFamily) && !ductHubFamily;
  const isRms = p.slug === "montazhnye-stakany-rms";
  const largeDetailDiagram = new Set(["uzel-prohoda", "nasadka-dlya-vybrosa-vozduha", "klapan-obratnyj-pryamougolnyj-kop", "klapan-obratnyj-lepestkovyj-kol", "klapan-obratnyj-kruglyj-ko", "klapan-lepestkovyj-kl"]).has(p.slug);
  const ductContentHtml = isDuctItem ? p.contentHtml?.replace(/<h[1-6][^>]*>\s*Технические характеристики\s*<\/h[1-6]>/gi, "") : p.contentHtml;
  const isFireValves = p.slug === "protivopozharnye-klapany";
  const showStandardSizeNotice = !isFireValves && !PRODUCT_NOTICE_EXCLUSIONS.has(p.slug);
  const ductCatalog = ductHubFamily ? {
    details: "/downloads/catalog-detali-sistem-ventilyacii.pdf",
    round: "/downloads/catalog-kruglye-vozduhovody.pdf",
    rect: "/downloads/catalog-pryamougolnye-vozduhovody.pdf",
    flanges: "/downloads/catalog-flancy-dlya-ventilyacii.pdf",
  }[ductHubFamily] : undefined;
  const articleClass = ["product", embedded && "embedded", (ductHubFamily || isDuctItem) && "duct-product", largeDetailDiagram && "detail-diagram-product", isRms && "rms-product", p.slug === "centralnye-ustanovki" && "central-units-product", p.slug === "flanec-pryamougolnyj" && "rect-flange-product"].filter(Boolean).join(" ");
  return (
    <article className={articleClass}>
      {!embedded && (
        <nav className="crumbs container">
          <Link to="/products">Вся продукция</Link> <span>→</span> <span>{p.name}</span>
        </nav>
      )}
      <div className="container product-grid">
        <div className="product-media">
          {p.pageMedia ? (
            <div className="card-media-duo">
              {p.pageMedia.map((m, index) => (
                <figure key={m.src}>
                  {hasGenericResponsiveSource(m.src)
                    ? (
                      <ResponsiveCardImage
                        src={m.src}
                        alt={`${p.name} — ${m.label}`}
                        sizes={PRODUCT_HERO_IMAGE_SIZES}
                        profile="generic-hero"
                        loading={index === 0 ? "eager" : "lazy"}
                        fetchPriority={index === 0 ? "high" : "low"}
                      />
                    )
                    : (
                      <img
                        src={m.src}
                        alt={`${p.name} — ${m.label}`}
                        loading={index === 0 ? "eager" : "lazy"}
                        fetchPriority={index === 0 ? "high" : "low"}
                        decoding="async"
                      />
                    )}
                  <figcaption>{m.label}</figcaption>
                </figure>
              ))}
            </div>
          ) : p.photo && !p.placeholder ? (
            hasGenericResponsiveSource(p.photo)
              ? (
                <ResponsiveCardImage
                  src={p.photo}
                  alt={p.name}
                  sizes={PRODUCT_HERO_IMAGE_SIZES}
                  profile="generic-hero"
                  loading="eager"
                  fetchPriority="high"
                />
              )
              : <img src={p.photo} alt={p.name} loading="eager" fetchPriority="high" decoding="async" />
          ) : (
            <div className="ph">Изображение готовится студийным рендером</div>
          )}
        </div>
        <div className="product-head">
          <h1>{productDisplayName(p)}</h1>
          <p className="lead">{p.blurb}</p>
          {isFireValves && (
            <aside className="product-notice product-notice--fire" aria-label="Информация для заказа">
              При оформлении заказа уточняйте размер у специалистов{" "}
              <a href="tel:+74951043779">+7 (495) 104-37-79</a>
            </aside>
          )}
          {showStandardSizeNotice && (
            <aside className="product-notice" aria-label="Информация о типоразмерах">
              На данной странице представлены стандартные размеры изделий. Для заказа оборудования
              нестандартных размеров обратитесь к менеджеру по телефону:{" "}
              <a href="tel:+74951043779">+7 (495) 104-37-79</a>.
            </aside>
          )}
          <div className="cta-row">
            <Link to="/request" className="btn btn-primary">Запросить расчёт</Link>
            {ductCatalog && (
              <a href={ductCatalog} download className="btn btn-ghost dark">Скачать каталог</a>
            )}
            {ductHubFamily && cert && (
              <button
                type="button"
                className="btn btn-ghost dark"
                onClick={(event) => {
                  rememberTrigger(event.currentTarget);
                  setCertOpen(true);
                }}
              >
                Сертификат
              </button>
            )}
            {!ductHubFamily && techSheet && (
              <a href={techSheet} download className="btn btn-ghost dark">
                {isRms ? "Скачать тех. лист Дымоудаление" : "Скачать тех. лист"}
              </a>
            )}
            {!ductHubFamily && extraTechSheets.map((sheet) => (
              <a key={sheet.path} href={sheet.path} download className="btn btn-ghost dark">{sheet.label}</a>
            ))}
            {!ductHubFamily && !isDuctItem && !techSheet && (
              <a href="#docs" className="btn btn-ghost dark" onClick={(e) => { e.preventDefault(); document.getElementById("docs")?.scrollIntoView({ behavior: "smooth" }); }}>Документация</a>
            )}
          </div>
        </div>
      </div>

      <div className="container product-content">
        {isRoundHub && <ChannelRoundCards />}
        {isRectHub && <ChannelRectCards />}
        {p.slug === "vozduhovody-i-fasonnye-izdeliya" && <DuctSections />}
        {ductHubFamily && <DuctProductCards family={ductHubFamily} />}

        {!isHub && (
        <section className="block" id="adv" data-toc="Преимущества">
          <h2>Преимущества</h2>
          <ul className="adv">{p.advantages.map((a) => <li key={a}>{a}</li>)}</ul>
        </section>
        )}

        {!isHub && p.designation && p.designation.length > 0 && (
          <section className="block" id="designation" data-toc="Структура обозначения">
            <h2>Структура обозначения</h2>
            <dl className="designation-list">
              {p.designation.map((item) => (
                <div key={`${item.code}-${item.text}`}>
                  <dt>{item.code}</dt>
                  <dd>{item.text}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {isDuctItem && ductContentHtml && (
          <section className="block" id="tech" data-toc="Технические характеристики">
            <h2>Технические характеристики</h2>
            <SafeHtml className="duct-rich" html={ductContentHtml} />
          </section>
        )}

        {isRms && p.contentHtml && (
          <section className="block rms-rich-block" id="tech" data-toc="Технические характеристики">
            <h2>Технические характеристики</h2>
            <SafeHtml className="duct-rich" html={p.contentHtml} />
          </section>
        )}

        {!isHub && !ductHubFamily && !p.contentHtml && (() => {
          // Таблицы 1-в-1 с WAER (сырой HTML, маркировки заменены) — имеют приоритет
          const raw = RAW_TABLES[p.slug] ?? SPECIAL_FAN_TABLES[p.slug];
          if (raw && raw.length) {
            const isGab = (t: string) => /габарит|масса|размер/i.test(t);
            const gab = raw.filter((t) => isGab(t.title));
            const tech = raw.filter((t) => !isGab(t.title));
            const renderRaw = (list: typeof raw) => list.map((tb) => (
              <div className="table-block" key={tb.title}>
                {!isRedundantTechnicalHeading(tb.title) && <h3 className="table-h">{tb.title}</h3>}
                {tb.img && <img className="scheme-img" src={tb.img} alt={tb.title} loading="lazy" />}
                <SafeHtml className="waer-table" html={tb.html} />
              </div>
            ));
            return (
              <>
                {gab.length > 0 && (
                  <section className="block" id="gabarity" data-toc="Габаритные размеры">
                    <h2>Габаритные размеры</h2>
                    {p.scheme && <img className="scheme-img" src={p.scheme} alt={`Габаритный чертёж — ${p.name}`} loading="lazy" />}
                    {renderRaw(gab)}
                  </section>
                )}
                {tech.length > 0 && (
                  <section className="block" id="tech" data-toc="Технические характеристики">
                    <h2>Технические характеристики</h2>
                    {renderRaw(tech)}
                  </section>
                )}
              </>
            );
          }
          type Tbl = { title: string; cols: string[]; rows: import("../data/catalog").SizeRow[]; note?: string; img?: string };
          const own = [...(p.tables ?? []), ...(DIM_TABLES[p.slug] ?? [])];
          const extra = own.length ? [] : (EXTRA_TABLES[p.slug] ?? []);
          const all: Tbl[] = [
            ...(p.sizes && p.sizeCols ? [{ title: "Типоразмеры", cols: p.sizeCols, rows: p.sizes }] : []),
            ...own, ...extra,
          ];
          if (!all.length) {
            return (
              <section className="block">
                <h2>Технические характеристики</h2>
                <p className="soft">Типоразмер подбирается под проект. Пришлите ТЗ/спецификацию — подготовим расчёт.</p>
              </section>
            );
          }
          const isGab = (t: string) => /габарит|масса|размер/i.test(t);
          const gab = all.filter((t) => isGab(t.title));
          const tech = all.filter((t) => !isGab(t.title));
          const render = (list: Tbl[]) => list.map((tb) => (
            <div className="table-block" key={tb.title}>
              {!isRedundantTechnicalHeading(tb.title) && <h3 className="table-h">{tb.title}</h3>}
              {tb.img && <img className="scheme-img" src={tb.img} alt={tb.title} loading="lazy" />}
              <div className="table-wrap">
                <table>
                  <thead><tr>{tb.cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                  <tbody>{tb.rows.map((r, i) => (
                    <tr key={i}>{tb.cols.map((c) => <td key={c}>{String(r[c] ?? "")}</td>)}</tr>
                  ))}</tbody>
                </table>
              </div>
              {tb.note && <p className="soft">{tb.note}</p>}
            </div>
          ));
          return (
            <>
              {gab.length > 0 && <section className="block" id="gabarity" data-toc="Габаритные размеры"><h2>Габаритные размеры</h2>{p.scheme && <img className="scheme-img" src={p.scheme} alt={`Габаритный чертёж — ${p.name}`} loading="lazy" />}{render(gab)}</section>}
              {tech.length > 0 && <section className="block" id="tech" data-toc="Технические характеристики"><h2>Технические характеристики</h2>{render(tech)}</section>}
            </>
          );
        })()}

        {!isHub && p.aeroCharts && p.aeroCharts.length > 0 && (
          <section className="block" id="aero" data-toc="Аэродинамические характеристики">
            <h2>Аэродинамические характеристики</h2>
            <div className="aero-chart-grid">
              {p.aeroCharts.map((chart) => (
                <figure key={chart.src}>
                  <a href={chart.src} target="_blank" rel="noreferrer">
                    <img src={chart.src} alt={chart.label} loading="lazy" />
                  </a>
                  <figcaption>{chart.label}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {isDuctItem && ductFamily && <DuctProductCards family={ductFamily} excludeSlug={p.slug} />}

        {p.related && !isHub && !ductHubFamily && !isDuctItem && (
          <section className="block" id="related" data-toc="Смотрите также">
            <h2>Смотрите также</h2>
            <div className="cta-row">
              {p.related.map((r) => <Link key={r.to} to={r.to} className="btn btn-ghost dark">{r.label} →</Link>)}
            </div>
          </section>
        )}

        {p.slug === "centralnye-ustanovki" && <CentralSections />}

        {p.construction && p.slug !== "centralnye-ustanovki" && (
          <section className="block" id="construction" data-toc="Конструкция">
            <h2>Конструкция и состав</h2>
            <ul className="adv">{p.construction.map((c) => <li key={c}>{c}</li>)}</ul>
          </section>
        )}

        {p.executions && (
          <section className="block">
            <h2>Варианты исполнения</h2>
            <div className="exec-row">{p.executions.map((e) => <span className="chip" key={e}>{e}</span>)}</div>
          </section>
        )}

        {!ductHubFamily && !isDuctItem && !isRms && <section className="block" id="docs" data-toc="Документация">
          <h2>Документация</h2>
          <div className="cta-row">
            <Link to="/request" className="btn btn-primary">Запросить расчёт</Link>
            {cert && (
              <button
                type="button"
                className="btn btn-ghost dark"
                onClick={(event) => {
                  rememberTrigger(event.currentTarget);
                  setCertOpen(true);
                }}
              >
                Сертификат
              </button>
            )}
            {/* certificatePlaceholder: сертификаты готовятся — кнопку не показываем (22.07);
                чтобы вернуть, добавить сертификат в CERTS — заработает ветка cert выше */}
            {directBimButtons?.map((model) => (
              <a key={model.path} className="btn btn-ghost dark" href={model.path} download={model.file}>
                Скачать BIM-модель {model.label.endsWith("WRN") ? "WRN" : "WR"}
              </a>
            ))}
            {!directBimButtons && bim && bim.length === 1 && (
              <a className="btn btn-ghost dark" href={bim[0].path} download={bim[0].file}>Скачать BIM-модель</a>
            )}
            {quest && <a className="btn btn-ghost dark" href={quest} download>Опросный лист</a>}
            {techSheet && <a className="btn btn-ghost dark" href={techSheet} download>Скачать техлист (PDF)</a>}
          </div>
          {!directBimButtons && bim && bim.length > 1 && (
            <details className="bim-menu">
              <summary>BIM-модели ({bim.length}) — скачать</summary>
              <div className="bim-list">
                {bim.map((m) => (
                  <a key={m.path} className="bim-item" href={m.path} download={m.file}>{m.label}</a>
                ))}
              </div>
            </details>
          )}
          {certs.length > 1 && (
            <details className="bim-menu">
              <summary>Сертификаты ({certs.length}) — скачать</summary>
              <div className="bim-list">
                {certs.map((c) => (
                  <a key={c.path} className="bim-item" href={c.path} download>{c.label}</a>
                ))}
              </div>
            </details>
          )}
        </section>}

        <section className="block cta-final">
          <h2>Нужен подбор оборудования?</h2>
          <Link to="/request" className="btn btn-primary">Запросить расчёт</Link>
        </section>
      </div>

      {!embedded && <FloatingToc />}

      {cert && certOpen && (
        <div className="modal-backdrop" onClick={() => setCertOpen(false)}>
          <div
            ref={dialogRef}
            className="cert-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Сертификат — ${p.name}`}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cert-head">
              <span>Сертификат — {p.name}</span>
              <div className="cert-actions">
                <a className="btn btn-ghost dark" href={cert} target="_blank" rel="noopener">Открыть в новой вкладке</a>
                <a className="btn btn-primary" href={cert} download>Скачать PDF</a>
                <button className="modal-close" onClick={() => setCertOpen(false)} aria-label="Закрыть" data-modal-initial-focus>✕</button>
              </div>
            </div>
            <iframe className="cert-frame" src={cert} title={`Сертификат ${p.name}`} tabIndex={-1} />
          </div>
        </div>
      )}
    </article>
  );
}
