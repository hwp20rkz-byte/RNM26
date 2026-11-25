// «Лист проверки фактов» for the teacher: every fact the «Мектеп» topics teach, taken straight from the game's tables
// (web/mektep-core.js), so the sheet can never drift from the code. One row = one claim, with a box to tick.
//   node tools/make-factsheet.js > methodology/fact-check.md
//   pandoc methodology/fact-check.md -o methodology/fact-check.docx && python3 tools/style-docx.py methodology/fact-check.docx
const path = require('path');
global.window = global;
['data.js', 'grammar-core.js', 'kz-map.js'].forEach((f) => require(path.join(__dirname, '../web', f)));
const M = require(path.join(__dirname, '../web/mektep-core.js'));

const esc = (s) => String(s).replace(/\|/g, '\\|');
const year = (y) => (y < 0 ? -y + ' до н. э.' : String(y));
const FEATURE_KK = { river: 'өзен', lake: 'көл', mountain: 'тау' };

/** Sections: [title, grade/topic, source hint, rows of [claim in Kazakh, meaning in Russian]]. */
function sections() {
  const qa = (list) => list.map((q) => [q.kk + ' — **' + q.a + '**', q.ru]);
  return [
    ['История Казахстана', 'Тарих, 5 кл. («Қазақстан тарихы»)', 'учебник «Қазақстан тарихы» 5 кл. (темы), энциклопедия «Қазақстан»', qa(M.HISTORY_KZ)],
    ['История мира', 'Тарих, 5 кл. («Дүние жүзі»)', 'учебник «Дүниежүзі тарихы» 5 кл. (темы)', qa(M.HISTORY_WORLD)],
    ['Лента времени (годы событий)', 'Тарих, 5 кл. («Уақыт таспасы», 3D «Уақыт өзені»)', 'там же', M.EVENTS.map((e) => [e.kk + ' — **' + year(e.y) + '**', ''])],
    ['Рассказы Аты (весь текст звучит голосом)', 'Тарих, 5 кл. («Атаның әңгімелері»)', 'только факты из таблиц выше', M.ATA_STORIES.map((s) => [s.text, ''])],
    ['Легенды (свой пересказ)', 'Әдебиет, 3 кл. («Аңыздар»)', 'фольклор; учителю — уместность для 3 класса', M.LEGENDS.map((s) => [s.text, ''])],
    ['Писатели и произведения', 'Әдебиет, 4 кл.', 'хрестоматии Абая, Алтынсарина, Байтұрсынұлы', qa(M.LIT_AUTHORS)],
    ['Музыка и инструменты', 'Әдебиет, 3 кл.', 'учебник «Музыка» 3–4 кл. (темы)', qa(M.LIT_MUSIC)],
    ['Жанры (пример → жанр)', 'Әдебиет, 2 кл.', 'учебник «Әдебиеттік оқу» 2 кл. (темы)', M.GENRES.map((g) => ['«' + g.text + '» — **' + g.a + '**', ''])],
    ['Области и их центры', 'Қалалар, 3 кл.; География, 4 кл.', 'указы Президента РК 2022 г. (17 областей)', Object.keys(M.REGION_CENTER).map((r) => [r + ' — **' + M.REGION_CENTER[r] + '**', ''])],
    ['Где город на карте', 'География, 4 кл. («Қазақстан картасы»)', 'атлас 4 кл.; координаты приблизительные', Object.keys(M.CITY_LL).map((c) => [M.cityWhere(c), ''])],
    ['Озёра и моря', 'География, 4 кл. («Көлдер мен теңіздер»)', 'Natural Earth 1:50m; атлас 4 кл.', M.SEAS.map((w) => [M.waterWhere(w.id), ''])],
    ['Соседние страны', 'География, 4 кл.', 'атлас', [[M.NEIGHBORS.join(', '), '']]],
    ['Реки, озёра, горы', 'География, 3 кл.', 'атлас', Object.keys(M.FEATURE).map((f) => [f + ' — **' + FEATURE_KK[M.FEATURE[f]] + '**', ''])],
    ['Города республиканского значения', 'География, 3 кл.', 'Конституция / закон об АТУ', [[M.REP_CITIES.join(', '), '']]],
    ['Город на реке', 'Қалалар, 3 кл.', 'атлас', Object.keys(M.CITY_RIVER).map((c) => [c + ' — **' + M.CITY_RIVER[c] + '**', ''])],
    ['Достопримечательности', 'Қалалар, 2 и 4 кл.; «Саяхат»', 'официальные сайты акиматов (темы)',
      Object.keys(M.LANDMARK).map((l) => [l + ' — **' + M.LANDMARK[l] + '**', '']).concat(Object.keys(M.NEAR).map((l) => [l + ' — около: **' + M.NEAR[l] + '**', '']))
        .concat(Object.keys(M.TOUR).filter((l) => !(l in M.LANDMARK) && !(l in M.NEAR)).map((l) => [l + ' — **' + M.TOUR[l] + '**', '']))],
    ['Круговорот воды (порядок этапов)', 'Жаратылыстану, 2 кл. («Су айналымы»); 3D «Су айналымы»', 'учебник «Жаратылыстану», 2 кл. (темы)', [[M.WATER.map((w) => w.kk).join(' → ') + ' → (снова) ' + M.WATER[0].kk, '']]],
    ['Стороны света между городами', '3D «Қазақстан саяхаты» → «Қай жаққа?»', 'вычислено по координатам городов (раздел «Где город на карте»); только пары в пределах 15° от стороны света', [[M.compassPairs().length + ' пар; например: ' + M.compassPairs().filter((p, i) => i % 21 === 0).map((p) => p.from + ' → ' + p.to + ': ' + p.dir).join('; '), 'выборочно проверить по атласу']]],
    ['Красная книга', 'Жаратылыстану, 3 кл.', 'Красная книга РК', [[M.REDBOOK.join(', '), '']]],
    ['Где живёт животное', 'Жаратылыстану, 2 кл.; 3D «Табиғат зертханасы»', 'энциклопедия «Қазақстан» (фауна)', M.LAB_HOMES.map((h) => [h.kk + ' — **' + h.at + '**', ''])],
    ['Цепи питания', '3D «Табиғат зертханасы»', 'упрощённые цепи для 1–2 кл.', M.CHAINS.map((c) => [c.map((x) => x.kk).join(' → '), ''])],
    ['Здоровье', 'Жаратылыстану, 2 кл.', 'рекомендации ВОЗ для детей', qa(M.HEALTH)],
    ['Безопасность', 'Жаратылыстану, 2 кл.', 'Закон РК «О гражданской защите»; ПДД', qa(M.SAFETY)],
    ['Правила, которые говорят герои', 'все 48 тем (вступление и подсказка после ошибки)', 'свои формулировки — проверить язык',
      M.SUBJECTS.flatMap((s) => s.topics.map((t) => [M.TIPS[t.id], t.kk]))]
  ];
}

function build() {
  const S = sections(), total = S.reduce((n, s) => n + s[3].length, 0);
  const out = ['# QazaqVerse «Мектеп» — лист проверки фактов для учителя', '',
    'Каждая строка — утверждение, которое игра даёт детям (текст взят прямо из игры). Отметьте ☑ верное, ✗ неверное',
    'и впишите правку. Если строку нужно убрать для 1–5 классов как спорную — пометьте «убрать».', '',
    `Всего строк: **${total}** в ${S.length} разделах. Источники по каждой таблице — \`methodology/plan-10-days.md\`.`, '',
    'Учитель: ____________________   Дата: ____________   Подпись: ____________', ''];
  let k = 0;
  for (const [title, where, src, rows] of S) {
    out.push('## ' + title, '', '*' + where + '. Источник: ' + src + '.*', '', '| № | В игре | Смысл | ✓ | Правка |', '|-----|------------------------------------|------------------|--|------------|');
    for (const [kk, ru] of rows) out.push(`| ${++k} | ${esc(kk)} | ${esc(ru)} | ☐ | |`);
    out.push('');
  }
  return { md: out.join('\n'), total, sections: S };
}

module.exports = { build, sections };
if (require.main === module) process.stdout.write(build().md + '\n');
