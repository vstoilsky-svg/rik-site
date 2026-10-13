import { PageHero } from "../components/rich";
import { Link } from "react-router-dom";

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
        <section className="block">
          <h2>Документы о сотрудничестве с РИК</h2>
          <p>На странице размещены рекомендательные письма заказчиков и партнёров.
            Каждый документ можно открыть в исходном размере по нажатию на изображение.
            В оригинале доступны реквизиты автора, текст письма и сведения о сотрудничестве,
            которые удобно рассмотреть перед обращением в компанию.</p>
          <p>Рекомендательное письмо описывает опыт конкретной организации. Для нового объекта
            состав оборудования и условия работ определяются отдельно по проекту.
            Если вы планируете поставку или инженерные работы, <Link to="/request">отправьте проект
            на расчёт</Link> или <Link to="/contacts">свяжитесь с РИК</Link>. Примеры направлений
            работы представлены в разделе <Link to="/projects">проектов</Link>, а подтверждающие
            документы на продукцию — в разделе <Link to="/certificates">сертификатов</Link>.</p>
        </section>
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
