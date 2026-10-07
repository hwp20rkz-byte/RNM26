/**
 * Design climate of Kazakhstan's cities for envelope sizing.
 *
 * t5 — air temperature of the coldest five-day period, 0.92 probability, °C;
 * z — heating period length, days (mean daily ≤ 8 °C);
 * tHt — mean outdoor temperature of the heating period, °C;
 * frost — standard seasonal freezing depth for loams, cm.
 *
 * `verified: true` rows are cross-checked against SP RK 2.04-01-2017 values
 * quoted in this repository's documents. The other rows are engineering
 * estimates interpolated from neighbouring stations: good for a preliminary
 * design, to be checked against SP RK 2.04-01-2017 «Строительная климатология»
 * before a working design.
 */
export interface City {
  id: string;
  /** Names in the three interface languages */
  name: { ru: string; kk: string; zh: string };
  region: string;
  t5: number;
  z: number;
  tHt: number;
  frost: number;
  /** Ground snow load, kPa (zone value) — indicative */
  snowKpa: number;
  verified: boolean;
}

const c = (id: string, ru: string, kk: string, zh: string, region: string, t5: number, z: number, tHt: number, frost: number, snowKpa: number, verified = false): City => ({
  id,
  name: { ru, kk, zh },
  region,
  t5,
  z,
  tHt,
  frost,
  snowKpa,
  verified,
});

