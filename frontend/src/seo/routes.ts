import { PRODUCTS, type Product } from "../data/catalog";
import { CENTRAL_SECTIONS, type CentralSection } from "../data/central-sections";
import { hasGenericResponsiveSource } from "../data/responsive-images";
import { PRODUCT_GUIDES } from "../data/product-guides";
import { MEETING_DESCRIPTIONS } from "./meeting-descriptions";
import { CHANNEL_ROUND_MENU, CHANNEL_RECT_MENU } from "../data/catalog";
import { ductFamilyOf, familyForHubSlug, DUCT_HUBS } from "../data/duct-families";
import { NEW_CATEGORY_LANDINGS, categoryProducts, CATEGORY_LANDING_PATHS } from "../data/category-landings";

export const SITE_ORIGIN = "https://rik-vent.ru";
export const DEFAULT_DESCRIPTION =
  "ООО «РИК» (Русская инжиниринговая компания) — российский производитель вентиляционного оборудования полного цикла в Москве: центральные установки, вентиляторы, клапаны, воздуховоды и автоматика.";

export type SeoRouteKind = "static" | "product" | "section" | "category";

export type SeoRoute = {
  path: string;
  title: string;
  description: string;
  image: string;
  criticalImage?: string;
  responsiveCriticalImage?: boolean;
  ogType: "website" | "product";
  kind: SeoRouteKind;
  name: string;
  indexable?: boolean;
  lastModified?: string;
};

type StaticSeo = { title: string; description: string; image?: string };

export const STATIC_SEO: Record<string, StaticSeo> = {
  "/": { title: "ООО «РИК» — завод вентиляционного оборудования", description: DEFAULT_DESCRIPTION, image: "/photo/home-hero-light.webp" },
  "/products": { title: "Продукция РИК — вентиляционное оборудование", description: "Каталог вентиляционного оборудования РИК: центральные установки, вентиляторы, клапаны, воздуховоды, автоматика и комплектующие.", image: "/photo/catalog/central-units-combined.png" },
  "/production": { title: "Производство вентиляционного оборудования — РИК", description: "Производственные возможности РИК: полный цикл изготовления вентиляционного оборудования и контроль качества.", image: "/photo/home-hero-light.webp" },
  "/projects": { title: "Проекты вентиляции и оснащения объектов — РИК", description: "Реализованные проекты с вентиляционным оборудованием РИК." },
  "/designers": { title: "Материалы для проектировщиков — РИК", description: "Каталоги, опросные листы, BIM-модели и технические материалы РИК для проектировщиков." },
  "/certificates": { title: "Сертификаты на оборудование — РИК", description: "Сертификаты и разрешительная документация на вентиляционное оборудование РИК." },
  "/questionnaires": { title: "Опросные листы на оборудование — РИК", description: "Опросные листы для подбора и расчёта вентиляционного оборудования РИК." },
  "/bim": { title: "BIM-библиотека оборудования — РИК", description: "BIM-модели вентиляционного оборудования РИК для проектирования." },
  "/tehlisty": { title: "Технические листы оборудования — РИК", description: "Технические листы и характеристики вентиляционного оборудования РИК." },
  "/requisites": { title: "Реквизиты ООО «РИК» — ИНН 9718157854", description: "Официальные реквизиты ООО «РИК» — Русской инжиниринговой компании: ИНН 9718157854, ОГРН 1207700208682, адрес в Москве." },
  "/privacy": { title: "Политика конфиденциальности — РИК", description: "Политика обработки персональных данных на сайте РИК." },
  "/personal-data-consent": { title: "Согласие на обработку персональных данных — РИК", description: "Условия согласия на обработку персональных данных, передаваемых через формы сайта РИК." },
  "/news": { title: "Новости производства и компании — РИК", description: "Новости производства и вентиляционного оборудования РИК." },
  "/careers": { title: "Работа и вакансии в компании РИК", description: "Работа и вакансии в компании РИК." },
  "/recommendations": { title: "Рекомендации и отзывы о компании РИК", description: "Рекомендательные письма и отзывы о работе компании РИК." },
  "/contractors": { title: "Генподрядчикам — вентиляция объекта под ключ | РИК", description: "Сотрудничество с генподрядчиками: проектирование, собственное производство, монтаж, пусконаладка и сервис вентиляции. Проекты и документы РИК." },
  "/services": { title: "Инженерные услуги компании РИК", description: "Подбор, расчёт, проектирование и сопровождение вентиляционного оборудования РИК." },
  "/about": { title: "ООО «РИК» — Русская инжиниринговая компания", description: "ООО «РИК» — Русская инжиниринговая компания, российский производитель вентиляционного оборудования полного цикла в Москве." },
  "/contacts": { title: "Контакты РИК в Москве — телефон и адрес отдела продаж", description: "Контакты ООО «РИК» в Москве: адрес и отдел продаж. Подбор вентиляционного оборудования: +7 (495) 104-37-79, zakaz@rik-vent.ru." },
  "/request": { title: "Запросить расчёт оборудования — РИК", description: "Отправьте заявку на подбор и расчёт вентиляционного оборудования РИК." },
};

