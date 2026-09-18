import type { Dict } from '../core';

/**
 * Translations for text produced by the ENGINE framing files: src/engine/framing/*.ts
 * (except openingCatalog.ts), src/engine/bom/index.ts, src/engine/orientation.ts and
 * src/engine/geometry.ts, plus the framing warnings emitted by those files.
 *
 * Member names/nameDe are hover labels and are NOT translated (see src/i18n brief). This
 * dictionary covers: cut-list group/name/notes, BOM line labels/specs/notes, material lines,
 * framing warnings, and the shared side-word entries ('front'/'rear'/'left'/'right' and their
 * slash combos) used by every engine template that carries a `{side}` placeholder.
 */
export default {
  // ── Shared side words (orientation.ts relabels these to any of the four world walls) ──────
  front: { uk: 'спереду', de: 'vorne' },
  rear: { uk: 'ззаду', de: 'hinten' },
  left: { uk: 'зліва', de: 'links' },
  right: { uk: 'справа', de: 'rechts' },
  'front/rear': { uk: 'спереду/ззаду', de: 'vorne/hinten' },
  'rear/front': { uk: 'ззаду/спереду', de: 'hinten/vorne' },
  'left/right': { uk: 'зліва/справа', de: 'links/rechts' },
  'right/left': { uk: 'справа/зліва', de: 'rechts/links' },
  partition: { uk: 'перегородка', de: 'Trennwand' },

  // ── Opening type default labels (openings.ts OPENING_DEFAULTS + frameOpening fallback) ────
  Door: { uk: 'Двері', de: 'Tür' },
  Window: { uk: 'Вікно', de: 'Fenster' },
  Passage: { uk: 'Прохід', de: 'Durchgang' },
  'Open passage': { uk: 'Відкритий прохід', de: 'Offener Durchgang' },

  // ── Member group labels ("English (German)"), used as both Member.group and CutListItem.group ──
  'Post (Pfosten)': { uk: 'Стовп (Pfosten)', de: 'Pfosten' },
  'Purlin (Pfette)': { uk: 'Прогон (Pfette)', de: 'Pfette' },
  'Rafter (Sparren)': { uk: 'Кроква (Sparren)', de: 'Sparren' },
  'Knee brace (Kopfband)': { uk: 'Підкіс (Kopfband)', de: 'Kopfband' },
  'Stud (Ständer)': { uk: 'Стійка (Ständer)', de: 'Ständer' },
  'Bottom plate (Schwelle)': { uk: "Нижня обв'язка (Schwelle)", de: 'Schwelle' },
  'Top plate (Rähm)': { uk: "Верхня обв'язка (Rähm)", de: 'Rähm' },
  'Header (Sturz)': { uk: 'Перемичка (Sturz)', de: 'Sturz' },
  'Window sill (Brüstungsriegel)': { uk: 'Підвіконний ригель (Brüstungsriegel)', de: 'Brüstungsriegel' },
  'End stud (Eckständer)': { uk: 'Кінцева стійка (Eckständer)', de: 'Eckständer' },
  'King stud (Sturzpfosten)': { uk: 'Несуча стійка (Sturzpfosten)', de: 'Sturzpfosten' },
  'Jack stud (Kurzstiel)': { uk: 'Стійка перемички (Kurzstiel)', de: 'Kurzstiel' },
  'Cripple stud (Zwischenstiel)': { uk: 'Проміжна стійка (Zwischenstiel)', de: 'Zwischenstiel' },
  'Door threshold (Türschwelle)': { uk: 'Поріг дверей (Türschwelle)', de: 'Türschwelle' },
  'Side rail (Rähm)': { uk: "Бічна обв'язка (Rähm)", de: 'Rähm' },
  'Floor bearer (Unterzug)': { uk: 'Опорна балка підлоги (Unterzug)', de: 'Unterzug' },
  'Floor joist (Fußbodenbalken)': { uk: 'Лага (Fußbodenbalken)', de: 'Fußbodenbalken' },
  'Sleeper (Lagerholz)': { uk: 'Лага (Lagerholz)', de: 'Lagerholz' },

  // ── Cut list bare names (buildCutList: group.split(' (')[0]) ──────────────────────────────
  Post: { uk: 'Стовп', de: 'Pfosten' },
  Purlin: { uk: 'Прогон', de: 'Pfette' },
  Rafter: { uk: 'Кроква', de: 'Sparren' },
  'Knee brace': { uk: 'Підкіс', de: 'Kopfband' },
  Stud: { uk: 'Стійка', de: 'Ständer' },
  'End stud': { uk: 'Кінцева стійка', de: 'Eckständer' },
  'King stud': { uk: 'Несуча стійка', de: 'Sturzpfosten' },
  'Jack stud': { uk: 'Стійка перемички', de: 'Kurzstiel' },
  'Cripple stud': { uk: 'Проміжна стійка', de: 'Zwischenstiel' },
  'Bottom plate': { uk: "Нижня обв'язка", de: 'Schwelle' },
  'Top plate': { uk: "Верхня обв'язка", de: 'Rähm' },
  Header: { uk: 'Перемичка', de: 'Sturz' },
  'Window sill': { uk: 'Підвіконний ригель', de: 'Brüstungsriegel' },
  'Door threshold': { uk: 'Поріг дверей', de: 'Türschwelle' },
  'Side rail': { uk: "Бічна обв'язка", de: 'Rähm' },
  'Floor bearer': { uk: 'Опорна балка підлоги', de: 'Unterzug' },
  'Floor joist': { uk: 'Лага підлоги', de: 'Fußbodenbalken' },
  Sleeper: { uk: 'Лага', de: 'Lagerholz' },

  // ── Cut list names with a wall suffix ("Post – front", "Post – front/rear", "Stud – partition") ──
  'Post – {sides}': { uk: 'Стовп – {sides}', de: 'Pfosten – {sides}' },
  'Purlin – {sides}': { uk: 'Прогон – {sides}', de: 'Pfette – {sides}' },
  'Rafter – {sides}': { uk: 'Кроква – {sides}', de: 'Sparren – {sides}' },
  'Knee brace – {sides}': { uk: 'Підкіс – {sides}', de: 'Kopfband – {sides}' },
  'Stud – {sides}': { uk: 'Стійка – {sides}', de: 'Ständer – {sides}' },
  'End stud – {sides}': { uk: 'Кінцева стійка – {sides}', de: 'Eckständer – {sides}' },
  'King stud – {sides}': { uk: 'Несуча стійка – {sides}', de: 'Sturzpfosten – {sides}' },
  'Jack stud – {sides}': { uk: 'Стійка перемички – {sides}', de: 'Kurzstiel – {sides}' },
  'Cripple stud – {sides}': { uk: 'Проміжна стійка – {sides}', de: 'Zwischenstiel – {sides}' },
  'Bottom plate – {sides}': { uk: "Нижня обв'язка – {sides}", de: 'Schwelle – {sides}' },
  'Top plate – {sides}': { uk: "Верхня обв'язка – {sides}", de: 'Rähm – {sides}' },
  'Header – {sides}': { uk: 'Перемичка – {sides}', de: 'Sturz – {sides}' },
  'Window sill – {sides}': { uk: 'Підвіконний ригель – {sides}', de: 'Brüstungsriegel – {sides}' },
  'Door threshold – {sides}': { uk: 'Поріг дверей – {sides}', de: 'Türschwelle – {sides}' },
  'Side rail – {sides}': { uk: "Бічна обв'язка – {sides}", de: 'Rähm – {sides}' },
  'Floor bearer – {sides}': { uk: 'Опорна балка підлоги – {sides}', de: 'Unterzug – {sides}' },
  'Floor joist – {sides}': { uk: 'Лага – {sides}', de: 'Fußbodenbalken – {sides}' },
  'Sleeper – {sides}': { uk: 'Лага – {sides}', de: 'Lagerholz – {sides}' },

  // ── Purlin row names (structure.ts, used inside longer warning messages) ──────────────────
  'Purlin front': { uk: 'Прогон спереду', de: 'Pfette vorne' },
  'Purlin rear': { uk: 'Прогон ззаду', de: 'Pfette hinten' },
  'Purlin left': { uk: 'Прогон зліва', de: 'Pfette links' },
  'Purlin right': { uk: 'Прогон справа', de: 'Pfette rechts' },
  'Purlin mid': { uk: 'Проміжний прогон', de: 'Mittelpfette' },
  'Purlin mid {n}': { uk: 'Проміжний прогон {n}', de: 'Mittelpfette {n}' },

  // ── BOM category labels (bom/index.ts CATEGORY_META) ───────────────────────────────────────
  Posts: { uk: 'Стовпи', de: 'Pfosten' },
  'Purlins & rails': { uk: "Прогони та обв'язки", de: 'Pfetten & Rähme' },
  Rafters: { uk: 'Крокви', de: 'Sparren' },
  'Knee braces': { uk: 'Підкоси', de: 'Kopfbänder' },
  'Wall studs': { uk: 'Стійки стін', de: 'Ständer' },
  'Bottom plates': { uk: "Нижні обв'язки", de: 'Schwellen' },
  Headers: { uk: 'Перемички', de: 'Stürze' },
  'Window sills': { uk: 'Підвіконні ригелі', de: 'Brüstungsriegel' },
  'Floor bearers': { uk: 'Опорні балки підлоги', de: 'Unterzüge' },
  'Floor joists / sleepers': { uk: 'Лаги підлоги', de: 'Fußbodenbalken / Lagerhölzer' },

  // ── Sheathing / roofing / flooring BOM lines (bom/index.ts computeBom) ─────────────────────
  'Wall cladding boards 20 mm': { uk: 'Дошки обшивки стін 20 мм', de: 'Wandschalungsbretter 20 mm' },
  'Roof: {covering}': { uk: 'Дах: {covering}', de: 'Dach: {covering}' },
  'Roof: {covering} on 22 mm deck': { uk: 'Дах: {covering} на настилі 22 мм', de: 'Dach: {covering} auf 22 mm Schalung' },
  'Floor deck: {label}': { uk: 'Підлогове покриття: {label}', de: 'Fußbodenbelag: {label}' },

  // ── Floor decking specs (framing/floor.ts DECKING) ─────────────────────────────────────────
  'Spruce T&G floorboards 28 mm': { uk: 'Дошка підлоги з ялини з шпунтом 28 мм', de: 'Fichte Fußbodendielen 28 mm' },
  'OSB/3 T&G flooring panels 22 mm': { uk: 'Підлогові плити OSB/3 з шпунтом 22 мм', de: 'OSB/3-Verlegeplatte 22 mm' },
  'Larch deck boards 27×145 mm': { uk: 'Дошка тераси з модрини 27×145 мм', de: 'Lärche Terrassendielen 27×145 mm' },

  // ── Bulk materials (bom/index.ts collectMaterials) ─────────────────────────────────────────
  'Roof edge trim (eaves & verge)': { uk: 'Крайовий профіль даху (карниз і фронтон)', de: 'Traufblech & Ortgangblech' },
  'Coated steel, 2 m lengths': { uk: 'Оцинкована сталь з покриттям, відрізки по 2 м', de: 'Beschichteter Stahl, 2 m Längen' },
  'Roof perimeter + 10 % overlaps': { uk: 'Периметр даху + 10 % на нахлест', de: 'Dachumfang + 10 % Überlappung' },
  'Bitumen underlay': { uk: 'Бітумна підкладка', de: 'Bitumen-Unterlagsbahn' },
  'V13, nailed to the deck': { uk: 'V13, прибивається до настилу', de: 'V13, auf die Schalung genagelt' },
  '+10 % laps': { uk: '+10 % на нахлести', de: '+10 % Überlappung' },
  'Counter battens': { uk: 'Контррейки', de: 'Konterlatten' },
  '24×48 mm, impregnated': { uk: '24×48 мм, просочена', de: '24×48 mm, imprägniert' },
  'One per rafter + 10 %': { uk: 'По одній на крокву + 10 %', de: 'Eine je Sparren + 10 %' },
  'Tiling battens': { uk: 'Покрівельні рейки', de: 'Dachlatten' },
  '30×50 mm, S10, ≈ 330 mm gauge': { uk: '30×50 мм, S10, крок ≈ 330 мм', de: '30×50 mm, S10, ≈ 330 mm Lattenabstand' },
  '≈ 3 m per m² + 10 %': { uk: '≈ 3 м на м² + 10 %', de: '≈ 3 m pro m² + 10 %' },
  'Bitumen DPC strip under floor timber': { uk: 'Бітумна гідроізоляційна стрічка під підлоговими лагами', de: 'Bitumen-Sperrbahn unter Lagerhölzern' },
  '{n} mm wide': { uk: '{n} мм завширшки', de: '{n} mm breit' },
  'Paving stones {spec}': { uk: 'Тротуарна плитка {spec}', de: 'Pflastersteine {spec}' },
  '+5 % cutting waste': { uk: '+5 % на підрізку', de: '+5 % Schnittverlust' },
  'Edge restraint (lawn edging) in concrete': { uk: 'Бордюрне обмеження (газонний бордюр) у бетоні', de: 'Rasenkantensteine in Beton' },
  'Sub-base, crushed gravel 0/32': { uk: 'Основа, щебінь 0/32', de: 'Schottertragschicht 0/32' },
  '20 cm compacted': { uk: '20 см, ущільнений', de: '20 cm verdichtet' },
  'Bedding grit 2/5': { uk: 'Підстилковий шар, крихта 2/5', de: 'Pflastersplitt 2/5' },
  'Jointing sand': { uk: 'Фуговий пісок', de: 'Fugensand' },

  // ── Fixture line custom (non-catalogue) product labels (bom/index.ts fixtureLine) ─────────
  'Custom door {size}': { uk: 'Індивідуальні двері {size}', de: 'Individuelle Tür {size}' },
  'Custom window {size}': { uk: 'Індивідуальне вікно {size}', de: 'Individuelles Fenster {size}' },
  'Open passage {size}': { uk: 'Відкритий прохід {size}', de: 'Offener Durchgang {size}' },

  // ── Member notes (structure.ts, walls.ts, roof.ts, floor.ts) ───────────────────────────────
  'Top cut to purlin slope': { uk: 'Верхній зріз під ухил прогону', de: 'Kopfschnitt schräg zur Pfette' },
  'Top cut to rail slope': { uk: "Верхній зріз під нахил обв'язки", de: 'Oberer Schnitt zur Rähmneigung' },
  'Top cut to roof slope': { uk: 'Верхній зріз під нахил даху', de: 'Oberer Schnitt zur Dachneigung' },
  'Under the rafters': { uk: 'Під кроквами', de: 'Unter den Sparren' },
  'Sloped under the rafters': { uk: 'Похило під кроквами', de: 'Geneigt unter den Sparren' },
  'Level under the rafters, between the purlin rows': { uk: 'Горизонтально під кроквами, між рядами прогонів', de: 'Waagerecht unter den Sparren, zwischen den Pfettenreihen' },
  'Plumb cuts against purlins': { uk: 'Прямовисні зрізи впритул до прогонів', de: 'Lotrechte Schnitte gegen die Pfetten' },
  'On point foundations, bitumen strip underneath': { uk: 'На точкових фундаментах, бітумна стрічка знизу', de: 'Auf Punktfundamenten, Bitumenstreifen darunter' },
  'On levelling pads on the slab': { uk: 'На вирівнювальних підкладках на плиті', de: 'Auf Ausgleichsplatten auf der Bodenplatte' },
  'Top flush with the finished floor': { uk: 'Верх врівень із чистовою підлогою', de: 'Oberkante bündig mit dem Fertigfußboden' },
  'Over {label} {width} mm': { uk: 'Над {label} {width} мм', de: 'Über {label} {width} mm' },
  'Upper cut {deg}° against the sloped purlin': { uk: 'Верхній зріз {deg}° впритул до похилого прогону', de: 'Oberer Schnitt {deg}° gegen die geneigte Pfette' },
  'Sloped {deg}°, plumb-cut tails': { uk: 'Похило {deg}°, прямовисні зрізи кінців', de: 'Geneigt {deg}°, lotrecht geschnittene Enden' },
  'Sloped {deg}°, plumb-cut tails – {note}': { uk: 'Похило {deg}°, прямовисні зрізи кінців – {note}', de: 'Geneigt {deg}°, lotrecht geschnittene Enden – {note}' },
  'Spliced over post (Hakenblatt / Stoß)': { uk: "Зрощення над стовпом (Hakenblatt / Stoß)", de: 'Stoß über Pfosten (Hakenblatt / Stoß)' },
  'Level on sloped purlins – seat bevelled {deg}°': { uk: 'Горизонтально на похилих прогонах – опорна площина скошена на {deg}°', de: 'Waagerecht auf geneigten Pfetten – Auflager um {deg}° abgeschrägt' },
  'Level on sloped purlins – seat bevelled {deg}°, spliced square over the mid purlin': { uk: 'Горизонтально на похилих прогонах – опорна площина скошена на {deg}°, зрощення прямим зрізом над середнім прогоном', de: 'Waagerecht auf geneigten Pfetten – Auflager um {deg}° abgeschrägt, gerader Stoß über der Mittelpfette' },
  '{n}× birdsmouth (Kerve) {depth} mm deep, seat {seat} mm': { uk: '{n}× врубка (Kerve) глибиною {depth} мм, опора {seat} мм', de: '{n}× Kerve {depth} mm tief, Auflager {seat} mm' },
  '{n}× birdsmouth (Kerve) {depth} mm deep, seat {seat} mm – spliced plumb over the mid purlin': { uk: '{n}× врубка (Kerve) глибиною {depth} мм, опора {seat} мм – зрощення прямовисним зрізом над середнім прогоном', de: '{n}× Kerve {depth} mm tief, Auflager {seat} mm – lotrechter Stoß über der Mittelpfette' },
  'Flat – no birdsmouth': { uk: 'Без скосу – без врубки', de: 'Flach – keine Kerve' },
  'Flat – no birdsmouth – spliced plumb over the mid purlin': { uk: 'Без скосу – без врубки – зрощення прямовисним зрізом над середнім прогоном', de: 'Flach – keine Kerve – lotrechter Stoß über der Mittelpfette' },

  // ── Framing warnings (structure.ts, roof.ts, walls.ts, openings.ts, floor.ts, index.ts) ────
  '{row}: post spacing exceeds stock length {max} mm – splice cannot be placed over a post.': {
    uk: '{row}: крок стовпів перевищує довжину заготовки {max} мм – зрощення неможливо розмістити над стовпом.',
    de: '{row}: Pfostenabstand überschreitet die Stocklänge von {max} mm – der Stoß kann nicht über einem Pfosten liegen.',
  },
  'Rafter piece {n} mm exceeds the max rafter length {max} mm – the split is kept clear of the eave purlins; reduce the overhang or the width.': {
    uk: 'Частина крокви {n} мм перевищує максимальну довжину крокви {max} мм – розріз тримається осторонь карнизних прогонів; зменшіть звис або ширину.',
    de: 'Sparrenteil {n} mm überschreitet die maximale Sparrenlänge von {max} mm – die Teilung bleibt von den Traufpfetten entfernt; Überstand oder Breite verringern.',
  },
  'Rafter piece {n} mm exceeds the max rafter length {max} mm – the split is kept clear of the eave purlins; reduce the overhang or the length.': {
    uk: 'Частина крокви {n} мм перевищує максимальну довжину крокви {max} мм – розріз тримається осторонь карнизних прогонів; зменшіть звис або довжину.',
    de: 'Sparrenteil {n} mm überschreitet die maximale Sparrenlänge von {max} mm – die Teilung bleibt von den Traufpfetten entfernt; Überstand oder Länge verringern.',
  },
  'Birdsmouth could not be placed – purlin overlaps the previous notch or the rafter end.': {
    uk: 'Врубку неможливо розмістити – прогон перекриває попередню врубку або кінець крокви.',
    de: 'Kerve konnte nicht platziert werden – Pfette überschneidet die vorherige Kerve oder das Sparrenende.',
  },
  '{label} on {wall} wall: no room for the header – reduce the opening height.': {
    uk: '{label} на стіні {wall}: немає місця для перемички – зменшіть висоту прорізу.',
    de: '{label} an der Wand {wall}: kein Platz für den Sturz – Öffnungshöhe verringern.',
  },
  'Wall "{wall}" is open – its {n} opening(s) are ignored.': {
    uk: 'Стіна "{wall}" відкрита – її {n} проріз(и) ігноруються.',
    de: 'Wand "{wall}" ist offen – ihre {n} Öffnung(en) werden ignoriert.',
  },
  '{label} on {wall} wall collides with a post – move it inside the bay ({range} mm).': {
    uk: '{label} на стіні {wall} перетинається зі стовпом – перемістіть його в межі прогону ({range} мм).',
    de: '{label} an der Wand {wall} kollidiert mit einem Pfosten – in das Feld verschieben ({range} mm).',
  },
  '{label} on {wall} wall is too high – no room for the header (Sturz).': {
    uk: '{label} на стіні {wall} зависокий – немає місця для перемички (Sturz).',
    de: '{label} an der Wand {wall} ist zu hoch – kein Platz für den Sturz.',
  },
  'Openings "{a}" and "{b}" on {wall} wall are too close – framing studs overlap.': {
    uk: 'Прорізи "{a}" і "{b}" на стіні {wall} розташовані занадто близько – стійки каркаса перекриваються.',
    de: 'Öffnungen "{a}" und "{b}" an der Wand {wall} liegen zu nah beieinander – die Rahmenständer überschneiden sich.',
  },
  'Floor joist spacing {n} mm exceeds the {max} mm recommended for {label} – reduce the max joist spacing.': {
    uk: 'Крок лаг підлоги {n} мм перевищує рекомендований для {label} максимум {max} мм – зменшіть максимальний крок лаг.',
    de: 'Der Fußbodenbalkenabstand {n} mm überschreitet die für {label} empfohlenen {max} mm – maximalen Balkenabstand verringern.',
  },
  'Timber floor top is {n} mm above the base while doors start at the base – plan a threshold step or raise the door sills.': {
    uk: 'Верх дерев’яної підлоги на {n} мм вище основи, тоді як двері починаються від основи – передбачте поріг-сходинку або підніміть пороги дверей.',
    de: 'Die Holzfußbodenoberkante liegt {n} mm über der Bodenplatte, während Türen an der Bodenplatte beginnen – eine Schwellenstufe einplanen oder die Türschwellen anheben.',
  },
  'Manual post count: spacing {n} mm exceeds the recommended maximum of {max} mm – check the purlin statics (larger purlin section may be required).': {
    uk: 'Кількість стовпів вручну: крок {n} мм перевищує рекомендований максимум {max} мм – перевірте статику прогону (може знадобитися більший переріз прогону).',
    de: 'Manuelle Pfostenanzahl: Abstand {n} mm überschreitet das empfohlene Maximum von {max} mm – Pfettenstatik prüfen (größerer Pfettenquerschnitt könnte nötig sein).',
  },
  'Low eave H2 exceeds high eave H1 – swap the heights or change the roof direction. H2 was clamped to H1.': {
    uk: 'Низький карниз H2 перевищує високий карниз H1 – поміняйте висоти місцями або змініть напрямок даху. H2 обмежено до H1.',
    de: 'Die niedrige Traufe H2 übersteigt die hohe Traufe H1 – Höhen tauschen oder Dachrichtung ändern. H2 wurde auf H1 begrenzt.',
  },
  'Roof pitch {deg}° is below 3° – minimum for sheet roofing; 5° or more is recommended for drainage.': {
    uk: 'Ухил даху {deg}° менший за 3° – мінімум для листової покрівлі; для водовідведення рекомендується 5° або більше.',
    de: 'Die Dachneigung {deg}° liegt unter 3° – Minimum für Blechdeckung; für die Entwässerung werden 5° oder mehr empfohlen.',
  },
  'Roof pitch {deg}° is unusually steep for a monopitch outbuilding.': {
    uk: 'Ухил даху {deg}° є незвично крутим для однокатної господарської будівлі.',
    de: 'Die Dachneigung {deg}° ist für ein Pultdach-Nebengebäude ungewöhnlich steil.',
  },
  'Low eave clearance {n} mm is below 1.9 m head height.': {
    uk: 'Низький карниз {n} мм не досягає висоти проходу 1,9 м.',
    de: 'Die niedrige Traufhöhe {n} mm liegt unter der Kopfhöhe von 1,9 m.',
  },
  'Roof overhang above 1.5 m – cantilevered rafter tails should be verified separately.': {
    uk: 'Звис даху понад 1,5 м – консольні кінці крокв слід перевірити окремо.',
    de: 'Dachüberstand über 1,5 m – auskragende Sparrenenden sind separat nachzuweisen.',
  },
  'Purlin overhang above 1.5 m – cantilevered purlin tails should be verified separately.': {
    uk: 'Звис прогону понад 1,5 м – консольні кінці прогонів слід перевірити окремо.',
    de: 'Pfettenüberstand über 1,5 m – auskragende Pfettenenden sind separat nachzuweisen.',
  },
  'Partition "{name}" runs through the post row at {pos} mm – move it clear of the posts and knee braces.': {
    uk: 'Перегородка "{name}" проходить через ряд стовпів на позначці {pos} мм – відсуньте її від стовпів і підкосів.',
    de: 'Die Trennwand "{name}" verläuft bei {pos} mm durch die Pfostenreihe – von Pfosten und Kopfbändern freihalten.',
  },
  'Partition "{name}" was clamped inside the post frame.': {
    uk: 'Перегородку "{name}" було обмежено в межах каркаса стовпів.',
    de: 'Die Trennwand "{name}" wurde innerhalb des Pfostenrahmens begrenzt.',
  },
} satisfies Dict;
