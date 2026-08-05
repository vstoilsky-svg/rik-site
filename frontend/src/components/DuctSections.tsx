import { Link } from "react-router-dom";
import { bySlug } from "../data/catalog";
import ResponsiveCardImage from "./ResponsiveCardImage";
import { hasGenericResponsiveSource } from "../data/responsive-images";

// Разделы воздуховодов — карточки в стиле секций ЦК: фото + синяя кнопка-название, вся карточка кликабельна.
const ITEMS: { slug: string; label: string }[] = [
  { slug: "detali-sistem-ventilyacii", label: "Детали систем вентиляции" },
  { slug: "kruglye-vozduhovody", label: "Круглые воздуховоды" },
  { slug: "pryamougolnye-vozduhovody", label: "Прямоугольные воздуховоды" },
  { slug: "flancy-dlya-ventilyacii", label: "Фланцы для вентиляции" },
];

export default function DuctSections() {
  return (
    <section className="block" id="duct-sections" data-toc="Разделы">
      <h2>Разделы</h2>
      <p className="soft">Откройте раздел — состав номенклатуры, материалы и условия изготовления.</p>
      <div className="cs-cards round-grid">
        {ITEMS.map((it) => {
          const p = bySlug(it.slug);
          if (!p) return null;
          return (
            <Link className="cs-card" to={`/product/${it.slug}`} key={it.slug}>
              <div className="cs-card-media">
                {p.photo && !p.placeholder
                  ? hasGenericResponsiveSource(p.photo)
                    ? <ResponsiveCardImage src={p.photo} alt={it.label} sizes="190px" profile="generic-card" />
                    : <img src={p.photo} alt={it.label} loading="lazy" />
                  : <div className="ph">Фото готовится</div>}
              </div>
              <span className="cs-card-btn">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
