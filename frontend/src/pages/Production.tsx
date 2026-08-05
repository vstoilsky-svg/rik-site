import { Link } from "react-router-dom";
import { FeatureCards, PageHero, StatsBand } from "../components/rich";
import { BENEFITS } from "../data/benefits";

const CAPABILITIES = [
  "Центральные каркасные установки RIK-M и RIK-S в стандартном и медицинском исполнении",
  "Круглое и прямоугольное канальное оборудование, воздуховоды и фасонные изделия",
  "Крышные, радиальные, подпорные и противодымные вентиляторы",
  "Противопожарные клапаны и системы автоматического управления",
  "Лазерная резка, автоматическая сварка, гидравлическая гибка и поточная сборка воздуховодов",
];

export default function Production() {
  return (
    <>
      <PageHero
        crumbs={[{ label: "Своё производство" }]}
        title="Своё производство"
        lead="Производственная площадка РИК полного цикла: от раскроя металла и сварки до сборки, автоматики и контроля готового оборудования."
        chips={[
          { icon: "box", title: "2 производственных цеха", sub: "по 2 150 м² каждый" },
          { icon: "fan", title: "До 95 000 м³/ч", sub: "центральные установки" },
          { icon: "sliders", title: "Стандарт и специсполнение", sub: "под задачу объекта" },
        ]}
      />

      <div className="container section-body production-page">
        <section className="production-video" aria-labelledby="production-video-title">
          <div className="section-heading">
            <span className="eyebrow">Видеоэкскурсия</span>
            <h2 id="production-video-title">Как устроено производство РИК</h2>
          </div>
          <video controls playsInline preload="metadata" poster="/media/production-poster.webp">
            <source src="/media/production-video.mp4" type="video/mp4" />
            Ваш браузер не поддерживает воспроизведение видео.
          </video>
        </section>

        <section className="production-benefits" aria-label="Преимущества производства">
          <FeatureCards items={BENEFITS} />
        </section>

        <StatsBand items={[
          { value: "4 300 м²", label: "суммарная площадь двух цехов" },
          { value: "Ø100–1200", label: "круглые воздуховоды" },
          { value: "Противопожарные клапаны", label: "РИК-1, РИК-2, РИК-3" },
          { value: "Центральные установки", label: "RIK-S, RIK-M" },
        ]} />

        <section className="block production-capabilities">
          <div className="section-heading">
            <span className="eyebrow">Производственные возможности</span>
            <h2>Оборудование и технологии в одном контуре</h2>
          </div>
          <div className="capability-list">
            {CAPABILITIES.map((item, index) => (
              <article key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{item}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="cta-final block">
          <div><h2>Нужно оборудование под ваш проект?</h2><p className="soft">Прикрепите спецификацию или ТЗ — инженеры подготовят подбор и расчёт.</p></div>
          <Link to="/request" className="btn btn-primary">Отправить проект</Link>
        </div>
      </div>
    </>
  );
}
