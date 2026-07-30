import { Link } from "react-router-dom";
import { bySlug } from "../data/catalog";

// 23 детали систем вентиляции — карточки хаба (мастер-задача 20260717, 02_VENTILATION_DETAILS_23).
const ITEMS: { slug: string; label: string }[] = [
  { slug: "shumoglushitel-trubchatyj-pryamougolnyj-gtp", label: "Шумоглушитель трубчатый прямоугольный ГТП" },
  { slug: "shumoglushitel-trubchatyj-kruglyj-gtk", label: "Шумоглушитель трубчатый круглый ГТК" },
  { slug: "shumoglushitel-trubchatyj-gtpi", label: "Шумоглушитель трубчатый ГТПи" },
  { slug: "shumoglushitel-plastinchatyj-pryamougolnyj-gp", label: "Шумоглушитель пластинчатый прямоугольный ГП" },
  { slug: "shiber-pryamougolnyj", label: "Шибер прямоугольный" },
  { slug: "shiber-kruglyj", label: "Шибер круглый" },
  { slug: "uzel-prohoda", label: "Узел прохода" },
  { slug: "nasadka-dlya-vybrosa-vozduha", label: "Насадка для выброса воздуха" },
  { slug: "klapan-obratnyj-pryamougolnyj-kop", label: "Клапан обратный прямоугольный КОп" },
  { slug: "klapan-obratnyj-lepestkovyj-kol", label: "Клапан обратный лепестковый КОл" },
  { slug: "klapan-obratnyj-kruglyj-ko", label: "Клапан обратный круглый КО" },
  { slug: "klapan-lepestkovyj-kl", label: "Клапан лепестковый КЛ" },
  { slug: "klapan-vozdushnyj-abk", label: "Клапан воздушный ABK" },
  { slug: "inspekcionnyj-lyuk-dlya-kruglogo-kanala", label: "Инспекционный люк для круглого канала" },
  { slug: "inspekcionnyj-lyuk-dlya-pryamougolnogo-kanala", label: "Инспекционный люк для прямоугольного канала" },
  { slug: "zont-pryamougolnyj", label: "Зонт прямоугольный" },
  { slug: "zont-kruglyj", label: "Зонт круглый" },
  { slug: "drossel-klapan-pryamougolnyj", label: "Дроссель-клапан прямоугольный" },
  { slug: "drossel-klapan-kruglyj", label: "Дроссель-клапан круглый" },
  { slug: "deflektor", label: "Дефлектор" },
  { slug: "gibkaya-vstavka-pryamougolnaya", label: "Гибкая вставка прямоугольная" },
  { slug: "gibkaya-vstavka-kruglaya", label: "Гибкая вставка круглая" }
];

export default function Details23Cards() {
  return (
    <section className="block" id="details23" data-toc="Номенклатура">
      <h2>Номенклатура деталей</h2>
      <p className="soft">23 позиции фасонных изделий и деталей — откройте карточку, чтобы увидеть описание, чертёж и таблицу.</p>
      <div className="cs-cards round-grid">
        {ITEMS.map((it) => {
          const p = bySlug(it.slug);
          if (!p) return null;
          return (
            <Link className="cs-card" to={`/product/${it.slug}`} key={it.slug}>
              <div className="cs-card-media">
                {p.photo ? <img src={p.photo} alt={it.label} loading="lazy" /> : <div className="ph">Фото готовится</div>}
              </div>
              <span className="cs-card-btn">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
