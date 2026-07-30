import { PageHero } from "../components/rich";

const LETTERS = [
  { src: "/recommendations/stankoremservice.png", title: "Станкоремсервис" },
  { src: "/recommendations/recommendation-tsk.png", title: "Рекомендательное-ТСК" },
  { src: "/recommendations/recommendation-stg.png", title: "Рекоменд СТГ" },
  { src: "/recommendations/recommendation-npp-ngk.png", title: "НПП НГК" },
];

export default function Recommendations() {
  return (
    <>
      <PageHero
        crumbs={[{ label: "О компании", to: "/about" }, { label: "Рекомендательные письма" }]}
        title="Рекомендательные письма"
        lead="Отзывы заказчиков и партнёров о поставках и совместных проектах с ООО «РИК»."
      />
      <div className="container section-body">
        <div className="client-letter-grid" aria-label="Рекомендательные письма клиентов">
          {LETTERS.map((letter) => (
            <figure className="client-letter-card" key={letter.src}>
              <a href={letter.src} target="_blank" rel="noopener noreferrer" aria-label={`Открыть письмо: ${letter.title}`}>
                <img src={letter.src} alt={`Рекомендательное письмо — ${letter.title}`} loading="lazy" />
              </a>
              <figcaption>{letter.title}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </>
  );
}
