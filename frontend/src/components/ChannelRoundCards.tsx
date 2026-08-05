import { Link } from "react-router-dom";
import { bySlug } from "../data/catalog";
import ResponsiveCardImage from "./ResponsiveCardImage";
import { hasGenericResponsiveSource } from "../data/responsive-images";

// Карточки круглого канального оборудования — сетка как секции ЦК.
// Фото берём из уже существующих ассетов товара (bySlug), клик ведёт на его страницу.
const ITEMS: { slug: string; label: string }[] = [
  { slug: "kanalnyj-ventilyator-kr", label: "Канальный вентилятор KR" },
  { slug: "vodyanye-vozduhonagrevateli-rw-kruglye", label: "Водяной воздухонагреватель RW" },
  { slug: "elektricheskie-vozduhonagrevateli-re-kruglye", label: "Электрический воздухонагреватель RE" },
  { slug: "klapan-obratnyj-ro-kruglyj", label: "Обратный клапан RO" },
  { slug: "zaslonka-reguliruyushchaya-rkz-kruglaya", label: "Регулирующая заслонка RKZ" },
  { slug: "filtry-kassetnye-rf-kruglye", label: "Фильтр кассетный RF" },
  { slug: "shumoglushitel-rq-kruglyj", label: "Шумоглушитель RQ" },
];

export default function ChannelRoundCards() {
  return (
    <section className="block" id="round-cards" data-toc="Оборудование">
      <h2>Оборудование круглого сечения</h2>
      <p className="soft">Канальное оборудование круглого сечения Ø100–315 — откройте позицию, чтобы увидеть типоразмеры, характеристики и документацию.</p>
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
