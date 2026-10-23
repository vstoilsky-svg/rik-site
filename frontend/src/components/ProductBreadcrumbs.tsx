import { Fragment } from "react";
import { Link } from "react-router-dom";
import { breadcrumbsFor, resolveSeoRoute } from "../seo/routes";

export default function ProductBreadcrumbs({ path }: { path: string }) {
  const route = resolveSeoRoute(path);
  if (!route) return null;
  const items = breadcrumbsFor(route);
  return <nav className="crumbs container" aria-label="Хлебные крошки">
    {items.map((item, index) => <Fragment key={item.path}>
      {index > 0 && <span aria-hidden="true"> → </span>}
      {index === items.length - 1 ? <span aria-current="page">{item.label}</span> : <Link to={item.path}>{item.label}</Link>}
    </Fragment>)}
  </nav>;
}
