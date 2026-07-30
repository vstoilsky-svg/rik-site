import { useState, type FormEvent } from "react";
import { PageHero } from "../components/rich";
import { PROJECTS } from "./Projects";

const SCOPE = ["Проектирование", "Производство", "Комплектация", "Монтаж", "Пусконаладка", "Сервис"];

const PRODUCTION_FACTS = [
  { title: "Центральные установки", text: "Каркасные установки RIK-M и RIK-S производительностью до 95 000 м³/ч. Панели толщиной 25 и 45 мм, модульное построение, стандартное и медицинское исполнение." },
  { title: "Комплексная обработка воздуха", text: "Фильтрация, нагрев, охлаждение, увлажнение, шумоглушение и рекуперация объединяются в конфигурацию под конкретный объект." },
  { title: "Канальное оборудование", text: "Круглые изделия диаметром 100–315 мм и прямоугольные изделия от 100×100 до 1000×500 мм, включая воздуховоды и фасонные элементы." },
  { title: "Вентиляторы и клапаны", text: "Крышные, радиальные, подпорные и противодымные вентиляторы; противопожарные клапаны нормального, обратного и дымового исполнения." },
  { title: "Технологическое оснащение", text: "Автоматическая сварка, лазерная резка, гидравлическая гибка и производственная линия воздуховодов обеспечивают повторяемость и точность изделий." },
  { title: "Автоматика", text: "Собственные щиты питания и управления для стандартных и специальных алгоритмов работы вентиляционного оборудования." },
];

const COMPANY_CARD = [
  ["Полное наименование", "Общество с ограниченной ответственностью «Русская инжиниринговая компания»"],
  ["Сокращённое наименование", "ООО «РИК»"],
  ["Юридический адрес", "119517, г. Москва, Нежинская ул., д. 8, к. 2, этаж цоколь, помещ. 6а"],
  ["Телефон", "+7 (495) 104-37-79"],
  ["E-mail", "zakaz@rik-vent.ru"],
  ["Сайт", "rik-vent.ru"],
  ["ИНН", "9718157854"],
  ["КПП", "772901001"],
  ["ОГРН", "1207700208682"],
  ["Дата регистрации", "29.06.2020"],
  ["ОКПО", "44583988"],
  ["ОКВЭД (осн.)", "28.25 — производство промышленного холодильного и вентиляционного оборудования"],
  ["Уставный капитал", "100 000 ₽"],
  ["Генеральный директор", "Койич Виктория Владимировна"],
];

const SLIDES = Array.from({ length: 13 }, (_, index) => `/presentation/slides/slide-${index + 1}.webp`);

const CLIENT_LETTERS = [
  { src: "/recommendations/stankoremservice.png", title: "Станкоремсервис" },
  { src: "/recommendations/recommendation-tsk.png", title: "Рекомендательное-ТСК" },
  { src: "/recommendations/recommendation-stg.png", title: "Рекоменд СТГ" },
  { src: "/recommendations/recommendation-npp-ngk.png", title: "НПП НГК" },
];

