import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/* ---- Иконки (line, feather-стиль) ---- */
const P = (d: string) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d.split("|").map((p, i) => <path key={i} d={p} />)}</svg>
);
const ICONS: Record<string, ReactNode> = {
  gear: P("M12 15a3 3 0 100-6 3 3 0 000 6z|M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"),
  shield: P("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z|M9 12l2 2 4-4"),
  clock: P("M12 22a10 10 0 100-20 10 10 0 000 20z|M12 6v6l4 2"),
  box: P("M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z|M3.27 6.96L12 12.01l8.73-5.05|M12 22.08V12"),
  fan: P("M12 12a4 4 0 100-8 4 4 0 000 8z|M12 12c-2 0-6 1-6 5v3h5|M12 12c2 0 6 1 6 5v3h-5|M12 12c1.5-1.3 4.5-4 3-7"),
  sliders: P("M4 21v-7|M4 10V3|M12 21v-9|M12 8V3|M20 21v-5|M20 12V3|M1 14h6|M9 8h6|M17 16h6"),
  award: P("M12 15a7 7 0 100-14 7 7 0 000 14z|M8.21 13.89L7 23l5-3 5 3-1.21-9.12"),
  grid: P("M3 3h8v8H3z|M13 3h8v8h-8z|M13 13h8v8h-8z|M3 13h8v8H3z"),
  layers: P("M12 2L2 7l10 5 10-5-10-5z|M2 17l10 5 10-5|M2 12l10 5 10-5"),
  steps: P("M4 20h4v-6H4zM10 20h4V9h-4zM16 20h4V4h-4z"),
  folder: P("M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"),
  doc: P("M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z|M14 2v6h6|M16 13H8|M16 17H8|M10 9H8"),
  help: P("M12 22a10 10 0 100-20 10 10 0 000 20z|M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3|M12 17h.01"),
  check: P("M20 6L9 17l-5-5"),
  bolt: P("M13 2L3 14h9l-1 8 10-12h-9l1-8z"),
  wrench: P("M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2.4-2.4z"),
};
export function Icon({ name, className }: { name: string; className?: string }) {
  return <span className={"ic " + (className || "")}>{ICONS[name] ?? ICONS.box}</span>;
}

/* ---- Хлебные крошки ---- */
export type Crumb = { label: string; to?: string };
export function Crumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="crumbs2" aria-label="Хлебные крошки">
      <Link to="/" className="crumb-home" aria-label="Главная">⌂</Link>
      {items.map((c, i) => (
        <span key={i} className="crumb-part">
          <span className="crumb-sep">/</span>
          {c.to ? <Link to={c.to}>{c.label}</Link> : <span className="crumb-cur">{c.label}</span>}
        </span>
      ))}
    </nav>
  );
}

/* ---- Hero-баннер страницы (светлый, как на эталоне) ---- */
export type Chip = {
  icon: string;
  title: string;
  sub?: string;
  to?: string;
  href?: string;
  target?: string;
  download?: boolean;
};
export function PageHero({ crumbs, title, lead, chips }: { crumbs?: Crumb[]; title: string; lead?: string; chips?: Chip[] }) {
  return (
    <header className="page-hero">
      <div className="container">
        {crumbs && <Crumbs items={crumbs} />}
        <h1 className="page-hero-title">{title}</h1>
        {lead && <p className="page-hero-lead">{lead}</p>}
        {chips && (
          <div className="hero-chips">
            {chips.map((c) => {
              const content = <>
                <span className="hero-chip-ic"><Icon name={c.icon} /></span>
                <span className="hero-chip-txt"><b>{c.title}</b>{c.sub && <span>{c.sub}</span>}</span>
              </>;
              if (c.to) return <Link className="hero-chip hero-chip-link" to={c.to} key={c.title}>{content}</Link>;
              if (c.href) return <a className="hero-chip hero-chip-link" href={c.href} target={c.target} download={c.download} rel={c.target === "_blank" ? "noreferrer" : undefined} key={c.title}>{content}</a>;
              return <div className="hero-chip" key={c.title}>{content}</div>;
            })}
          </div>
        )}
      </div>
    </header>
  );
}

/* ---- Полоса цифр ---- */
export type Stat = { value: string; label: string };
export function StatsBand({ items }: { items: Stat[] }) {
  return (
    <div className="stats-band">
      {items.map((s) => (
        <div className="stat" key={s.label}>
          <div className="stat-value">{s.value}</div>
          <div className="stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ---- Карточки-иконки ---- */
export type Feature = { icon: string; title: string; text: string };
export function FeatureCards({ items }: { items: Feature[] }) {
  return (
    <div className="feature-cards">
      {items.map((f) => (
        <div className="feature-card" key={f.title}>
          <span className="feature-ic"><Icon name={f.icon} /></span>
          <h3>{f.title}</h3>
          <p>{f.text}</p>
        </div>
      ))}
    </div>
  );
}

/* ---- Боковое оглавление (якорные ссылки) ---- */
export type NavItem = { icon: string; label: string; href: string };
export function SideNav({ items, active }: { items: NavItem[]; active?: string }) {
  return (
    <aside className="side-nav">
      {items.map((n) => (
        <a key={n.href} href={n.href} className={"side-link" + (active === n.href ? " active" : "")}>
          <Icon name={n.icon} /><span>{n.label}</span>
          <span className="side-arrow">›</span>
        </a>
      ))}
    </aside>
  );
}