// Route-specific wording is backed by the page content and catalog facts.
// Verify demand separately; a route name alone does not prove a Wordstat query.
const PRODUCT_SEO_OVERRIDES: Record<string, { title: string; description: string }> = {
  "kruglyj-perehod": {
    title: "Переход круглого воздуховода — РИК",
    description: "Переход круглого сечения для сети воздуховодов. Геометрия, размеры и толщина материала выбираются по проекту; на странице — чертежи и технические данные.",
  },
  "deflektor": {
    title: "Вентиляционный дефлектор — РИК",
    description: "Вентиляционный дефлектор РИК усиливает естественную тягу за счёт ветрового и теплового напора. Характеристики и техническая документация.",
  },
  "elektricheskie-vozduhonagrevateli-re": {
    title: "Электрические канальные нагреватели RE — РИК",
    description: "Электрические канальные нагреватели RE для прямоугольных воздуховодов. Ступенчатое или плавное регулирование мощности, характеристики и документация.",
  },
  "filtry-vozdushnye-kassetnye-rf": {
    title: "Кассетные фильтры для вентиляции RF — РИК",
    description: "Кассетные фильтры RF для очистки приточного воздуха в системах вентиляции. Прямоугольные корпуса, фильтрующие вставки и техническая документация.",
  },
  "kanalnoe-oborudovanie": {
    title: "Канальное оборудование для вентиляции — РИК",
    description: "Канальное оборудование РИК для круглых и прямоугольных воздуховодов. Откройте нужное сечение, чтобы посмотреть изделия и технические листы.",
  },
  "kryshnye-ventilyatory-dymoudaleniya-vverh-krv-du": {
    title: "Крышный вентилятор дымоудаления KRV-DU — РИК",
    description: "Крышные вентиляторы дымоудаления KRV-DU с выбросом вверх для удаления дымогазовых смесей при пожаре. Характеристики и технический лист.",
  },
  "protivopozharnye-klapany": {
    title: "Противопожарные клапаны РИК-1, РИК-2, РИК-3 — характеристики",
    description: "Противопожарные клапаны РИК-1, РИК-2 и РИК-3 для систем пожарной безопасности и противодымной вентиляции. Пределы огнестойкости EI 60/90/120.",
  },
  "pryamougolnaya-vrezka-v-pryamougolnyj-kanal": {
    title: "Врезка в прямоугольный воздуховод — РИК",
    description: "Врезка прямоугольного сечения в прямоугольный воздуховод РИК. Исполнения, присоединительные размеры и технический лист.",
  },
  "shumoglushitel-plastinchatyj-pryamougolnyj-gp": {
    title: "Пластинчатый шумоглушитель ГП для вентиляции — РИК",
    description: "Пластинчатый шумоглушитель ГП для прямоугольных воздуховодов. Снижение шума в системе вентиляции, размеры и технический лист.",
  },
  "vodyanye-vozduhonagrevateli-rw": {
    title: "Водяной канальный нагреватель RW — РИК",
    description: "Водяные канальные нагреватели RW для подогрева приточного воздуха в прямоугольных воздуховодах. Характеристики и технический лист.",
  },
};

const productNameCounts = PRODUCTS.reduce((counts, product) => {
  counts.set(product.name, (counts.get(product.name) ?? 0) + 1);
  return counts;
}, new Map<string, number>());

