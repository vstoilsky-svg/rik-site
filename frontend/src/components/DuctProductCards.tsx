import { Link } from "react-router-dom";
import { PRODUCTS } from "../data/catalog";
import { ductFamilyOf, type DuctFamily } from "../data/duct-families";

type Props = {
  family: DuctFamily;
  excludeSlug?: string;
};

const COMPACT_MEDIA_SLUGS = new Set([
  "uzel-prohoda",
  "klapan-obratnyj-kruglyj-ko",
  "gibkaya-vstavka-pryamougolnaya",
  "kruglyj-otvod",
]);

export default function DuctProductCards({ family, excludeSlug }: Props) {
  const products = PRODUCTS.filter((product) => ductFamilyOf(product) === family && product.slug !== excludeSlug);
  if (!products.length) return null;

  return (
    <section className="block duct-nomenclature" id={excludeSlug ? "related" : "nomenclature"} data-toc={excludeSlug ? "Смотрите также" : "Номенклатура"}>
      <h2>{excludeSlug ? "Смотрите также" : "Номенклатура"}</h2>
      {!excludeSlug && <p className="soft">Выберите позицию, чтобы открыть описание, чертежи и технические данные.</p>}
      <div className="duct-product-grid">
        {products.map((product) => (
          <Link
            className={`duct-product-card${COMPACT_MEDIA_SLUGS.has(product.slug) ? " duct-product-card--compact" : ""}`}
            data-product-slug={product.slug}
            to={`/product/${product.slug}`}
            key={product.slug}
          >
            <span className="duct-product-media">
              {product.photo && !product.placeholder
                ? <img src={product.photo} alt={product.name} loading="lazy" />
                : <span className="ph">Фото готовится</span>}
            </span>
            <span className="duct-product-label">{product.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
