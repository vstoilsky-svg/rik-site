import { Link } from "react-router-dom";
import { PageHero } from "../components/rich";

type Tile = { title: string; note: string; to?: string; href?: string; download?: boolean };

// to — внутренняя ссылка, href — файл/внешняя. Где материала пока нет — ведём на запрос.
const ITEMS: Tile[] = [
  { title: "Каталог оборудования", note: "Полный технический каталог РИК, PDF (412 стр.)", href: "/downloads/RIK-full-catalog-20260728.pdf" },
  { title: "Технические листы", note: "PDF по всем позициям — скачать", to: "/tehlisty" },
  { title: "Сертификаты и декларации", note: "Документы соответствия, просмотр и скачивание", to: "/certificates" },
  { title: "BIM-модели (Revit)", note: "Библиотека .rfa по каталогу — скачать", to: "/bim" },
  { title: "Опросные листы", note: "Формы на вентилятор и центральный кондиционер — скачать", to: "/questionnaires" },
  { title: "Подбор оборудования", note: "Отправьте ТЗ — подберём и рассчитаем", to: "/request" },
];

function TileCard({ t }: { t: Tile }) {
  const inner = (
    <>
      <h3>{t.title}</h3>
      <span className="tile-note">{t.note}</span>
    </>
  );
  if (t.href) return <a className="tile" href={t.href} target="_blank" rel="noopener" download={t.download}>{inner}</a>;
  return <Link className="tile" to={t.to!}>{inner}</Link>;
}

export default function ForDesigners() {
  return (
    <>
      <PageHero
        crumbs={[{ label: "Проектировщикам" }]}
        title="Проектировщикам"
        lead="Всё для проектирования систем вентиляции на оборудовании РИК — документация, модели и подбор."
        chips={[
          { icon: "doc", title: "Документация", sub: "каталоги, тех. листы" },
          { icon: "award", title: "Сертификаты", sub: "и декларации" },
          { icon: "layers", title: "BIM и опросные", sub: "модели и формы" },
        ]}
      />
      <div className="container section-body">
        <h2 className="sr-only" id="designer-resources-section-title">Материалы для проектировщиков</h2>
        <div className="tiles">
          {ITEMS.map((t) => <TileCard t={t} key={t.title} />)}
        </div>
        <div className="cta-final block"><h2>Отправить проект на расчёт</h2>
          <p className="soft">Пришлите проект или ТЗ — подберём оборудование и подготовим спецификацию.</p>
          <Link to="/request" className="btn btn-primary">Запросить расчёт</Link></div>
      </div>
    </>
  );
}