const PRODUCT_TITLE_OVERRIDES: Record<string, string> = {
  "elektricheskie-vozduhonagrevateli-re-kruglye": "Круглые электрические воздухонагреватели RE — РИК",
  "inspekcionnyj-lyuk-dlya-pryamougolnogo-kanala": "Инспекционный люк прямоугольного воздуховода — РИК",
  "kkb-rra-i2": "Инверторные компрессорно-конденсаторные блоки RRA I2 — РИК",
  "kruglaya-vrezka-v-pryamougolnyj-kanal": "Круглая врезка в прямоугольный воздуховод — РИК",
  "pryamougolnaya-vrezka-v-kruglyj-kanal": "Прямоугольная врезка в круглый воздуховод — РИК",
  "ventilyator-vr": "Канальный вентилятор VR с загнутыми назад лопатками — РИК",
  "ventilyatory-kryshnye-krv-v": "Крышные вентиляторы KRV-V с выбросом в сторону — РИК",
  "zaslonka-rkz-s-obogrevom": "Регулирующая заслонка RSn с обогревом — РИК",
};

const SECTION_TITLE_OVERRIDES: Record<string, string> = {
  "sekcii-smesheniya": "Секции смешения воздуха RP и промежуточные RU — РИК",
  "ventilyatornye-s-rezervom": "Вентиляторные секции с резервом RV1-R и RV2-R — РИК",
  "ventilyatornye-vzryvozashchishchennye": "Взрывозащищённые вентиляторные секции RV1-Ex и RV2-Ex — РИК",
  "zaslonka-s-obogrevom": "Регулирующая заслонка с обогревом для ЦК RSn — РИК",
};

// Даты только фактических содержательных правок, не дата очередной сборки.
const PAGE_LAST_MODIFIED: Record<string, string> = {
  "/contractors": "2026-09-24",
  "/product/kruglyj-perehod": "2026-09-24",
  "/recommendations": "2026-10-13",
  ...Object.fromEntries(Object.keys(PRODUCT_GUIDES).map((slug) => [`/product/${slug}`, "2026-10-13"])),
  ...Object.fromEntries(Object.keys(PRODUCT_TITLE_OVERRIDES).map((slug) => [`/product/${slug}`, "2026-10-13"])),
  ...Object.fromEntries(Object.keys(SECTION_TITLE_OVERRIDES).map((slug) => [`/product/centralnye-ustanovki/${slug}`, "2026-10-13"])),
};

function geometryQualifier(slug: string): string | undefined {
  if (/^(?:kruglyj|kruglaya)-/.test(slug)) return "круглого сечения";
  if (/^(?:pryamougolnyj|pryamougolnaya)-/.test(slug)) return "прямоугольного сечения";
  if (/-(?:kruglyj|kruglaya)(?:-|$)|-kruglogo-/.test(slug)) return "круглого сечения";
  if (/-(?:pryamougolnyj|pryamougolnaya)(?:-|$)|-pryamougolnogo-/.test(slug)) return "прямоугольного сечения";
  return undefined;
}

export function productDisplayName(product: Product): string {
  if ((productNameCounts.get(product.name) ?? 0) === 1) return product.name;
  const qualifier = geometryQualifier(product.slug);
  if (qualifier) return `${product.name} ${qualifier}`;
  return product.marking && product.marking !== "—" ? `${product.name} ${product.marking}` : `${product.name} ${product.slug}`;
}

