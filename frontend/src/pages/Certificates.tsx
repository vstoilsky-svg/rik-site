import { useState } from "react";
import { Link } from "react-router-dom";
import { useAccessibleModal } from "../components/AccessibleModal";
import { PageHero } from "../components/rich";

const D = (f: string) => `/docs/certificates/${f}`;

// Реальные файлы из public/docs/certificates. Заголовок = что реально в PDF.
const CERTS: { title: string; file: string; kind: string }[] = [
  { title: "Установки RIK-S / RIK-M, вентиляторы WR, WRN, VR, KR, KRV", file: "RIK-S_RIK-M_WR_WRN_VR_KR_KRV.pdf", kind: "Сертификат соответствия" },
  { title: "Нагреватели и охладители RW, RE, RSW, RSF, MIX, VTR", file: "RW_RE_RSW_RSF_MIX_VTR.pdf", kind: "Сертификат соответствия" },
  { title: "ККБ, чиллеры, тепловые насосы и гидромодули", file: "kkb_chillery_i_drugoe.pdf", kind: "Сертификат соответствия" },
  { title: "Клапан противопожарный РИК-1", file: "RIK-1-s-prilozheniem.pdf", kind: "Сертификат пожарной безопасности" },
  { title: "Клапаны противопожарные РИК-2 / РИК-3", file: "RIK-2_RIK-3-s-prilozheniem.pdf", kind: "Сертификат пожарной безопасности" },
  { title: "Клапаны герметические вентиляционные", file: "klapany_germeticheskie_ventilyatsionnye.pdf", kind: "Сертификат соответствия" },
  { title: "Люк-вставка", file: "lyuk_vstavka.pdf", kind: "Сертификат соответствия" },
  { title: "Изделия из оцинкованной, холоднокатаной, горячекатаной и нержавеющей стали", file: "izdeliya_iz_otsinkovannoy_holodnokatnoy_goryachekatnoy_i_nerzhaveyushchey_stali.pdf", kind: "Сертификат соответствия" },
];

export default function Certificates() {
  const [open, setOpen] = useState<number | null>(null);
  const cur = open === null ? null : CERTS[open];
  const { dialogRef, rememberTrigger } = useAccessibleModal(cur !== null, () => setOpen(null));
  return (
    <>
      <PageHero
        crumbs={[{ label: "О компании", to: "/about" }, { label: "Сертификаты" }]}
        title="Сертификаты и декларации"
        lead="Документы соответствия на оборудование РИК. Откройте для просмотра или скачайте PDF."
      />
      <div className="container section-body">
      <h2 className="sr-only" id="certificates-list-section-title">Перечень сертификатов и деклараций</h2>
      <div className="cert-grid">
        {CERTS.map((c, i) => (
          <div className="cert-card" key={c.file}>
            <div className="cert-card-ico" aria-hidden>PDF</div>
            <div className="cert-card-body">
              <div className="cert-kind">{c.kind}</div>
              <h3>{c.title}</h3>
              <div className="cert-card-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={(event) => {
                    rememberTrigger(event.currentTarget);
                    setOpen(i);
                  }}
                >
                  Просмотр
                </button>
                <a className="btn btn-ghost dark" href={D(c.file)} download>Скачать</a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="cta-final block">
        <h2>Нужен документ, которого нет в списке?</h2>
        <p className="soft">Пришлите запрос — вышлем действующие сертификаты, декларации и протоколы испытаний под ваш проект.</p>
        <Link to="/request" className="btn btn-primary">Запросить документы</Link>
      </div>
      </div>

      {cur && (
        <div className="modal-backdrop" onClick={() => setOpen(null)}>
          <div
            ref={dialogRef}
            className="cert-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="certificate-dialog-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cert-head">
              <span id="certificate-dialog-title">{cur.title}</span>
              <div className="cert-actions">
                <a className="btn btn-ghost dark" href={D(cur.file)} target="_blank" rel="noopener">Открыть в новой вкладке</a>
                <a className="btn btn-primary" href={D(cur.file)} download>Скачать PDF</a>
                <button className="modal-close" onClick={() => setOpen(null)} aria-label="Закрыть" data-modal-initial-focus>✕</button>
              </div>
            </div>
            <iframe className="cert-frame" src={D(cur.file)} title={cur.title} tabIndex={-1} />
          </div>
        </div>
      )}
    </>
  );
}