export default function ForContractors() {
  const [slide, setSlide] = useState(0);
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [error, setError] = useState("");

  async function sendProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/request", { method: "POST", body: new FormData(form) });
      if (!response.ok) throw new Error("Сервис временно недоступен");
      form.reset();
      setStatus("ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить проект");
      setStatus("err");
    }
  }

  const previous = () => setSlide((value) => (value - 1 + SLIDES.length) % SLIDES.length);
  const next = () => setSlide((value) => (value + 1) % SLIDES.length);

  return (
    <>
      <PageHero
        crumbs={[{ label: "Генподрядчикам" }]}
        title="Генподрядчикам"
        lead="Берём на себя вентиляцию объекта под ключ — от проекта и собственного производства до монтажа, пусконаладки и сервиса."
        chips={[
          { icon: "box", title: "Объект под ключ", sub: "одна точка ответственности" },
          { icon: "wrench", title: "Своё производство", sub: "стандарт и нестандарт" },
          { icon: "clock", title: "Сроки и сервис", sub: "монтаж, ПНР, ЗИП" },
        ]}
      />
      <main className="container section-body contractors-page">
        <section className="contractor-scope">
          <h2 className="block-h">Что берём на себя</h2>
          <div className="scope-line">
            {SCOPE.map((item, index) => <div key={item}><span>{index + 1}</span><b>{item}</b></div>)}
          </div>
        </section>

        <section className="block" id="production-capabilities">
          <div className="section-heading">
            <span className="eyebrow">Полный цикл</span>
            <h2>Производственные возможности</h2>
            <p className="soft">Два производственных цеха площадью по 2 150 м² позволяют выпускать серийное и нестандартное вентиляционное оборудование, контролируя качество на каждом этапе.</p>
          </div>
          <div className="production-fact-grid">
            {PRODUCTION_FACTS.map((fact, index) => <article key={fact.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{fact.title}</h3><p>{fact.text}</p></div></article>)}
          </div>
        </section>

        <section className="block" id="completed-projects">
          <div className="section-heading">
            <span className="eyebrow">Опыт реализации</span>
            <h2>Реализованные проекты</h2>
          </div>
          <div className="proj-cards contractor-projects">
            {PROJECTS.map((project) => (
              <article className="proj-card" key={project.name}>
                {project.img && <div className="proj-media"><img src={`/photo/projects/${project.img}.png`} alt={project.name} loading="lazy" /></div>}
                <div className="proj-body"><span className="proj-cat">{project.cat}</span><h3>{project.name}</h3><p>{project.desc}</p></div>
              </article>
            ))}
          </div>
        </section>

        <section className="block" id="client-recommendations">
          <div className="section-heading">
            <span className="eyebrow">Отзывы о сотрудничестве</span>
            <h2>Рекомендательные письма наших клиентов</h2>
          </div>
          <div className="client-letter-grid">
            {CLIENT_LETTERS.map((letter) => (
              <figure className="client-letter-card" key={letter.src}>
                <a href={letter.src} target="_blank" rel="noreferrer" aria-label={`Открыть письмо «${letter.title}»`}>
                  <img src={letter.src} alt={`Рекомендательное письмо — ${letter.title}`} loading="lazy" />
                </a>
                <figcaption>{letter.title}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="block" id="company-presentation">
          <div className="presentation-heading">
            <div className="section-heading"><span className="eyebrow">13 слайдов</span><h2>Презентация компании</h2><p className="soft">Листайте презентацию на странице или скачайте исходный файл PowerPoint.</p></div>
            <a className="btn btn-primary" href="/downloads/RIK-company-presentation.pptx" download>Скачать презентацию</a>
          </div>
          <div className="presentation-viewer">
            <button type="button" className="slide-arrow slide-prev" onClick={previous} aria-label="Предыдущий слайд">‹</button>
            <figure><img src={SLIDES[slide]} alt={`Презентация РИК — слайд ${slide + 1}`} /><figcaption>Слайд {slide + 1} из {SLIDES.length}</figcaption></figure>
            <button type="button" className="slide-arrow slide-next" onClick={next} aria-label="Следующий слайд">›</button>
          </div>
          <div className="slide-dots" aria-label="Навигация по слайдам">
            {SLIDES.map((_, index) => <button type="button" key={index} className={index === slide ? "active" : ""} onClick={() => setSlide(index)} aria-label={`Слайд ${index + 1}`} />)}
          </div>
        </section>

        <section className="block" id="company-card">
          <div className="section-heading"><span className="eyebrow">Реквизиты</span><h2>Карточка предприятия</h2></div>
          <dl className="company-card-table">
            {COMPANY_CARD.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}
          </dl>
        </section>

        <section className="block project-upload" id="send-project">
          <div className="section-heading"><span className="eyebrow">Получить расчёт</span><h2>Отправить проект</h2><p className="soft">Приложите проект, спецификацию, ТЗ или архив исходных данных.</p></div>
          <form className="req-form contractor-form" onSubmit={sendProject}>
            <input type="hidden" name="form_kind" value="send-project" />
            <label>Имя *<input name="name" required autoComplete="name" /></label>
            <label>Компания<input name="company" autoComplete="organization" /></label>
            <label>Телефон *<input name="phone" required inputMode="tel" autoComplete="tel" /></label>
            <label>E-mail *<input name="email" required type="email" autoComplete="email" /></label>
            <label className="wide">Комментарий<textarea name="comment" rows={4} /></label>
            <label className="wide upload-drop">Файлы проекта
              <input name="file" type="file" multiple accept=".pdf,.xls,.xlsx,.doc,.docx,.dwg,.dxf,.rvt,.ifc,.jpg,.jpeg,.png,.zip,.rar,.7z" />
              <span>Можно выбрать несколько файлов</span>
            </label>
            <label className="wide consent"><input name="consent" type="checkbox" required /> Согласен на обработку персональных данных</label>
            <input type="text" name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <button className="btn btn-primary" disabled={status === "sending"}>{status === "sending" ? "Отправляем…" : "Отправить"}</button>
            {status === "ok" && <p className="form-success">Проект отправлен. Мы свяжемся с вами после проверки файлов.</p>}
            {status === "err" && <p className="req-err">{error}. Можно позвонить: +7 (495) 104-37-79.</p>}
          </form>
        </section>
      </main>
    </>
  );
}