// Полные фразы по содержимому соответствующих страниц. Не добавляем свойства,
// цены и обещания, которых нет в каталоге. Длина сама по себе не повод для обрыва.
const DESCRIPTION_OVERRIDES: Record<string, string> = {
  "/": "РИК — российский производитель вентиляционного оборудования в Москве. Центральные установки, вентиляторы, клапаны, воздуховоды и автоматика.",
  "/product/centralnye-ustanovki": "Центральные приточные и приточно-вытяжные установки RIK-M и RIK-S для комплексной обработки воздуха. Конфигурация под задачу объекта, характеристики и документация.",
  "/product/osevye-ventilyatory-podpora-rop": "Осевые вентиляторы подпора ROP для противодымной вентиляции: подача воздуха и создание избыточного давления в защищаемых зонах. Характеристики и технический лист.",
  "/product/osevye-kryshnye-ventilyatory-podpora-rop-k": "Крышные осевые вентиляторы подпора ROP-K для подачи наружного воздуха в системы противодымной вентиляции. Конструкция для установки на кровле и технические данные.",
  "/product/vodyanye-vozduhonagrevateli-rw-kruglye": "Круглые водяные воздухонагреватели RW для нагрева приточного воздуха горячей водой. Медно-алюминиевый теплообменник, характеристики и технический лист.",
  "/product/elektricheskie-vozduhonagrevateli-re-kruglye": "Круглые электрические воздухонагреватели RE для приточного воздуха. Трубчатые ТЭНы, ступенчатое управление мощностью и защита от перегрева. Технические данные.",
  "/product/shumoglushitel-rq-kruglyj": "Круглые канальные шумоглушители RQ для снижения аэродинамического шума в вентиляции. Звукопоглощающий материал в перфорированном корпусе. Характеристики и размеры.",
  "/product/kanalnoe-pryamougolnoe": "Прямоугольное канальное оборудование РИК: вентиляторы, нагреватели, охладители, фильтры, рекуператоры, заслонки и шумоглушители. Каталог и технические листы.",
  "/product/zaslonka-rkz-s-obogrevom": "Прямоугольные регулирующие заслонки RSn с периметральным обогревом для работы при пониженных температурах. Нагревательный кабель, характеристики и документация.",
  "/product/klapan-obratnyj-ro-kruglyj": "Круглые обратные клапаны RO предотвращают обратный поток воздуха в воздуховодах. Самозакрывающиеся створки. Размеры и технические данные для подбора.",
  "/product/zaslonka-reguliruyushchaya-rkz-kruglaya": "Круглые регулирующие заслонки RKZ с площадкой под привод для изменения расхода воздуха в воздуховодах. Ручное или электрическое управление. Технические данные.",
  "/product/klapany-izbytochnogo-davleniya": "Клапаны избыточного давления РИК: серии КИД и КИДм. Сравните назначение серий, откройте описания и технические таблицы для подбора оборудования.",
  "/product/klapany-izbytochnogo-davleniya-kid": "Клапаны избыточного давления КИД для автоматического перепуска воздуха и газов при повышении давления в помещениях. Назначение, характеристики и документация.",
  "/product/klapany-izbytochnogo-davleniya-kidm": "Модернизированные клапаны избыточного давления КИДм для сооружений ГО, АЭС и убежищ. Поддержание избыточного давления и движение воздуха в одном направлении.",
  "/product/germeticheskie-klapany": "Круглые герметические клапаны КГВ РИК для перекрытия воздуховодов в защитных сооружениях. Ручной привод или электропривод, фланцевое крепление и технические данные.",
  "/product/shumoglushitel-trubchatyj-pryamougolnyj-gtp": "Трубчатый прямоугольный шумоглушитель ГТП для систем вентиляции. Компактная конструкция, небольшое аэродинамическое сопротивление, размеры и технические данные.",
  "/product/uzel-prohoda": "Узел прохода вентиляционной шахты через кровельное перекрытие. Конструкция, материалы корпуса, варианты покрытия и технические данные для подбора по проекту.",
  "/product/nasadka-dlya-vybrosa-vozduha": "Насадка для выброса воздуха из оцинкованной стали. Защитная сетка и отвод воды; другие материалы доступны под заказ. Конструкция и технические данные.",
  "/product/klapan-obratnyj-lepestkovyj-kol": "Лепестковый обратный клапан КОл предотвращает перетекание воздуха к отключённым вентиляторам и от них. Подпружиненные лопасти, конструкция и технические данные.",
  "/product/klapan-obratnyj-kruglyj-ko": "Круглый обратный клапан КО предотвращает перетекание воздуха через ответвления к отключённым вентиляторам и от них при работе на общий коллектор. Технические данные.",
  "/product/klapan-lepestkovyj-kl": "Лепестковый клапан КЛ для установки на нагнетательной стороне осевого вентилятора. Защита от холодного воздуха и осадков после отключения. Конструкция и размеры.",
  "/product/klapan-vozdushnyj-abk": "Воздушный клапан ABK для регулирования расхода воздуха и невзрывоопасных газовых смесей или перекрытия вентиляционного канала. Характеристики и технический лист.",
  "/product/inspekcionnyj-lyuk-dlya-kruglogo-kanala": "Инспекционный люк для круглого воздуховода: доступ для осмотра, очистки и обслуживания вентиляции без демонтажа оборудования. Конструкция и технические данные.",
  "/product/inspekcionnyj-lyuk-dlya-pryamougolnogo-kanala": "Инспекционный люк для прямоугольного воздуховода: доступ для осмотра, очистки и обслуживания вентиляции без демонтажа оборудования. Конструкция и технические данные.",
  "/product/gibkaya-vstavka-pryamougolnaya": "Прямоугольная гибкая вставка для уменьшения передачи вибраций в вентиляционной системе. Условия применения, размеры и технические данные для подбора.",
  "/product/vozduhovody-i-fasonnye-izdeliya": "Круглые и прямоугольные воздуховоды РИК, фасонные изделия и соединения. Изготовление по проекту заказчика. Каталог, размеры и техническая документация.",
  "/product/detali-sistem-ventilyacii": "Детали систем вентиляции: отводы, тройники, переходы, врезки, заглушки, зонты и дефлекторы. Изготовление по чертежам заказчика. Каталог и технические данные.",
  "/product/kruglye-vozduhovody": "Круглые воздуховоды РИК: прямошовные и спирально-навивные, из оцинкованной, нержавеющей и чёрной стали. Изготовление по проекту заказчика и технические данные.",
  "/product/pryamougolnye-vozduhovody": "Прямоугольные воздуховоды РИК на шине и фланцевом соединении. Изготовление по проекту из оцинкованной, нержавеющей и чёрной стали. Размеры и документация.",
  "/product/kruglyj-pryamoj-uchastok": "Прямой участок круглого воздуховода РИК. Геометрия, размеры и толщина материала выбираются по проекту. Чертежи и технические данные на странице.",
  "/product/kruglyj-otvod": "Отвод круглого воздуховода РИК. Геометрия, размеры и толщина материала выбираются по проекту. На странице представлены чертежи и технические данные.",
  "/product/kruglyj-trojnik": "Тройник круглого воздуховода РИК. Размеры, геометрия и толщина материала выбираются по проекту. Чертежи и технические данные для подбора.",
  "/product/kruglaya-krestovina": "Крестовина круглого воздуховода РИК. Геометрия, размеры и толщина материала выбираются по проекту. Чертежи и технические данные для подбора.",
  "/product/kruglyj-nippel-mufta": "Ниппель и муфта для круглых воздуховодов РИК. Размеры, геометрия и толщина материала выбираются по проекту. Чертежи и технические данные.",
  "/product/kruglaya-vrezka-v-kruglyj-kanal": "Круглая врезка в круглый воздуховод РИК. Геометрия, размеры и толщина материала выбираются по проекту. Чертежи и технические данные на странице.",
  "/product/kruglaya-vrezka-v-pryamougolnyj-kanal": "Круглая врезка в прямоугольный воздуховод РИК. Геометрия и присоединительные размеры выбираются по проекту. Чертежи и технические данные.",
  "/product/kruglaya-zaglushka": "Заглушка круглого воздуховода РИК. Геометрия, размеры и толщина материала выбираются по проекту. Чертежи и технические данные для подбора.",
  "/product/kruglaya-utka": "Утка круглого воздуховода РИК. Геометрия, размеры и толщина материала выбираются по проекту. Чертежи и технические данные на странице.",
  "/product/pryamougolnyj-pryamoj-uchastok": "Прямой участок прямоугольного воздуховода РИК. Исполнение и присоединительные размеры подбираются по проекту. Чертежи и технические таблицы.",
  "/product/pryamougolnyj-perehod-na-krugloe-sechenie": "Переход с прямоугольного воздуховода на круглое сечение РИК. Исполнение и присоединительные размеры подбираются по проекту. Чертежи и технические данные.",
  "/product/pryamougolnyj-perehod-na-pryamougolnoe-sechenie": "Переход на прямоугольное сечение воздуховода РИК. Исполнение и присоединительные размеры подбираются по проекту. Чертежи и технические таблицы.",
  "/product/pryamougolnyj-trojnik": "Тройник прямоугольного воздуховода РИК. Исполнение и присоединительные размеры подбираются по проекту. Чертежи и технические данные для подбора.",
  "/product/pryamougolnyj-otvod": "Отвод прямоугольного воздуховода РИК. Исполнение и присоединительные размеры подбираются по проекту. На странице представлены чертежи и технические данные.",
  "/product/pryamougolnaya-krestovina": "Крестовина прямоугольного воздуховода РИК. Исполнение и присоединительные размеры подбираются по проекту. Чертежи и технические таблицы.",
  "/product/pryamougolnaya-vrezka-v-kruglyj-kanal": "Прямоугольная врезка в круглый воздуховод РИК. Исполнение и присоединительные размеры подбираются по проекту. Чертежи и технические данные.",
  "/product/adapter-dlya-ventilyacionnyh-reshetok": "Адаптер для вентиляционных решёток РИК. Исполнение и присоединительные размеры подбираются по проекту и техническим таблицам. Чертежи и документация.",
  "/product/pryamougolnaya-zaglushka": "Заглушка прямоугольного воздуховода РИК. Исполнение и присоединительные размеры подбираются по проекту. Чертежи и технические таблицы на странице.",
  "/product/pryamougolnaya-utka": "Утка прямоугольного воздуховода РИК. Исполнение и присоединительные размеры подбираются по проекту. Чертежи и технические данные для подбора.",
  "/product/flanec-pryamougolnyj": "Прямоугольный фланец для соединения элементов вентиляционной сети. Размер и исполнение выбираются под сечение воздуховода. Чертежи и технические данные РИК.",
  "/product/lyuk-vstavki": "Люк-вставки для осмотра и очистки герметических клапанов в воздуховодах. Две модификации по толщине корпуса. Конструкция и технические данные РИК.",
  "/product/smesitelnyj-uzel-mix": "Смесительный узел MIX для обвязки водяного калорифера: регулирование нагрева и охлаждения, поддержание температуры и защита от замерзания. Подбор по расходу и Kvs.",
  "/product/kkb-rra-l5": "Компрессорно-конденсаторные блоки RRA L5 для приточных установок и внутренних блоков. Работа по принципу старт/стоп, без инвертора. Характеристики и документация.",
  "/product/kkb-rra-i2": "Инверторные компрессорно-конденсаторные блоки RRA I2 для приточных установок и внутренних блоков. Плавная производительность, режимы холода и тепла. Характеристики.",
  "/product/chillery-teplovye-nasosy-i-gidromoduli": "Чиллеры ADR-A, тепловые насосы ADR-A/H и гидромодули RGM. Выберите охлаждение, холод и тепло или насосную группу. Характеристики линеек и технические листы.",
  "/product/chillery-adr-a": "Модульные чиллеры ADR-A с воздушным охлаждением конденсатора для охлаждения воды или незамерзающих смесей. Характеристики, модульное исполнение и документация.",
  "/product/chillery-adr-a-h": "Тепловые насосы ADR-A/H для охлаждения хладоносителя летом и нагрева зимой. Модульное исполнение для наращивания мощности. Характеристики и документация.",
  "/product/gidromoduli-rgm": "Гидромодули RGM для перекачки хладоносителя: один или два насоса, арматура, измерительные приборы и шкаф автоматики. Подбор под систему и технические данные.",
  "/product/ventilyatsionnye-zatvory": "Вентиляционные затворы для регулирования, перекрытия и герметизации потоков воздуха и газов. Применение, конструкция и технические данные оборудования РИК.",
  "/product/centralnye-ustanovki/ventilyatornye-s-rezervom": "Вентиляторные секции RV1-R и RV2-R с резервированием для центральных установок. Дублирование вентилятора при отказе основного. Характеристики и документация РИК.",
};

