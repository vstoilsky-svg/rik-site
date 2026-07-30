import { useParams, Link } from "react-router-dom";
import { bySlug } from "../data/catalog";
import ProductView from "./ProductView";

export default function ProductPage() {
  const { slug } = useParams();
  const p = slug ? bySlug(slug) : undefined;
  if (!p) return (
    <section className="container" style={{ padding: "64px 24px" }}>
      <h1>Товар не найден</h1>
      <Link to="/products" className="btn btn-primary">Вся продукция</Link>
    </section>
  );
  return <div style={{ padding: "24px 0 0" }}><ProductView p={p} /></div>;
}
