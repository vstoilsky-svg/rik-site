import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <img src="/logo-white.png" alt="РИК" className="footer-logo-img" />
          <p className="footer-tag">Производство вентиляционного оборудования полного цикла</p>
        </div>
        <nav className="footer-links">
          <Link to="/products">Продукция</Link>
          <Link to="/certificates">Сертификаты</Link>
          <Link to="/requisites">Реквизиты</Link>
          <Link to="/careers">Карьера</Link>
          <Link to="/privacy">Политика конфиденциальности</Link>
        </nav>
        <div className="footer-contacts">
          <a href="tel:+74951043779">+7 (495) 104-37-79</a>
          <a href="mailto:zakaz@rik-vent.ru">zakaz@rik-vent.ru</a>
          <span>Москва, Нежинская ул., 8к2</span>
        </div>
      </div>
      <div className="footer-bottom container">© 2026 ООО «РИК» — Русская инжиниринговая компания</div>
    </footer>
  );
}