function compactDescription(value: string): string {
  let normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length < 70) {
    normalized = `${normalized} Официальная информация, документация и техническая поддержка РИК.`;
  }
  return normalized;
}

function productRoute(product: Product): SeoRoute {
  const name = productDisplayName(product);
  const seoOverride = PRODUCT_SEO_OVERRIDES[product.slug];
  const image = product.pageMedia?.[0]?.src ?? product.catalogMedia?.[0]?.src ?? product.photo ?? "/logo.png";
  const criticalImage = product.slug === "kanalnoe-oborudovanie"
    ? PRODUCTS.find((item) => item.slug === "kanalnoe-krugloe")?.photo ?? image
    : product.pageMedia?.[0]?.src ?? product.photo ?? image;
  return {
    path: `/product/${product.slug}`,
    title: PRODUCT_TITLE_OVERRIDES[product.slug] ?? seoOverride?.title ?? `${name} — оборудование РИК`,
    description: compactDescription(seoOverride?.description ?? `${name}. ${product.blurb}`),
    image,
    criticalImage,
    responsiveCriticalImage: hasGenericResponsiveSource(criticalImage),
    ogType: "product",
    kind: "product",
    name,
  };
}

function sectionRoute(section: CentralSection): SeoRoute {
  const name = `${section.name} ${section.marking}`;
  return {
    path: `/product/centralnye-ustanovki/${section.route}`,
    title: SECTION_TITLE_OVERRIDES[section.route] ?? `${name} — секция РИК`,
    description: compactDescription(`${name}. ${section.desc}`),
    image: section.photo,
    criticalImage: section.photo,
    responsiveCriticalImage: false,
    ogType: "product",
    kind: "section",
    name,
  };
}

