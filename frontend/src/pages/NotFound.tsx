import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="section-body">
      <div className="container" style={{ maxWidth: 760, textAlign: "center", paddingBlock: 80 }}>
        <p className="eyebrow">Ошибка 404</p>
        <h1>Страница не найдена</h1>
        <p className="soft">
          Проверьте адрес или вернитесь в каталог вентиляционного оборудования РИК.
        </p>
        <div className="actions" style={{ justifyContent: "center" }}>
          <Link className="btn primary" to="/products">Перейти в каталог</Link>
          <Link className="btn ghost" to="/">На главную</Link>
        </div>
      </div>
    </section>
  );
}
