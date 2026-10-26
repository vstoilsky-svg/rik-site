import { Link, useLocation } from "react-router-dom";
import { businessPageByPath } from "../data/business-pages";
import ProductBreadcrumbs from "../components/ProductBreadcrumbs";
import SiteImage from "../components/SiteImage";
import NotFound from "./NotFound";
import "./business-page.css";

export default function BusinessPage() {
  const { pathname } = useLocation();
  const page = businessPageByPath(pathname);
  if (!page) return <NotFound />;
  return <>
    <ProductBreadcrumbs path={page.path} />
    <article className="container business-page section-body" data-business-page={page.path}>
      <header><h1>{page.name}</h1><p className="lead">{page.lead}</p>
        <div className="cta-row"><Link to="/request" className="btn btn-primary">Обсудить задачу</Link><Link to={page.parent} className="btn btn-ghost dark">{page.parent === "/" ? "Главная" : page.kind === "service" ? "Все услуги" : page.kind === "case" ? "Все проекты" : "Все решения"}</Link></div>
      </header>
      {page.image && <figure className="business-project-image"><SiteImage src={page.image} alt={page.imageCaption ?? page.name} loading="lazy" /><figcaption>{page.imageCaption}</figcaption></figure>}
      {page.sections.map(section => <section className="business-section" key={section.title}>
        <h2>{section.title}</h2>
        {section.paragraphs?.map(text => <p key={text}>{text}</p>)}
        {section.items && <ul>{section.items.map(text => <li key={text}>{text}</li>)}</ul>}
        {section.links && <ul className="business-links">{section.links.map(link => <li key={link.to}><Link to={link.to}>{link.label}<span aria-hidden="true"> →</span></Link></li>)}</ul>}
      </section>)}
      {page.kind === "case" && <p className="business-source">Проект представлен в <a href="/downloads/RIK-company-presentation.pptx">презентации компании РИК</a>.</p>}
      <section className="business-section business-cta"><h2>Обсудить ваш проект</h2><p>Пришлите техническое задание или опишите задачу. Состав работ, стоимость и сроки согласуются индивидуально.</p><Link to="/request" className="btn btn-primary">Отправить заявку</Link></section>
    </article>
  </>;
}