const staticRoutes: SeoRoute[] = Object.entries(STATIC_SEO).map(([path, seo]) => ({
  path,
  title: seo.title,
  description: compactDescription(seo.description),
  image: seo.image ?? "/logo.png",
  ogType: "website",
  kind: "static",
  name: seo.title.replace(/\s+[—-]\s+РИК$/, ""),
  indexable: !["/privacy", "/personal-data-consent"].includes(path),
}));

export const SEO_ROUTES: SeoRoute[] = [
  ...staticRoutes,
  ...PRODUCTS.map(productRoute),
  ...CENTRAL_SECTIONS.map(sectionRoute),
  ...NEW_CATEGORY_LANDINGS.map((category): SeoRoute => ({
    path: `/products/${category.slug}`, name: category.name, title: category.title,
    description: category.description,
    image: categoryProducts(category)[0]?.photo ?? "/logo.png",
    ogType: "website", kind: "category",
  })),
].map((route) => ({
  ...route,
  description: compactDescription(MEETING_DESCRIPTIONS[route.path.replace(/^\/product\//, "")] ?? DESCRIPTION_OVERRIDES[route.path] ?? route.description),
  lastModified: route.kind === "category" || ["/", "/products"].includes(route.path)
    || (route.kind === "product" && parentProductPath(route.path.slice("/product/".length))?.startsWith("/products/"))
    ? "2026-10-26"
    : route.kind === "product" || route.kind === "section" || route.path === "/contacts"
    ? "2026-10-23"
    : DESCRIPTION_OVERRIDES[route.path] ? "2026-10-20" : PAGE_LAST_MODIFIED[route.path],
}));

function assertUnique(values: string[], label: string) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  if (duplicates.size > 0) throw new Error(`Duplicate SEO ${label}: ${[...duplicates].join(", ")}`);
}

if (staticRoutes.length !== 20 || PRODUCTS.length !== 100 || CENTRAL_SECTIONS.length !== 18 || NEW_CATEGORY_LANDINGS.length !== 2 || SEO_ROUTES.length !== 140) {
  throw new Error(`Unexpected SEO route census: static=${staticRoutes.length} products=${PRODUCTS.length} sections=${CENTRAL_SECTIONS.length} total=${SEO_ROUTES.length}`);
}
for (const route of SEO_ROUTES) {
  if (!/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(route.path) || (route.path.length > 1 && route.path.endsWith("/"))) {
    throw new Error(`Invalid canonical SEO path: ${route.path}`);
  }
  if (
    !route.title.trim()
    || !route.description.trim()
    || !route.image.startsWith("/")
    || (route.criticalImage && !route.criticalImage.startsWith("/"))
  ) {
    throw new Error(`Incomplete SEO metadata: ${route.path}`);
  }
  if (route.title.includes("�") || route.description.includes("�")) throw new Error(`Invalid UTF-8 marker in ${route.path}`);
  if (/(?:…|\.{3})\s*$/.test(route.description)) throw new Error(`Оборванное SEO-описание: ${route.path}`);
}
assertUnique(SEO_ROUTES.map((route) => route.path), "paths");
assertUnique(SEO_ROUTES.map((route) => route.title), "titles");
assertUnique(SEO_ROUTES.map((route) => route.description), "descriptions");

export const SEO_ROUTE_MAP = new Map(SEO_ROUTES.map((route) => [route.path, route]));

// Реальные страницы каталога, а не вывод иерархии из плоского URL.
function parentProductPath(slug: string): string | undefined {
  if (CHANNEL_ROUND_MENU.some((item) => item.to === `/product/${slug}`)) return "/product/kanalnoe-krugloe";
  if (CHANNEL_RECT_MENU.some((item) => item.to === `/product/${slug}`)) return "/product/kanalnoe-pryamougolnoe";
  if (["kanalnoe-krugloe", "kanalnoe-pryamougolnoe"].includes(slug)) return "/product/kanalnoe-oborudovanie";
  const p = PRODUCTS.find((product) => product.slug === slug);
  if (!p) return undefined;
  const family = ductFamilyOf(p);
  if (family && !familyForHubSlug(slug)) return `/product/${DUCT_HUBS[family]}`;
  if (familyForHubSlug(slug)) return "/product/vozduhovody-i-fasonnye-izdeliya";
  if (p.group === "specialvalves" && slug !== "specialnye-klapany") return "/product/specialnye-klapany";
  if (p.group === "chillers" && slug !== "chillery-teplovye-nasosy-i-gidromoduli") return "/product/chillery-teplovye-nasosy-i-gidromoduli";
  if (p.group === "fans" || p.group === "kkb") return CATEGORY_LANDING_PATHS[p.group];
  return undefined;
}

export function breadcrumbsFor(route: SeoRoute): { label: string; path: string }[] {
  if (route.path === "/") return [{ label: "Главная", path: "/" }];
  const ancestors: SeoRoute[] = [];
  let parent = route.kind === "section" ? "/product/centralnye-ustanovki"
    : route.kind === "product" ? parentProductPath(route.path.slice("/product/".length)) : undefined;
  const seen = new Set([route.path]);
  while (parent) {
    if (seen.has(parent)) throw new Error(`Цикл хлебных крошек: ${parent}`);
    seen.add(parent);
    const item = SEO_ROUTE_MAP.get(parent);
    if (!item) throw new Error(`Нет родительской страницы: ${parent}`);
    ancestors.unshift(item);
    parent = item.kind === "product" ? parentProductPath(item.path.slice("/product/".length)) : undefined;
  }
  return [
    { label: "Главная", path: "/" },
    ...(route.kind !== "static" ? [{ label: "Продукция", path: "/products" }] : []),
    ...ancestors.map((item) => ({ label: item.name, path: item.path })),
    { label: route.path === "/products" ? "Продукция" : route.name, path: route.path },
  ];
}

export function normalizeSeoPath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
}

export function resolveSeoRoute(pathname: string): SeoRoute | undefined {
  return SEO_ROUTE_MAP.get(normalizeSeoPath(pathname));
}

export function canonicalUrl(route: SeoRoute): string {
  return `${SITE_ORIGIN}${route.path === "/" ? "/" : `${route.path}/`}`;
}

export function robotsContentFor(route?: SeoRoute): string {
  return route && route.indexable !== false ? "index, follow, max-image-preview:large" : "noindex, follow";
}

export function structuredDataFor(route: SeoRoute): Record<string, unknown>[] {
  const url = canonicalUrl(route);
  const image = `${SITE_ORIGIN}${route.image}`;
  const data: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "ООО «РИК»",
      legalName: "Общество с ограниченной ответственностью «Русская инжиниринговая компания»",
      alternateName: ["РИК", "Русская инжиниринговая компания", "RIK", "RIK Vent", "rik-vent.ru"],
      url: SITE_ORIGIN,
      logo: `${SITE_ORIGIN}/logo.png`,
      telephone: "+7 (495) 104-37-79",
      email: "zakaz@rik-vent.ru",
      taxID: "9718157854",
      identifier: {
        "@type": "PropertyValue",
        propertyID: "ОГРН",
        value: "1207700208682",
      },
      address: {
        "@type": "PostalAddress",
        postalCode: "119517",
        addressCountry: "RU",
        addressLocality: "Москва",
        streetAddress: "Нежинская ул., д. 8, к. 2, этаж цоколь, помещ. 6а",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": route.kind === "category" ? "CollectionPage" : "WebPage",
      name: route.title,
      description: route.description,
      url,
      primaryImageOfPage: image,
      isPartOf: {
        "@type": "WebSite",
        name: "ООО «РИК»",
        alternateName: ["РИК", "RIK Vent", "rik-vent.ru"],
        url: SITE_ORIGIN,
      },
    },
  ];
  if (route.path !== "/") {
    data.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbsFor(route).map((crumb, index) => ({
        "@type": "ListItem", position: index + 1, name: crumb.label,
        item: `${SITE_ORIGIN}${crumb.path === "/" ? "/" : `${crumb.path}/`}`,
      })),
    });
  }
  if (route.kind === "category") {
    const category = NEW_CATEGORY_LANDINGS.find((item) => `/products/${item.slug}` === route.path);
    if (!category) throw new Error(`Категория SEO не найдена: ${route.path}`);
    data.push({
      "@context": "https://schema.org", "@type": "ItemList", name: route.name,
      itemListElement: categoryProducts(category).map((product, index) => ({
        "@type": "ListItem", position: index + 1, name: productDisplayName(product),
        url: `${SITE_ORIGIN}/product/${product.slug}/`,
      })),
    });
  }
  if (route.kind === "product" || route.kind === "section") {
    data.push({
      "@context": "https://schema.org",
      "@type": "Product",
      name: route.name,
      description: route.description,
      image,
      url,
      brand: { "@type": "Brand", name: "РИК" },
      category: "Вентиляционное оборудование",
    });
  }
  return data;
}