export const CITIES: City[] = [
  c("astana", "Астана", "Астана", "阿斯塔纳", "Астана", -31.2, 215, -8.1, 190, 1.5, true),
  c("almaty", "Алматы", "Алматы", "阿拉木图", "Алматы", -20.1, 164, -1.6, 80, 1.2, true),
  c("shymkent", "Шымкент", "Шымкент", "奇姆肯特", "Шымкент", -14.3, 133, 1.0, 50, 0.8, true),
  c("karaganda", "Караганда", "Қарағанды", "卡拉干达", "Карагандинская", -32, 212, -7.5, 190, 1.5),
  c("aktobe", "Актобе", "Ақтөбе", "阿克托别", "Актюбинская", -31, 202, -7.6, 160, 1.5),
  c("atyrau", "Атырау", "Атырау", "阿特劳", "Атырауская", -23, 172, -4.3, 105, 0.8),
  c("aktau", "Актау", "Ақтау", "阿克套", "Мангистауская", -16, 150, 0.3, 70, 0.8),
  c("kostanay", "Костанай", "Қостанай", "科斯塔奈", "Костанайская", -34, 214, -8.2, 190, 1.5),
  c("pavlodar", "Павлодар", "Павлодар", "巴甫洛达尔", "Павлодарская", -35, 207, -9.3, 200, 1.5),
  c("petropavlovsk", "Петропавловск", "Петропавл", "彼得罗巴甫洛夫斯克", "Северо-Казахстанская", -35, 218, -8.9, 210, 1.8),
  c("kokshetau", "Кокшетау", "Көкшетау", "科克舍套", "Акмолинская", -33, 217, -8.2, 200, 1.8),
  c("oskemen", "Усть-Каменогорск", "Өскемен", "厄斯克门", "Восточно-Казахстанская", -37, 205, -8.5, 210, 2.4),
  c("semey", "Семей", "Семей", "塞米伊", "Абай", -36, 202, -8.5, 200, 1.8),
  c("oral", "Уральск", "Орал", "乌拉尔斯克", "Западно-Казахстанская", -27, 195, -5.9, 150, 1.5),
  c("kyzylorda", "Кызылорда", "Қызылорда", "克孜勒奥尔达", "Кызылординская", -22, 155, -3.2, 90, 0.8),
  c("taraz", "Тараз", "Тараз", "塔拉兹", "Жамбылская", -19, 151, -1.3, 70, 0.8),
  c("taldykorgan", "Талдыкорган", "Талдықорған", "塔尔迪库尔干", "Жетісу", -24, 172, -3.3, 100, 1.2),
  c("turkistan", "Туркестан", "Түркістан", "突厥斯坦", "Туркестанская", -16, 130, 0.5, 50, 0.8),
  c("zhezkazgan", "Жезказган", "Жезқазған", "杰兹卡兹甘", "Ұлытау", -29, 186, -6.0, 170, 1.2),
  c("ekibastuz", "Экибастуз", "Екібастұз", "埃基巴斯图兹", "Павлодарская", -35, 205, -9.0, 200, 1.5),
  c("temirtau", "Темиртау", "Теміртау", "铁米尔套", "Карагандинская", -32, 212, -7.5, 190, 1.5),
  c("balkhash", "Балхаш", "Балқаш", "巴尔喀什", "Карагандинская", -29, 180, -6.2, 160, 1.2),
  c("rudny", "Рудный", "Рудный", "鲁德尼", "Костанайская", -34, 214, -8.2, 190, 1.5),
  c("konaev", "Конаев", "Қонаев", "科纳耶夫", "Алматинская", -22, 160, -2.0, 80, 1.2),
  c("zhanaozen", "Жанаозен", "Жаңаөзен", "扎瑙津", "Мангистауская", -15, 150, 0, 60, 0.8),
  c("kulsary", "Кульсары", "Құлсары", "库利萨雷", "Атырауская", -22, 165, -3.5, 90, 0.8),
  c("ridder", "Риддер", "Риддер", "里德尔", "Восточно-Казахстанская", -36, 225, -8.0, 220, 3.2),
  c("arkalyk", "Аркалык", "Арқалық", "阿尔卡雷克", "Костанайская", -33, 210, -8.0, 190, 1.5),
  c("baikonur", "Байконур", "Байқоңыр", "拜科努尔", "Кызылординская", -23, 160, -3.0, 100, 0.8),
  c("zaysan", "Зайсан", "Зайсан", "斋桑", "Восточно-Казахстанская", -36, 195, -8.5, 200, 1.8),
  c("saryagash", "Сарыагаш", "Сарыағаш", "萨雷阿加什", "Туркестанская", -14, 120, 1.5, 40, 0.8),
  c("zharkent", "Жаркент", "Жаркент", "扎尔肯特", "Жетісу", -23, 160, -3.0, 90, 1.2),
  c("stepnogorsk", "Степногорск", "Степногор", "斯捷普诺戈尔斯克", "Акмолинская", -34, 215, -8.5, 200, 1.8),
  c("shchuchinsk", "Щучинск", "Щучинск", "休钦斯克", "Акмолинская", -33, 220, -7.9, 200, 1.8),
  c("aksu", "Аксу", "Ақсу", "阿克苏", "Павлодарская", -35, 207, -9.3, 200, 1.5),
];

export function findCity(id: string): City {
  return CITIES.find((x) => x.id === id) ?? CITIES[0]!;
}

/** Indoor design temperature by how the building is used, °C */
export const INDOOR_T = { permanent: 20, seasonal: 18, bath: 22, none: 5 } as const;

/** Degree-days of the heating period (ГСОП), °C·day */
export function degreeDays(city: City, tIn: number): number {
  return Math.max(0, (tIn - city.tHt) * city.z);
}

export type Element = "wall" | "roof" | "attic" | "floor" | "window";

/**
 * Required thermal resistance R = a·ГСОП + b, m²·K/W — the coefficients of the
 * standard table for residential buildings (SNiP 23-02 / SP RK 2.04-107 family).
 */
const COEF: Record<Element, [number, number]> = {
  wall: [0.00035, 1.4],
  roof: [0.0005, 2.2],
  attic: [0.00045, 1.9],
  floor: [0.00045, 1.9],
  window: [0.00005, 0.2],
};

export function requiredR(element: Element, gsop: number): number {
  const [a, b] = COEF[element];
  return a * gsop + b;
}
