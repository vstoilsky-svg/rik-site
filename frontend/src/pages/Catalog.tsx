import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { GROUPS, byGroupCatalog, type Product } from "../data/catalog";
import { PageHero } from "../components/rich";
import ResponsiveCardImage from "../components/ResponsiveCardImage";
import { hasGenericResponsiveSource } from "../data/responsive-images";

// Хаб каталога. Вся карточка — одна ссылка на страницу товара (/product/<slug>).
function Card({ p }: { p: Product }) {
  const wide = p.catalogLayout === "wide";
  return (
    <Link
      to={`/product/${p.slug}`}
      className={wide ? "card card-link card-wide" : "card card-link"}
    >
      {wide && p.catalogMedia ? (
        <div className="card-media-duo">
          {p.catalogMedia.map((m) => (
            <figure key={m.src}>
              <span className="card-media-duo-image">
                {hasGenericResponsiveSource(m.src)
                  ? (
                    <ResponsiveCardImage
                      src={m.src}
                      alt=""
                      sizes="(max-width: 700px) calc(100vw - 64px), 520px"
                      profile="generic-card"
                    />
                  )
                  : <img src={m.src} alt="" loading="lazy" fetchPriority="low" />}
              </span>
              <figcaption>{m.label}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <span className="card-media">
          {p.photo && !p.placeholder
            ? hasGenericResponsiveSource(p.photo)
              ? (
                <ResponsiveCardImage
                  src={p.photo}
                  alt=""
                  sizes="(max-width: 700px) calc(100vw - 32px), 300px"
                  profile="generic-card"
                />
              )
              : <img src={p.photo} alt="" loading="lazy" fetchPriority="low" />
            : <span className="ph-sm">рендер готовится</span>}
        </span>
      )}
      <span className="card-body"><h3>{p.catalogName ?? p.name}</h3></span>
    </Link>
  );
}

export default function Catalog() {
  const { hash } = useLocation();

  // переход с главной: /products#<group> — скроллим к секции.
  // Пока грузятся фото выше, layout растёт и секция уезжает — первые секунды
  // держим её в кадре покадрово (учитывает и высоту шапки).
  useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    const until = performance.now() + 3500;
    let raf = 0;
    const tick = () => {
      const el = document.getElementById(id);
      if (el) {
        const top = el.getBoundingClientRect().top;
        if (Math.abs(top - 80) > 6) window.scrollBy(0, top - 80);
      }
      if (performance.now() < until) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [hash]);

  return (
    <>
      <PageHero
        crumbs={[{ label: "Продукция" }]}
        title="Продукция"
        lead="Каталог вентиляционного оборудования РИК: от центральных установок до фасонных изделий."
        chips={[
          { icon: "fan", title: "Полный каталог", sub: "PDF: всё оборудование РИК", href: "/downloads/RIK-full-catalog-20260728.pdf", target: "_blank" },
          { icon: "wrench", title: "Своё производство", sub: "видео и возможности", to: "/production" },
          { icon: "doc", title: "Техническая документация", sub: "технические листы PDF", to: "/tehlisty" },
        ]}
      />
      <div className="container catalog section-body">
        {GROUPS.map((g) => {
          const items = byGroupCatalog(g.key);
          if (!items.length) return null;
          return (
            <div key={g.key} id={g.key} className="cat-group">
              <h2>{g.title}</h2>
              <div className="cards">
                {items.map((p) => <Card key={p.slug} p={p} />)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
