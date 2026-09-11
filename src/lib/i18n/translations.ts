import type { Locale } from "@/store/useUiPrefsStore";

// ---------------------------------------------------------------------------
// Пилотный перевод: шапка приложения + панель настроек интерфейса. Это НЕ
// полный перевод приложения — остальные ~30 экранов (конструктор сметы,
// реестры, отчёты) остаются на русском до отдельного эпика. Статический
// словарь, без внешнего переводчика — работает офлайн, без ключей API,
// перевод можно точечно поправить.
//
// Казахский перевод — мой лучший вариант для этих (не юридических)
// интерфейсных строк; сверка носителем перед публичным использованием
// всё равно не помешает, но здесь нет терминов Методики №166/Закона,
// требующих юридической точности — это общая лексика интерфейса.
// ---------------------------------------------------------------------------

const RU = {
  appTitle: "QazaqOSI — Тарифный калькулятор сметы ОСИ / ПТ",
  appSubtitle:
    "Расчёт по Методике МИИР РК №166 и Закону «О жилищных отношениях» — для любого жилого и нежилого объекта",
  settingsButton: "Настройки",
  settingsTitle: "Настройки интерфейса",
  settingsSubtitle: "Масштаб, тема и язык — сохраняются в этом браузере",
  fontSizeLabel: "Размер шрифта",
  sizeSm: "Мелкий",
  sizeMd: "Обычный",
  sizeLg: "Крупный",
  iconSizeLabel: "Размер иконок",
  iconSm: "Мелкие",
  iconMd: "Обычные",
  iconLg: "Крупные",
  densityLabel: "Плотность HUD и графиков",
  densityCompact: "Компактно",
  densityComfortable: "Обычно",
  densitySpacious: "Просторно",
  densityHint: "Увеличивает отступы, шрифты и высоту графиков сразу везде",
  themeLabel: "Тема оформления",
  themeLight: "Светлая",
  themeDark: "Тёмная",
  themeSystem: "Как в системе",
  languageLabel: "Язык интерфейса",
  languageHint: "Переведены шапка и эта панель · остальной интерфейс — на русском, переводится поэтапно",
  resetButton: "Сбросить настройки по умолчанию",
  closeButton: "Закрыть",
};

export type TranslationKey = keyof typeof RU;

const KZ: Record<TranslationKey, string> = {
  appTitle: "QazaqOSI — ОСИ/ПТ сметасының тарифтік калькуляторы",
  appSubtitle:
    "ҚР ИИДМ №166 Әдістемесі мен «Тұрғын үй қатынастары туралы» Заңына сәйкес есептеу — кез келген тұрғын және тұрғын емес нысанға арналған",
  settingsButton: "Баптаулар",
  settingsTitle: "Интерфейс баптаулары",
  settingsSubtitle: "Масштаб, тақырып және тіл осы браузерде сақталады",
  fontSizeLabel: "Қаріп өлшемі",
  sizeSm: "Кіші",
  sizeMd: "Қалыпты",
  sizeLg: "Үлкен",
  iconSizeLabel: "Белгіше өлшемі",
  iconSm: "Кіші",
  iconMd: "Қалыпты",
  iconLg: "Үлкен",
  densityLabel: "HUD және графиктер тығыздығы",
  densityCompact: "Ықшам",
  densityComfortable: "Қалыпты",
  densitySpacious: "Кең",
  densityHint: "Шегіністерді, қаріптерді және графиктер биіктігін бірден барлық жерде үлкейтеді",
  themeLabel: "Безендіру тақырыбы",
  themeLight: "Ашық",
  themeDark: "Күңгірт",
  themeSystem: "Жүйедегідей",
  languageLabel: "Интерфейс тілі",
  languageHint: "Тақырып пен осы панель аударылған · қалған интерфейс орыс тілінде — біртіндеп аударылады",
  resetButton: "Әдепкі баптауларды қалпына келтіру",
  closeButton: "Жабу",
};

const EN: Record<TranslationKey, string> = {
  appTitle: "QazaqOSI — HOA Service Charge Calculator",
  appSubtitle:
    "Calculated per Ministry of Industry Order No. 166 and the Housing Relations Law — for any residential or non-residential property",
  settingsButton: "Settings",
  settingsTitle: "Interface Settings",
  settingsSubtitle: "Scale, theme and language are saved in this browser",
  fontSizeLabel: "Font size",
  sizeSm: "Small",
  sizeMd: "Default",
  sizeLg: "Large",
  iconSizeLabel: "Icon size",
  iconSm: "Small",
  iconMd: "Default",
  iconLg: "Large",
  densityLabel: "HUD and chart density",
  densityCompact: "Compact",
  densityComfortable: "Comfortable",
  densitySpacious: "Spacious",
  densityHint: "Scales padding, text and chart height everywhere at once",
  themeLabel: "Color theme",
  themeLight: "Light",
  themeDark: "Dark",
  themeSystem: "System",
  languageLabel: "Interface language",
  languageHint: "Header and this panel are translated · the rest of the interface is in Russian, translated in stages",
  resetButton: "Reset to defaults",
  closeButton: "Close",
};

export const TRANSLATIONS: Record<Locale, Record<TranslationKey, string>> = { ru: RU, kz: KZ, en: EN };
