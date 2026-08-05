import { Link } from "react-router-dom";
import { bySlug } from "../data/catalog";
import ResponsiveCardImage from "./ResponsiveCardImage";
import { hasGenericResponsiveSource } from "../data/responsive-images";

// Карточки прямоугольного канального оборудования — тот же паттерн, что ChannelRoundCards.
// Фото берём из существующих ассетов товара (bySlug), клик ведёт на страницу позиции.
const ITEMS: { slug: string; label: string }[] = [
  { slug: "ventilyator-wr", label: "Канальные вентиляторы WR / WRN" },
  { slug: "ventilyator-vr", label: "Канальный вентилятор VR" },
  { slug: "vodyanye-vozduhonagrevateli-rw", label: "Водяной воздухонагреватель RW" },
  { slug: "elektricheskie-vozduhonagrevateli-re", label: "Электрический воздухонагреватель RE" },
  { slug: "freonovye-vozduhoohladiteli-rsf", label: "Фреоновый воздухоохладитель RSF" },
  { slug: "vodyanye-vozduhoohladiteli-rsw", label: "Водяной воздухоохладитель RSW" },
  { slug: "plastinchatyj-rekuperator-rec", label: "Пластинчатый рекуператор REC" },
  { slug: "filtry-vozdushnye-kassetnye-rf", label: "Фильтр кассетный RF" },
  { slug: "vozdushnye-filtry-karmannye-rk", label: "Карманные фильтры RK / RKU" },
  { slug: "shumoglushitel-rq", label: "Шумоглушитель пластинчатый RQ" },
  { slug: "klapan-obratnyj-ro", label: "Обратный клапан RO" },
  { slug: "zaslonka-reguliruyushchaya-rkz", label: "Регулирующая заслонка RKZ" },
  { slug: "gibkaya-vstavka", label: "Гибкая вставка V" },
  { slug: "bakteritsidnaya-sektsiya-bar", label: "Бактерицидная секция RBW" },
];

export default function ChannelRectCards() {
  return (
    <section className="block" id="rect-cards" data-toc="Оборудование">
      <h2>Оборудование прямоугольного сечения</h2>
      <p className="soft">Канальное оборудование прямоугольного сечения 400×200 – 1000×500 — откройте позицию, чтобы увидеть типоразмеры, характеристики и документацию.</p>
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
