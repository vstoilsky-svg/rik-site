import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { GROUPS, byGroupMenu } from "../data/catalog";

const NAV = [
  { to: "/products", label: "Продукция" },
  { to: "/projects", label: "Проекты" },
  { to: "/designers", label: "Проектировщикам" },
  { to: "/contractors", label: "Генподрядчикам" },
  { to: "/services", label: "Услуги" },
  { to: "/about", label: "О компании" },
  { to: "/contacts", label: "Контакты" },
];


export default function Header() {
  const [open, setOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"root" | "products" | `group:${string}`>("root");
  const burgerRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
    setMegaOpen(false);
    setMobilePanel("root");
  }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      setMobilePanel("root");
      burgerRef.current?.focus();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  const close = () => {
    setOpen(false);
    setMobilePanel("root");
  };
  const toggleMobileMenu = () => {
    setOpen((value) => !value);
    setMobilePanel("root");
  };
  const selectedGroupKey = mobilePanel.startsWith("group:") ? mobilePanel.slice(6) : null;
  const selectedGroup = selectedGroupKey ? GROUPS.find((group) => group.key === selectedGroupKey) : null;
  const selectedGroupItems = selectedGroup ? byGroupMenu(selectedGroup.key) : [];
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="logo" onClick={close}>
          <picture>
            <source srcSet="/logo-header.webp" type="image/webp" />
            <img src="/logo.png" alt="РИК — Русская инжиниринговая компания" width="320" height="120" />
          </picture>
        </Link>
        <nav className="nav">
          <div className="has-mega" onMouseEnter={() => setMegaOpen(true)} onMouseLeave={() => setMegaOpen(false)}>
            <Link to="/products" className="nav-link" onClick={() => setMegaOpen(false)}>Продукция ▾</Link>
            <div className="mega" style={{ display: megaOpen ? "block" : "none" }}>
              <div className="mega-inner container">
                {GROUPS.map((g) => {
                  const items = byGroupMenu(g.key);
                  if (!items.length) return null;
                  return (
                    <div className="mega-col" key={g.key}>
                      <div className="mega-title">{g.title}</div>
                      {items.map((p) => (
                        <Link key={p.slug} to={`/product/${p.slug}`} className="mega-link" onClick={() => setMegaOpen(false)}>{p.name}</Link>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {NAV.slice(1).map((n) => (
            <Link key={n.to} to={n.to} className="nav-link">{n.label}</Link>
          ))}
        </nav>
        <div className="header-cta">
          <a href="tel:+74951043779" className="header-phone">+7 (495) 104-37-79</a>
          <Link to="/request" className="btn btn-primary header-req">Запросить расчёт</Link>
          <button ref={burgerRef} className="burger" onClick={toggleMobileMenu} aria-label="Меню" aria-expanded={open}>
            <span>{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      {open && (
        <div className="mobile-menu">
          {mobilePanel === "root" && (
            <div className="mm-panel" key="root">
              <button type="button" className="mm-link mm-drill" onClick={() => setMobilePanel("products")}>
                <span>Продукция</span><span className="mm-chevron" aria-hidden="true">›</span>
              </button>
              {NAV.slice(1).map((n) => (
                <Link key={n.to} to={n.to} className="mm-link" onClick={close}>{n.label}</Link>
              ))}
              <a href="tel:+74951043779" className="mm-link" onClick={close}>+7 (495) 104-37-79</a>
              <Link to="/request" className="btn btn-primary mm-cta" onClick={close}>Запросить расчёт</Link>
            </div>
          )}

          {mobilePanel === "products" && (
            <div className="mm-panel" key="products">
              <button type="button" className="mm-back" onClick={() => setMobilePanel("root")}>
                <span aria-hidden="true">‹</span> Назад
              </button>
              <div className="mm-panel-title">Продукция</div>
              <Link to="/products" className="mm-link mm-drill" onClick={close}>
                <span>Вся продукция</span><span className="mm-chevron" aria-hidden="true">›</span>
              </Link>
              {GROUPS.map((group) => {
                const items = byGroupMenu(group.key);
                if (!items.length) return null;
                return (
                  <button
                    type="button"
                    className="mm-link mm-drill"
                    key={group.key}
                    onClick={() => setMobilePanel(`group:${group.key}`)}
                  >
                    <span>{group.title}</span><span className="mm-chevron" aria-hidden="true">›</span>
                  </button>
                );
              })}
            </div>
          )}

          {selectedGroup && (
            <div className="mm-panel" key={selectedGroup.key}>
              <button type="button" className="mm-back" onClick={() => setMobilePanel("products")}>
                <span aria-hidden="true">‹</span> Продукция
              </button>
              <div className="mm-panel-title">{selectedGroup.title}</div>
              {selectedGroupItems.map((product) => (
                <Link key={product.slug} to={`/product/${product.slug}`} className="mm-link mm-drill mm-product" onClick={close}>
                  <span>{product.name}</span><span className="mm-chevron" aria-hidden="true">›</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
