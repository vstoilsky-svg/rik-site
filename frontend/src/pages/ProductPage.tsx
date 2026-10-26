import { useParams, Link } from "react-router-dom";
import { bySlug } from "../data/catalog";
import ProductView from "./ProductView";
import CatalogHubPage from "./CatalogHubPage";
import { CATALOG_HUBS } from "../data/catalog-hubs";

export default function ProductPage() {
  const { slug } = useParams();
  const p = slug ? bySlug(slug) : undefined;
  if (!p) return (
    <section className="container" style={{ padding: "64px 24px" }}>
      <h1>Товар не найден</h1>
      <Link to="/products" className="btn btn-primary">Вся продукция</Link>
    </section>
  );
  return <div style={{ padding: "24px 0 0" }}>{CATALOG_HUBS[p.slug] ? <CatalogHubPage p={p} /> : <ProductView p={p} />}</div>;
}
