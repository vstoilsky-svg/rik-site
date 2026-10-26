import { Link, useParams } from "react-router-dom";
import { categoryBySlug } from "../data/category-landings";
import { bySlug } from "../data/catalog";
import ProductBreadcrumbs from "../components/ProductBreadcrumbs";
import { CatalogCard } from "./Catalog";
import NotFound from "./NotFound";

export default function CategoryLandingPage() {
  const { category: slug } = useParams();
  const category = slug ? categoryBySlug(slug) : undefined;
  if (!category) return <NotFound />;
  return <>
    <ProductBreadcrumbs path={`/products/${category.slug}`} />
    <section className="container category-intro section-body">
      <h1>{category.name}</h1>
      <p className="lead">{category.lead}</p>
      <div className="cta-row"><Link to="/request" className="btn btn-primary">Запросить расчёт</Link><Link to="/tehlisty" className="btn btn-ghost dark">Технические листы</Link></div>
      {category.sections.length > 1 && <nav className="category-jump-links" aria-label="Виды вентиляторов">
        {category.sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}
      </nav>}
    </section>
    <div className="container catalog category-landing-body">
      {category.sections.map((section) => <section className="cat-group" key={section.id} id={section.id}>
        <h2>{section.title}</h2><p className="category-section-lead">{section.intro}</p>
        <div className="cards">{section.slugs.map((slug) => {
          const p = bySlug(slug);
          if (!p) throw new Error(`Товар категории не найден: ${slug}`);
          return <CatalogCard key={p.slug} p={p} />;
        })}</div>
      </section>)}
      <section className="block category-selection">
        <h2>Что указать в запросе на подбор</h2>
        <ul>{category.selection.map((text) => <li key={text}>{text}</li>)}</ul>
        <p>Прикрепите проект или техническое задание к <Link to="/request">заявке на расчёт</Link>.</p>
      </section>
      <section className="block category-questions">
        <h2>Вопросы по выбору оборудования</h2>
        {category.questions.map((item) => <div key={item.question}><h3>{item.question}</h3><p>{item.answer}</p></div>)}
      </section>
    </div>
  </>;
}
