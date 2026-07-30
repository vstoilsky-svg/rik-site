import { Link } from "react-router-dom";
import { byGroupCatalog } from "../data/catalog";

const HOME_GROUPS = [
  { key: "central", title: "Центральные установки" },
  { key: "fans", title: "Вентиляторы" },
  { key: "channel", title: "Канальное оборудование" },
  { key: "firevalves", title: "Противопожарные клапаны" },
  { key: "specialvalves", title: "Специальные клапаны" },
  { key: "ducts", title: "Воздуховоды и фасонные изделия" },
  { key: "kkb", title: "Компрессорно-конденсаторные блоки" },
  { key: "chillers", title: "Чиллеры, тепловые насосы и гидромодули" },
] as const;

const ADVANTAGES = [
  ["Полный цикл", "Проектирование, производство, поставка, монтаж, пусконаладка и сервис"],
  ["Собственное производство", "Стандартное и нестандартное вентиляционное оборудование под задачи проекта"],
  ["Инженерная поддержка", "Технические листы, BIM-модели, опросные листы и помощь с подбором"],
  ["Комплексные поставки", "Оборудование и сопровождение для реализации систем вентиляции под ключ"],
];

const DOCUMENTS = [
  { title: "Каталог оборудования", note: "Полный технический каталог РИК", href: "/downloads/RIK-full-catalog-20260728.pdf" },
  { title: "Технические листы", note: "Характеристики и таблицы оборудования", to: "/tehlisty" },
  { title: "BIM-модели", note: "Файлы Revit для проектирования", to: "/bim" },
  { title: "Сертификаты", note: "Документы соответствия продукции", to: "/certificates" },
  { title: "Опросные листы", note: "Формы для подбора оборудования", to: "/questionnaires" },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <h1 className="hero-title">Производство вентиляционного оборудования полного цикла</h1>
          <p className="hero-sub">Проектирование • Производство • Поставка • Монтаж • ПНР • Сервис</p>
          <p className="hero-lead">Надёжные инженерные решения для промышленных и коммерческих объектов любой сложности.</p>
          <div className="hero-actions">
            <Link to="/request" className="btn btn-primary">Запросить расчёт</Link>
            <a href="/downloads/RIK-full-catalog-20260728.pdf" target="_blank" rel="noopener" className="btn btn-ghost">Скачать каталог</a>
          </div>
        </div>
      </section>

      <main className="home-content">
        <section className="home-section container" aria-labelledby="home-products-title">
          <div className="home-section-heading">
            <div>
              <span className="home-eyebrow">Продукция РИК</span>
              <h2 id="home-products-title">Оборудование для систем вентиляции</h2>
            </div>
            <Link className="home-heading-link" to="/products">Вся продукция →</Link>
          </div>
          <div className="home-category-grid">
            {HOME_GROUPS.map((group) => {
              const product = byGroupCatalog(group.key)[0];
              if (!product) return null;
              const image = product.catalogMedia?.[0]?.src ?? product.photo;
              return (
                <Link className="home-category-card" to={`/products#${group.key}`} key={group.key}>
                  <span className="home-category-media">
                    {image ? <img src={image} alt="" loading="lazy" /> : <span>РИК</span>}
                  </span>
                  <span className="home-category-title">{group.title}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="home-section home-advantages" aria-labelledby="home-advantages-title">
          <div className="container">
            <div className="home-section-heading home-section-heading-centered">
              <div>
                <span className="home-eyebrow">Почему РИК</span>
                <h2 id="home-advantages-title">От проекта до работающей системы</h2>
              </div>
            </div>
            <div className="home-advantage-grid">
              {ADVANTAGES.map(([title, text], index) => (
                <article className="home-advantage-card" key={title}>
                  <span aria-hidden>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="home-section container" aria-labelledby="home-docs-title">
          <div className="home-section-heading">
            <div>
              <span className="home-eyebrow">Для проектирования</span>
              <h2 id="home-docs-title">Инженерная документация</h2>
            </div>
            <Link className="home-heading-link" to="/designers">Проектировщикам →</Link>
          </div>
          <div className="home-document-grid">
            {DOCUMENTS.map((item) => {
              const content = <><strong>{item.title}</strong><span>{item.note}</span><b aria-hidden>→</b></>;
              return item.href
                ? <a className="home-document-card" href={item.href} target="_blank" rel="noopener noreferrer" key={item.title}>{content}</a>
                : <Link className="home-document-card" to={item.to!} key={item.title}>{content}</Link>;
            })}
          </div>
        </section>

        <section className="home-final-cta">
          <div className="container home-final-cta-inner">
            <div>
              <span className="home-eyebrow">Расчёт оборудования</span>
              <h2>Отправьте проект или техническое задание</h2>
              <p>Подберём оборудование РИК и подготовим спецификацию под параметры вашего объекта.</p>
            </div>
            <div className="home-final-actions">
              <Link className="btn btn-primary" to="/request">Отправить проект</Link>
              <a href="tel:+74951043779">+7 (495) 104-37-79</a>
              <a href="mailto:zakaz@rik-vent.ru">zakaz@rik-vent.ru</a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
