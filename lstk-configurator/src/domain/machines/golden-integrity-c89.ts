import type { RollFormingMachine } from "./types";

/**
 * Botou Golden Integrity Roll Forming Machine Co., Ltd — LGS C89 line.
 * Source: commercial offer "Official Offer of LGS C89 — Light gauge steel frame
 * machine" (Ms. Celina, sale3@jcxsteelrollformer.com), 19 pages.
 * Every value below is transcribed from that PDF; page numbers in `source`.
 */
const KP = "КП Golden Integrity LGS C89";

export const GOLDEN_INTEGRITY_C89: RollFormingMachine = {
  id: "golden-integrity-c89",
  vendor: "Botou Golden Integrity Roll Forming Machine Co., Ltd (Ботоу, Хэбэй, Китай)",
  model: "LGS C89 Light Gauge Steel Frame Roll Forming Machine",
  shortName: "Golden Integrity C89",
  profile: {
    family: "C",
    web: { value: 89, source: `${KP}, с. 2 (чертёж профиля), с. 4 («C shape 89*41mm»)` },
    flange: { value: 41, source: `${KP}, с. 2 (чертёж), с. 4` },
    lip: { value: 11, source: `${KP}, с. 2 (чертёж: 11 mm = 0.433071 inch)` },
    innerRadius: { value: null, note: "Радиус гиба в КП не указан — запросить чертёж профиля с радиусами" },
    webRib: {
      value: null,
      note: "На чертеже (с. 2) у стенки размеры «23» и «1» без пояснения: продольный рифт или что-то иное — уточнить у продавца",
    },
  },
  thickness: { value: { min: 0.75, max: 1.2 }, source: `${KP}, с. 4 («Steel thickness 0.75-1.2mm»)` },
  steelGrade: { value: "G550 (550 МПа)", source: `${KP}, с. 4 («179-182mm, G550MPA steel»)` },
  coating: { value: null, note: "Цинковое покрытие (Z/AZ, г/м²) в КП не указано — зависит от закупаемого рулона" },
  coilWidth: { value: { min: 179, max: 182 }, source: `${KP}, с. 4 («Coil width 179-182mm»)` },
  lengthAccuracy: { value: 0.5, source: `${KP}, с. 4 («Product Accuracy 0.5mm»)` },
  partLength: { value: null, note: "Минимальная и максимальная длина детали не указаны; стол выгрузки — 4 м (с. 14)" },
  speed: { value: "50 м/мин без пробивки; с пробивкой — зависит от числа отверстий и длины", source: `${KP}, с. 4, с. 9` },
  tools: [
    { kind: "service-hole", vendorName: "Service hole (Model 1)", feature: "service-hole", size: { value: null, note: "размер не указан" }, source: `${KP}, с. 3, 9, 10` },
    { kind: "web-notch", vendorName: "Web notch (Model 2)", feature: null, size: { value: null, note: "размер не указан" }, source: `${KP}, с. 3, 9, 10` },
    { kind: "end-truss", vendorName: "End truss (Model 3)", feature: null, size: { value: null, note: "форма торца и отверстие не указаны" }, source: `${KP}, с. 3, 9, 10` },
    { kind: "triple-web-hole", vendorName: "Triple web hole (Model 4)", feature: null, size: { value: null, note: "размеры не указаны" }, source: `${KP}, с. 9, 10` },
    { kind: "lip-notch", vendorName: "Lip notch / lip cut (Model 5)", feature: "lip-cut", size: { value: null, note: "длина подрезки не указана" }, source: `${KP}, с. 3, 4, 9, 10` },
    { kind: "dimple", vendorName: "Dimple (Model 6)", feature: "dimple", size: { value: null, note: "диаметр не указан" }, source: `${KP}, с. 3, 4, 9` },
    { kind: "swage", vendorName: "Swage (Model 7)", feature: "swage", size: { value: null, note: "длина и глубина обжатия не указаны" }, source: `${KP}, с. 3, 4, 9, 11` },
    { kind: "bolt-hole", vendorName: "Bolt hole / anchor hole", feature: "bolt-hole", size: { value: null, note: "диаметр не указан" }, source: `${KP}, с. 3, 4` },
    { kind: "chamfer", vendorName: "Chamfer cut", feature: null, size: { value: null, note: "угол и размер не указаны" }, source: `${KP}, с. 4, 9` },
    { kind: "shear", vendorName: "Shear (гидравлическая отрезка)", feature: null, size: { value: null, note: "—" }, source: `${KP}, с. 4, 11` },
  ],
  control: {
    value: "IPC с сенсорным экраном 19\", PLC Mitsubishi, реле Schneider, энкодер длины OMRON, серводвигатель INVT; 380 В, 3 фазы, 50 Гц",
    source: `${KP}, с. 12`,
  },
  designSoftware: { value: "Vertex BD («our machine can read Vertex BD software design the cutting file»)", source: `${KP}, с. 4, 12` },
  inputFormat: {
    value: null,
    note: "Файл раскроя из Vertex BD через USB или сеть; формат (колонки, коды инструментов) не описан. На снимке экрана (с. 13) колонки Column1… со значениями «COMPONENT», «Stud», «INVERTED» — похоже на CSV в стиле Howick, но это не подтверждено",
  },
  other: {
    price: { value: "50 500 USD, FOB Синьган (Тяньцзинь)", source: `${KP}, с. 2` },
    payment: { value: "30% предоплата, 70% перед отгрузкой (T/T)", source: `${KP}, с. 16` },
    delivery: { value: "7 рабочих дней после предоплаты и согласования ТЗ", source: `${KP}, с. 16` },
    warranty: { value: "12 месяцев с даты отгрузки", source: `${KP}, с. 16` },
    installation: { value: "Шеф-монтаж 200 USD/день + перелёт, проживание, переводчик за счёт покупателя", source: `${KP}, с. 16` },
    power: { value: "Главный привод 7,5 кВт (серво), всего 14,5 кВт; гидравлика отрезки 5,5 кВт, бак 120 л", source: `${KP}, с. 4, 8, 11` },
    forming: { value: "9 валов + 4 формующих клети; ролики DC53, HRC 58–62; валы 40Cr", source: `${KP}, с. 8, 9` },
    stations: { value: "8 позиций пробивки", source: `${KP}, с. 9` },
    weight: { value: "3000 кг (таблица, с. 4); формовочная часть 3,2 т, 4,3 × 0,8 × 1,8 м (с. 8)", source: `${KP}, с. 4, 8` },
    decoiler: { value: "Моторный, 3 т, внутренний Ø 430–590 мм, наружный Ø до 1300 мм", source: `${KP}, с. 7` },
    printer: { value: "Струйный, 2 головы: логотип и номер детали по сборочному чертежу", source: `${KP}, с. 10` },
    shipping: { value: "Помещается в один 20-футовый контейнер", source: `${KP}, с. 16` },
  },
};
