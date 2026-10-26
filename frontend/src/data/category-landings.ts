import { PRODUCTS } from "./catalog";

// Один основной адрес для каждого заголовка каталога. Не создаём зеркала семейств.
export const CATEGORY_LANDING_PATHS: Record<string, string> = {
  central: "/product/centralnye-ustanovki",
  fans: "/products/ventilyatory",
  channel: "/product/kanalnoe-oborudovanie",
  firevalves: "/product/protivopozharnye-klapany",
  specialvalves: "/product/specialnye-klapany",
  ducts: "/product/vozduhovody-i-fasonnye-izdeliya",
  automation: "/product/shchity-upravleniya-ran",
  curtains: "/product/vozdushno-teplovye-zavesy-vtr",
  mix: "/product/smesitelnyj-uzel-mix",
  kkb: "/products/kompressorno-kondensatornye-bloki",
  chillers: "/product/chillery-teplovye-nasosy-i-gidromoduli",
};

export type CategoryLanding = {
  slug: string; group: string; name: string; title: string; description: string;
  lead: string; sections: { id: string; title: string; intro: string; slugs: string[] }[];
  selection: string[]; questions: { question: string; answer: string }[];
};

export const NEW_CATEGORY_LANDINGS: CategoryLanding[] = [
  {
    slug: "ventilyatory", group: "fans", name: "Вентиляторы",
    title: "Вентиляторы РИК — крышные, радиальные и канальные",
    description: "Вентиляторы РИК: крышные, радиальные, канальные, подпора и дымоудаления. Сравните серии, откройте характеристики и технические листы.",
    lead: "Вентиляторы для общеобменной и противодымной вентиляции. Выберите назначение и способ установки, затем откройте страницу серии с характеристиками и документацией.",
    sections: [
      { id: "kryshnye", title: "Крышные вентиляторы", intro: "Серии KRV и KRV-V различаются направлением выброса воздуха. Исполнение выбирают по проекту и условиям установки на кровле.", slugs: ["ventilyatory-kryshnye-krv", "ventilyatory-kryshnye-krv-v"] },
      { id: "radialnye", title: "Радиальные вентиляторы", intro: "Серия RR представлена отдельной страницей с конструкцией, исполнениями и техническими характеристиками.", slugs: ["ventilyatory-radialnye-rr"] },
      { id: "kanalnye", title: "Канальные вентиляторы", intro: "Вентиляторы для круглых и прямоугольных каналов. KR, VR и WR/WRN также доступны из разделов соответствующего канального оборудования.", slugs: ["kanalnyj-ventilyator-kr", "ventilyator-vr", "ventilyator-wr"] },
      { id: "podpor", title: "Вентиляторы подпора воздуха", intro: "Серии ROP и ROP-K для подачи воздуха в системах противодымной вентиляции. Крышное исполнение выделено отдельно.", slugs: ["osevye-ventilyatory-podpora-rop", "osevye-kryshnye-ventilyatory-podpora-rop-k"] },
      { id: "dymoudalenie", title: "Вентиляторы дымоудаления", intro: "Крышные вентиляторы KRV-DU с выбросом вверх. Применение и требуемое исполнение проверяют по техническому листу серии и проекту.", slugs: ["kryshnye-ventilyatory-dymoudaleniya-vverh-krv-du"] },
      { id: "prinadlezhnosti", title: "Монтажные принадлежности", intro: "Монтажные стаканы RMS — принадлежности для установки оборудования, а не отдельная серия вентиляторов.", slugs: ["montazhnye-stakany-rms"] },
    ],
    selection: ["Назначение системы и место установки вентилятора.", "Требуемые расход воздуха и давление по проекту.", "Исполнение, электрические параметры и ограничения по размещению.", "Проект или техническое задание для уточнения комплектации."],
    questions: [
      { question: "Где посмотреть характеристики конкретного вентилятора?", answer: "Откройте карточку нужной серии. На странице размещены описание, технические данные и доступные технические листы. Общая категория помогает выбрать семейство, но не заменяет проверку рабочей точки." },
      { question: "Где находятся канальные вентиляторы?", answer: "Серии KR, VR и WR/WRN собраны выше в блоке канальных вентиляторов. Их страницы также связаны с круглым и прямоугольным канальным оборудованием." },
    ],
  },
  {
    slug: "kompressorno-kondensatornye-bloki", group: "kkb", name: "Компрессорно-конденсаторные блоки",
    title: "Компрессорно-конденсаторные блоки РИК — серии RRA L5 и I2",
    description: "Компрессорно-конденсаторные блоки RRA L5 и RRA I2 для приточных установок и внутренних блоков. Исполнения старт/стоп и инверторное, технические листы.",
    lead: "Компрессорно-конденсаторные блоки для работы с приточными установками и внутренними блоками. В каталоге представлены серии RRA L5 и RRA I2 с разными способами регулирования производительности.",
    sections: [
      { id: "serii", title: "Серии RRA L5 и RRA I2", intro: "Сравните назначение и тип регулирования. Подробные параметры и документация доступны на отдельных страницах серий.", slugs: ["kkb-rra-l5", "kkb-rra-i2"] },
    ],
    selection: ["Параметры приточной установки или внутреннего блока.", "Требуемый режим работы и производительность по проекту.", "Условия размещения и электрические параметры.", "Техническое задание для проверки совместимости оборудования."],
    questions: [
      { question: "Чем отличаются RRA L5 и RRA I2?", answer: "RRA L5 работает по принципу старт/стоп без инвертора. RRA I2 — инверторная серия с плавным изменением производительности. Конкретное исполнение и характеристики приведены в документации каждой серии." },
      { question: "Можно ли выбрать блок только по его названию?", answer: "Нет. Для проверки совместимости нужны параметры установки и требования проекта. Передайте их вместе с запросом на расчёт; общая страница служит для перехода к нужной серии." },
    ],
  },
];

export function categoryLandingPath(group: string): string {
  const path = CATEGORY_LANDING_PATHS[group];
  if (!path) throw new Error(`Нет посадочной страницы категории: ${group}`);
  return path;
}
export const categoryBySlug = (slug: string) => NEW_CATEGORY_LANDINGS.find((item) => item.slug === slug);
export function categoryProducts(category: CategoryLanding) {
  return category.sections.flatMap((section) => section.slugs.map((slug) => {
    const product = PRODUCTS.find((item) => item.slug === slug);
    if (!product) throw new Error(`Нет товара ${slug} в категории ${category.slug}`);
    return product;
  }));
}
