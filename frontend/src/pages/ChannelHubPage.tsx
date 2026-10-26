import { Link } from "react-router-dom";
import { bySlug, type Product } from "../data/catalog";
import { PRODUCT_GUIDES } from "../data/product-guides";
import { productDisplayName } from "../seo/routes";
import ProductBreadcrumbs from "../components/ProductBreadcrumbs";
import ResponsiveCardImage from "../components/ResponsiveCardImage";
import SiteImage from "../components/SiteImage";
import { hasGenericResponsiveSource } from "../data/responsive-images";

const SECTIONS = ["kanalnoe-krugloe", "kanalnoe-pryamougolnoe"];
const IMAGE_SIZES = "(max-width: 700px) calc(100vw - 48px), (max-width: 1248px) calc((100vw - 72px) / 2), 588px";

export default function ChannelHubPage({ p }: { p: Product }) {
  const guide = PRODUCT_GUIDES[p.slug];
  return <article className="channel-hub">
    <ProductBreadcrumbs path={`/product/${p.slug}`} />
    <div className="container channel-hub-intro">
      <h1>{productDisplayName(p)}</h1>
      <p className="lead">{p.blurb}</p>
      <section aria-labelledby="channel-section-title" className="channel-section-picker">
        <h2 id="channel-section-title">Выберите сечение воздуховода</h2>
        <div className="channel-section-grid">
          {SECTIONS.map((slug, index) => {
            const section = bySlug(slug);
            if (!section?.photo) throw new Error(`Не найден раздел канального оборудования: ${slug}`);
            return <Link key={slug} to={`/product/${slug}`} className="card card-link channel-section-card" aria-label={section.name}>
              <span className="card-media">
                {hasGenericResponsiveSource(section.photo)
                  ? <ResponsiveCardImage src={section.photo} alt={section.name} profile="generic-hero" sizes={IMAGE_SIZES} loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "low"} />
                  : <SiteImage src={section.photo} alt={section.name} sizes={IMAGE_SIZES} loading={index === 0 ? "eager" : "lazy"} />}
              </span>
              <div className="card-body">
                <h3>{section.name}</h3>
                <span className="channel-section-description">{section.blurb}</span>
                <span className="channel-section-action" aria-hidden="true">Открыть раздел →</span>
              </div>
            </Link>;
          })}
        </div>
      </section>
      <div className="cta-row channel-hub-actions">
        <Link to="/request" className="btn btn-primary">Запросить расчёт</Link>
        <Link to="/tehlisty" className="btn btn-ghost dark">Технические листы</Link>
      </div>
      {guide && <section className="block" id="selection-guide">
        <h2>{guide.title}</h2>
        {guide.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </section>}
    </div>
  </article>;
}
