import { PageHero } from "../components/rich";

// Наполнение: массив VACANCIES (title, city, type, desc). Пока пусто — общий призыв.
type Vacancy = { title: string; city: string; type: string; desc: string };
const VACANCIES: Vacancy[] = [];

const WHY = [
  ["Собственное производство", "Реальные инженерные задачи на полном цикле — от разработки до изделия"],
  ["Стабильность", "Российская производственная компания с проектами в промышленности и нефтегазе"],
  ["Развитие", "Рост внутри команды, обучение и работа со сложным оборудованием"],
];

const GMAIL_RESUME_URL = `https://mail.google.com/mail/?view=cm&fs=1&to=zakaz%40rik-vent.ru&su=${encodeURIComponent("Резюме — вакансия в РИК")}`;

export default function Careers() {
  return (
    <>
      <PageHero
        crumbs={[{ label: "О компании", to: "/about" }, { label: "Карьера" }]}
        title="Карьера в РИК"
        lead="Мы производим вентиляционное и климатическое оборудование полного цикла и растём. Ищем инженеров, конструкторов, производственных и коммерческих специалистов."
      />
      <div className="container section-body">
      <h2 className="sr-only" id="careers-benefits-section-title">Преимущества работы в РИК</h2>
      <div className="tiles">
        {WHY.map(([t, d]) => (
          <div className="tile" key={t}><h3 className="no-arrow">{t}</h3><p>{d}</p></div>
        ))}
      </div>

      <div className="block">
        <h2>Открытые вакансии</h2>
        {VACANCIES.length === 0 ? (
          <p className="soft">Актуальный список вакансий уточняется. Если вы профессионал в вентиляции, климате или
            производстве — присылайте резюме, мы рассмотрим его и свяжемся при появлении подходящей позиции.</p>
        ) : (
          <div className="news-list">
            {VACANCIES.map((v) => (
              <article className="news-item" key={v.title}>
                <div className="news-date">{v.city} · {v.type}</div>
                <h3>{v.title}</h3>
                <p className="soft">{v.desc}</p>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="cta-final block">
        <h2>Отправить резюме</h2>
        <p className="soft">Пришлите резюме на <a href="mailto:zakaz@rik-vent.ru">zakaz@rik-vent.ru</a> с пометкой «Вакансия».</p>
        <a className="btn btn-primary" href={GMAIL_RESUME_URL} target="_blank" rel="noopener noreferrer">Написать нам</a>
      </div>
      </div>
    </>
  );
}
