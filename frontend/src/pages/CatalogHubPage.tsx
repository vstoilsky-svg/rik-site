import { Link } from "react-router-dom";
import { bySlug, certsOf, techSheetOf, type Product } from "../data/catalog";
import { CATALOG_HUBS } from "../data/catalog-hubs";
import { PRODUCT_GUIDES } from "../data/product-guides";
import { productDisplayName } from "../seo/routes";
import ProductBreadcrumbs from "../components/ProductBreadcrumbs";
import ResponsiveCardImage from "../components/ResponsiveCardImage";
import SiteImage from "../components/SiteImage";
import { hasGenericResponsiveSource } from "../data/responsive-images";

export default function CatalogHubPage({ p }: { p: Product }) {
  const hub = CATALOG_HUBS[p.slug];
  if (!hub || p.tables?.length || p.sizes?.length || p.contentHtml) throw new Error(`Недопустимая подмена товарной страницы обзорной: ${p.slug}`);
  const guide = PRODUCT_GUIDES[p.slug];
  const techSheet = techSheetOf(p.slug) ?? p.techSheet;
  const certificates = certsOf(p.slug);
  return <article className="catalog-hub" data-catalog-hub={p.slug}>
    <ProductBreadcrumbs path={`/product/${p.slug}`} />
    <div className="container catalog-hub-intro">
      <h1>{productDisplayName(p)}</h1>
      <p className="lead">{p.blurb}</p>
      {hub.sections.map((section, sectionIndex) => {
        const layout = section.slugs.length === 2 ? "two" : section.slugs.length === 3 ? "three" : section.slugs.length === 1 ? "single" : "many";
        return <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className={`catalog-hub-section${p.slug === "kanalnoe-oborudovanie" ? " channel-section-picker" : ""}`}>
          <h2 id={`${section.id}-title`}>{section.title}</h2>
          <div className={`catalog-hub-grid catalog-hub-grid--${layout}`}>
            {section.slugs.map((slug, index) => {
              const item = bySlug(slug);
              if (!item?.photo) throw new Error(`Не найдено изображение раздела: ${slug}`);
              const first = sectionIndex === 0 && index === 0;
              const sizes = layout === "two" ? "(max-width: 700px) calc(100vw - 48px), (max-width: 1248px) calc((100vw - 72px) / 2), 588px" : "(max-width: 700px) calc(100vw - 48px), (max-width: 1000px) 45vw, 400px";
              return <Link key={slug} to={`/product/${slug}`} className={`card card-link catalog-hub-card${p.slug === "kanalnoe-oborudovanie" ? " channel-section-card" : ""}`} aria-label={item.name}>
                <span className="card-media">
                  {hasGenericResponsiveSource(item.photo)
                    ? <ResponsiveCardImage src={item.photo} alt={item.name} profile={first || layout === "two" ? "generic-hero" : "generic-card"} sizes={sizes} loading={first ? "eager" : "lazy"} fetchPriority={first ? "high" : "low"} />
                    : <SiteImage src={item.photo} alt={item.name} sizes={sizes} loading={first ? "eager" : "lazy"} fetchPriority={first ? "high" : "low"} />}
                </span>
                <div className="card-body">
                  <h3>{item.name}</h3>
                  {hub.descriptions && <span className="catalog-hub-description">{item.blurb}</span>}
                  <span className="catalog-hub-action" aria-hidden="true">Открыть раздел →</span>
                </div>
              </Link>;
            })}
          </div>
        </section>;
      })}
      <div className="cta-row catalog-hub-actions" id="docs">
        <Link to="/request" className="btn btn-primary">Запросить расчёт</Link>
        {hub.catalog && <a href={hub.catalog} download className="btn btn-ghost dark">Скачать каталог</a>}
        {techSheet && <a href={techSheet} download className="btn btn-ghost dark">Скачать технический лист</a>}
        <Link to="/tehlisty" className="btn btn-ghost dark">Технические листы</Link>
        {certificates.map((cert) => <a href={cert.path} key={cert.path} target="_blank" rel="noopener noreferrer" className="btn btn-ghost dark">{certificates.length === 1 ? "Сертификат" : cert.label}</a>)}
      </div>
      {guide && <section className="block" id="selection-guide">
        <h2>{guide.title}</h2>
        {guide.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </section>}
    </div>
  </article>;
}
