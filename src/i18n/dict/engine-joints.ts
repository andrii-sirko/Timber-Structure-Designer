import type { Dict } from '../core';

/**
 * Strings of the joint, footing and site-load checks (src/engine/statics/connections.ts,
 * foundations.ts, siteLoads.ts) and the UI around them: inputs, the statics report.
 */
export default {
  // ── Element names ─────────────────────────────────────────────────────────────────────
  'Rafter bearing hold-down': { uk: 'Кріплення крокв від відриву', de: 'Sparrenbefestigung gegen Abheben', pl: 'Zakotwienie krokwi przed oderwaniem' },
  'Purlin–post joint (uplift)': { uk: 'Вузол прогін–стовп (відрив)', de: 'Anschluss Pfette–Pfosten (Abheben)', pl: 'Połączenie płatew–słup (oderwanie)' },
  'Knee brace joints {axis}': { uk: 'Вузли підкосів {axis}', de: 'Kopfbandanschlüsse {axis}', pl: 'Połączenia mieczy {axis}' },
  'Post footing – soil pressure': { uk: 'Фундамент стовпа – тиск на ґрунт', de: 'Punktfundament – Sohldruck', pl: 'Stopa słupa – nacisk na grunt' },

  // ── Rafter bearings ───────────────────────────────────────────────────────────────────
  'Local suction c_p,net = {edge} in the edge strips ({verge} m at the verges, {eave} m at the eaves) and {inner} inside, q_p = {q} kN/m², rafter spacing {s} mm, dead load 1.0·g = {g} kN/m².': {
    uk: 'Місцеве відсмоктування c_p,net = {edge} у крайових смугах ({verge} m біля фронтонів, {eave} m біля карнизів) і {inner} всередині, q_p = {q} kN/m², крок крокв {s} mm, постійне навантаження 1.0·g = {g} kN/m².',
    de: 'Örtlicher Sog c_p,net = {edge} in den Randbereichen ({verge} m am Ortgang, {eave} m an der Traufe) und {inner} im Innenbereich, q_p = {q} kN/m², Sparrenabstand {s} mm, Eigengewicht 1.0·g = {g} kN/m².',
    pl: 'Lokalne ssanie c_p,net = {edge} w strefach brzegowych ({verge} m przy szczytach, {eave} m przy okapach) i {inner} wewnątrz, q_p = {q} kN/m², rozstaw krokwi {s} mm, ciężar własny 1.0·g = {g} kN/m².',
  },
  'The dead load holds every rafter down – no tension at the bearings.': {
    uk: 'Власна вага утримує всі крокви – розтягу в опорах немає.',
    de: 'Das Eigengewicht hält alle Sparren – keine Zugkraft an den Auflagern.',
    pl: 'Ciężar własny utrzymuje wszystkie krokwie – brak rozciągania na podporach.',
  },
  'T_d = {t} per bearing in the edge strips ({row}).': {
    uk: 'T_d = {t} на опору в крайових смугах ({row}).',
    de: 'T_d = {t} je Auflager in den Randbereichen ({row}).',
    pl: 'T_d = {t} na podporę w strefach brzegowych ({row}).',
  },
  'T_d = {t} per bearing inside ({row}).': { uk: 'T_d = {t} на опору всередині ({row}).', de: 'T_d = {t} je Auflager im Innenbereich ({row}).', pl: 'T_d = {t} na podporę wewnątrz ({row}).' },
  'No tension at the inner bearings ({row}).': {
    uk: 'Внутрішні опори не розтягнуті ({row}).',
    de: 'Keine Zugkraft an den inneren Auflagern ({row}).',
    pl: 'Brak rozciągania na podporach wewnętrznych ({row}).',
  },
  'One Ø8 × 280 mm screw through the {h} mm rafter (at the seat) into the purlin: R_d = {rd} (EN 1995-1-1 8.7.2, k_mod {k}) ({p}).': {
    uk: 'Один шуруп Ø8 × 280 mm крізь крокву висотою {h} mm (у місці опирання) у прогін: R_d = {rd} (EN 1995-1-1 8.7.2, k_mod {k}) ({p}).',
    de: 'Eine Schraube Ø8 × 280 mm durch den {h} mm hohen Sparren (am Auflager) in die Pfette: R_d = {rd} (EN 1995-1-1 8.7.2, k_mod {k}) ({p}).',
    pl: 'Jeden wkręt Ø8 × 280 mm przez krokiew o wysokości {h} mm (na podporze) w płatew: R_d = {rd} (EN 1995-1-1 8.7.2, k_mod {k}) ({p}).',
  },
  'One 8 × 280 mm screw per bearing is not enough.': {
    uk: 'Одного шурупа 8 × 280 mm на опору недостатньо.',
    de: 'Eine Schraube 8 × 280 mm je Auflager reicht nicht aus.',
    pl: 'Jeden wkręt 8 × 280 mm na podporę nie wystarcza.',
  },
  'Edge strips: {x}.': { uk: 'Крайові смуги: {x}.', de: 'Randbereiche: {x}.', pl: 'Strefy brzegowe: {x}.' },
  'Inside: {x}.': { uk: 'Всередині: {x}.', de: 'Innenbereich: {x}.', pl: 'Wewnątrz: {x}.' },
  '{screws} fully threaded screws per bearing (R_d = {rd})': {
    uk: '{screws} шурупи з повною різьбою на опору (R_d = {rd})',
    de: '{screws} Vollgewindeschrauben je Auflager (R_d = {rd})',
    pl: '{screws} wkręty z pełnym gwintem na podporę (R_d = {rd})',
  },
  'no screw pair fits – use rafter anchors or reduce the rafter spacing': {
    uk: 'пара шурупів не вміщується – використайте анкери крокв або зменште крок крокв',
    de: 'kein Schraubenpaar passt – Sparrenpfettenanker verwenden oder den Sparrenabstand verringern',
    pl: 'para wkrętów się nie mieści – użyj łączników krokwiowych albo zmniejsz rozstaw krokwi',
  },
  'Rafter–purlin anchors must reach a design tension resistance R_d ≥ {t} in the edge strips (ETA values, nailed as specified) – or use screws.': {
    uk: 'Анкери кроква–прогін повинні мати розрахунковий опір розтягу R_d ≥ {t} у крайових смугах (значення ETA, з цвяхами за специфікацією) – або використайте шурупи.',
    de: 'Sparrenpfettenanker müssen in den Randbereichen einen Bemessungswiderstand auf Zug R_d ≥ {t} erreichen (ETA-Werte, Nagelung nach Vorgabe) – oder Schrauben verwenden.',
    pl: 'Łączniki krokiew–płatew muszą osiągać obliczeniową nośność na rozciąganie R_d ≥ {t} w strefach brzegowych (wartości ETA, gwoździowanie wg producenta) – albo użyj wkrętów.',
  },
  'Rafter–purlin anchors must reach a design tension resistance R_d ≥ {t} in the edge strips and {ti} inside (ETA values, nailed as specified) – or use screws.': {
    uk: 'Анкери кроква–прогін повинні мати розрахунковий опір розтягу R_d ≥ {t} у крайових смугах і {ti} всередині (значення ETA, з цвяхами за специфікацією) – або використайте шурупи.',
    de: 'Sparrenpfettenanker müssen einen Bemessungswiderstand auf Zug R_d ≥ {t} in den Randbereichen und {ti} im Innenbereich erreichen (ETA-Werte, Nagelung nach Vorgabe) – oder Schrauben verwenden.',
    pl: 'Łączniki krokiew–płatew muszą osiągać obliczeniową nośność na rozciąganie R_d ≥ {t} w strefach brzegowych i {ti} wewnątrz (wartości ETA, gwoździowanie wg producenta) – albo użyj wkrętów.',
  },

  // ── Purlin–post joint ─────────────────────────────────────────────────────────────────
  '{post}: uplift 1.5·W = {up} vs. roof + purlin 1.0·G = {dead}.': {
    uk: '{post}: відрив 1.5·W = {up} проти ваги покрівлі й прогону 1.0·G = {dead}.',
    de: '{post}: Abheben 1.5·W = {up} gegen Dach + Pfette 1.0·G = {dead}.',
    pl: '{post}: oderwanie 1.5·W = {up} wobec ciężaru dachu i płatwi 1.0·G = {dead}.',
  },
  'The joint stays in compression.': { uk: 'Вузол залишається стиснутим.', de: 'Der Anschluss bleibt überdrückt.', pl: 'Połączenie pozostaje ściskane.' },
  'Net tension T_d = {t} per joint.': { uk: 'Чистий розтяг T_d = {t} на вузол.', de: 'Resultierende Zugkraft T_d = {t} je Anschluss.', pl: 'Wypadkowe rozciąganie T_d = {t} na połączenie.' },
  'Net tension T_d = {t} per joint, shared by 2 angle brackets.': {
    uk: 'Чистий розтяг T_d = {t} на вузол, розподілений між 2 кутниками.',
    de: 'Resultierende Zugkraft T_d = {t} je Anschluss, verteilt auf 2 Winkelverbinder.',
    pl: 'Wypadkowe rozciąganie T_d = {t} na połączenie, rozłożone na 2 kątowniki.',
  },
  'A pegged tenon is not a tension joint – net tension {t} per post.': {
    uk: 'Шип із нагелем не працює на розтяг – чистий розтяг {t} на стовп.',
    de: 'Ein Zapfen mit Holznagel ist keine Zugverbindung – resultierende Zugkraft {t} je Pfosten.',
    pl: 'Czop z kołkiem nie przenosi rozciągania – wypadkowe rozciąganie {t} na słup.',
  },
  'Add {x}, or a steel strap on both sides.': {
    uk: 'Додайте {x} або сталеву стрічку з обох боків.',
    de: 'Ergänzen Sie {x} oder ein Stahlband auf beiden Seiten.',
    pl: 'Dodaj {x} albo stalową taśmę po obu stronach.',
  },
  'Add steel straps on both sides.': { uk: 'Додайте сталеві стрічки з обох боків.', de: 'Ergänzen Sie Stahlbänder auf beiden Seiten.', pl: 'Dodaj stalowe taśmy po obu stronach.' },
  '{screws} fully threaded screws from the purlin top into the post (end grain, R_d = {rd})': {
    uk: '{screws} шурупи з повною різьбою згори крізь прогін у стовп (у торець, R_d = {rd})',
    de: '{screws} Vollgewindeschrauben von oben durch die Pfette in den Pfosten (Hirnholz, R_d = {rd})',
    pl: '{screws} wkręty z pełnym gwintem od góry przez płatew w słup (w czoło, R_d = {rd})',
  },
  'Each of the 2 angle brackets 90×90×65 must reach R_d ≥ {t} in tension (ETA, uplift direction) – or add {x}.': {
    uk: 'Кожен із 2 кутників 90×90×65 повинен мати R_d ≥ {t} на розтяг (ETA, напрямок відриву) – або додайте {x}.',
    de: 'Jeder der 2 Winkelverbinder 90×90×65 muss auf Zug R_d ≥ {t} erreichen (ETA, Abheberichtung) – oder ergänzen Sie {x}.',
    pl: 'Każdy z 2 kątowników 90×90×65 musi osiągać R_d ≥ {t} na rozciąganie (ETA, kierunek odrywania) – albo dodaj {x}.',
  },
  'Each of the 2 angle brackets 90×90×65 must reach R_d ≥ {t} in tension (ETA, uplift direction).': {
    uk: 'Кожен із 2 кутників 90×90×65 повинен мати R_d ≥ {t} на розтяг (ETA, напрямок відриву).',
    de: 'Jeder der 2 Winkelverbinder 90×90×65 muss auf Zug R_d ≥ {t} erreichen (ETA, Abheberichtung).',
    pl: 'Każdy z 2 kątowników 90×90×65 musi osiągać R_d ≥ {t} na rozciąganie (ETA, kierunek odrywania).',
  },

  // ── Knee brace joints ─────────────────────────────────────────────────────────────────
  'Strut N_d = {n} through the tenon shoulders (2/3 of {sec} mm = {a} cm²): σ = {s} ≤ f_c,45,d = {f} N/mm² (EN 1995-1-1 eq. 6.16) ({p}).': {
    uk: 'Зусилля в підкосі N_d = {n} через заплічки шипа (2/3 від {sec} mm = {a} cm²): σ = {s} ≤ f_c,45,d = {f} N/mm² (EN 1995-1-1 ф. 6.16) ({p}).',
    de: 'Strebenkraft N_d = {n} über die Zapfenschultern (2/3 von {sec} mm = {a} cm²): σ = {s} ≤ f_c,45,d = {f} N/mm² (EN 1995-1-1 Gl. 6.16) ({p}).',
    pl: 'Siła w mieczu N_d = {n} przez odsadzki czopa (2/3 z {sec} mm = {a} cm²): σ = {s} ≤ f_c,45,d = {f} N/mm² (EN 1995-1-1 wz. 6.16) ({p}).',
  },
  'The peg only holds the joint together.': { uk: 'Нагель лише утримує вузол зібраним.', de: 'Der Holznagel hält die Verbindung nur zusammen.', pl: 'Kołek jedynie spina połączenie.' },
  'Use larger knee braces, or a full-width shoulder (Versatz) instead of the stub tenon.': {
    uk: 'Збільште переріз підкосів або замініть шип врубкою на всю ширину (Versatz).',
    de: 'Größere Kopfbänder verwenden oder statt des Zapfens einen Versatz über die volle Breite ausbilden.',
    pl: 'Użyj większych mieczy albo wrębu na całą szerokość (Versatz) zamiast czopa.',
  },
  'Brace force N_d = {n} (tension or compression) on 2 screws Ø8 × 240 mm per end in single shear (t1 = {t1} mm, t2 = {t2} mm): F_v,Rd = {f} per screw incl. rope effect (EN 1995-1-1 8.2.2), R_d = {r} ({p}).': {
    uk: 'Зусилля в підкосі N_d = {n} (розтяг або стиск) на 2 шурупи Ø8 × 240 mm на кінець, один зріз (t1 = {t1} mm, t2 = {t2} mm): F_v,Rd = {f} на шуруп з ефектом каната (EN 1995-1-1 8.2.2), R_d = {r} ({p}).',
    de: 'Strebenkraft N_d = {n} (Zug oder Druck) auf 2 Schrauben Ø8 × 240 mm je Ende, einschnittig (t1 = {t1} mm, t2 = {t2} mm): F_v,Rd = {f} je Schraube inkl. Einhängeeffekt (EN 1995-1-1 8.2.2), R_d = {r} ({p}).',
    pl: 'Siła w mieczu N_d = {n} (rozciąganie lub ściskanie) na 2 wkręty Ø8 × 240 mm na koniec, jednocięte (t1 = {t1} mm, t2 = {t2} mm): F_v,Rd = {f} na wkręt z efektem liny (EN 1995-1-1 8.2.2), R_d = {r} ({p}).',
  },
  'Use {n} screws Ø8 × 240 mm per brace end (or Ø10), or larger braces with more room for screws.': {
    uk: 'Використайте {n} шурупів Ø8 × 240 mm на кінець підкоса (або Ø10) чи більші підкоси з місцем для шурупів.',
    de: 'Verwenden Sie {n} Schrauben Ø8 × 240 mm je Kopfbandende (oder Ø10) oder größere Kopfbänder mit mehr Platz für Schrauben.',
    pl: 'Użyj {n} wkrętów Ø8 × 240 mm na koniec miecza (albo Ø10) lub większych mieczy z miejscem na wkręty.',
  },

  // ── Footings ──────────────────────────────────────────────────────────────────────────
  '{post}: N_d = {n} + 1.35 × footing Ø{d} × {h} mm {g} = {nd} on {a} m²: σ_d = {s} ≤ σ_R,d = {r} kN/m² ({soil}, DIN 1054 Annex A) ({p}).': {
    uk: '{post}: N_d = {n} + 1.35 × фундамент Ø{d} × {h} mm {g} = {nd} на {a} m²: σ_d = {s} ≤ σ_R,d = {r} kN/m² ({soil}, DIN 1054 додаток A) ({p}).',
    de: '{post}: N_d = {n} + 1.35 × Fundament Ø{d} × {h} mm {g} = {nd} auf {a} m²: σ_d = {s} ≤ σ_R,d = {r} kN/m² ({soil}, DIN 1054 Anhang A) ({p}).',
    pl: '{post}: N_d = {n} + 1.35 × stopa Ø{d} × {h} mm {g} = {nd} na {a} m²: σ_d = {s} ≤ σ_R,d = {r} kN/m² ({soil}, DIN 1054 załącznik A) ({p}).',
  },
  'sand / gravel, medium dense': { uk: 'пісок / гравій, середньої щільності', de: 'Sand / Kies, mitteldicht', pl: 'piasek / żwir, średnio zagęszczony' },
  'clayey silt / clay, stiff': { uk: 'суглинок / глина, тугопластичні', de: 'toniger Schluff / Ton, steif', pl: 'pył ilasty / ił, twardoplastyczny' },
  'clayey silt / clay, semi-firm': { uk: 'суглинок / глина, напівтверді', de: 'toniger Schluff / Ton, halbfest', pl: 'pył ilasty / ił, półzwarty' },
  'The table values are given for footings ≥ 0.5 m wide – have the soil confirmed on site.': {
    uk: 'Табличні значення наведено для фундаментів шириною ≥ 0.5 m – підтвердьте ґрунт на місці.',
    de: 'Die Tabellenwerte gelten für Fundamente ab 0,5 m Breite – Baugrund vor Ort bestätigen lassen.',
    pl: 'Wartości tabelaryczne dotyczą fundamentów o szerokości ≥ 0,5 m – potwierdź grunt na miejscu.',
  },
  'Enlarge the footings to Ø{d} mm (or found deeper / on a pad).': {
    uk: 'Збільште фундаменти до Ø{d} mm (або заглибте їх / виконайте окремий квадратний фундамент).',
    de: 'Vergrößern Sie die Fundamente auf Ø{d} mm (oder tiefer gründen / Einzelfundament).',
    pl: 'Powiększ stopy do Ø{d} mm (albo posadów głębiej / na stopie prostokątnej).',
  },
  'Use a pad footing or a slab – a round footing up to Ø1000 mm is not enough.': {
    uk: 'Виконайте окремий квадратний фундамент або плиту – круглого фундаменту до Ø1000 mm недостатньо.',
    de: 'Einzelfundament oder Bodenplatte verwenden – ein Rundfundament bis Ø1000 mm reicht nicht aus.',
    pl: 'Zastosuj stopę prostokątną lub płytę – okrągła stopa do Ø1000 mm nie wystarcza.',
  },
  'Found at least {d} mm deep (frost-free).': {
    uk: 'Закладайте фундамент на глибину щонайменше {d} mm (нижче промерзання).',
    de: 'Mindestens {d} mm tief gründen (frostfrei).',
    pl: 'Posadów co najmniej {d} mm głęboko (poniżej przemarzania).',
  },

  // ── Exceptional snow ─────────────────────────────────────────────────────────────────
  'Exceptional snow G + {f}·S: {p}.': { uk: 'Винятковий сніг G + {f}·S: {p}.', de: 'Außergewöhnlicher Schnee G + {f}·S: {p}.', pl: 'Wyjątkowy śnieg G + {f}·S: {p}.' },

  // ── Inputs ────────────────────────────────────────────────────────────────────────────
  'Snow load zone (DIN EN 1991-1-3/NA)': { uk: 'Снігова зона (DIN EN 1991-1-3/NA)', de: 'Schneelastzone (DIN EN 1991-1-3/NA)', pl: 'Strefa obciążenia śniegiem (DIN EN 1991-1-3/NA)' },
  'Zone {zone}': { uk: 'Зона {zone}', de: 'Zone {zone}', pl: 'Strefa {zone}' },
  // Wind zone presets (materials.ts WIND_ZONE_PRESETS) and the matching snow presets
  'Zone {zone} ({q} kN/m²)': { uk: 'Зона {zone} ({q} kN/m²)', de: 'Zone {zone} ({q} kN/m²)', pl: 'Strefa {zone} ({q} kN/m²)' },
  'Zone {zone} inland ({q} kN/m²)': { uk: 'Зона {zone}, материк ({q} kN/m²)', de: 'Zone {zone} Binnenland ({q} kN/m²)', pl: 'Strefa {zone}, śródlądzie ({q} kN/m²)' },
  'Zone {zone} coast ({q} kN/m²)': { uk: 'Зона {zone}, узбережжя ({q} kN/m²)', de: 'Zone {zone} Küste ({q} kN/m²)', pl: 'Strefa {zone}, wybrzeże ({q} kN/m²)' },
  'Custom s_k': { uk: 'Власне s_k', de: 's_k frei eingeben', pl: 'Własne s_k' },
  'Site altitude above sea level': { uk: 'Висота ділянки над рівнем моря', de: 'Geländehöhe über NN', pl: 'Wysokość terenu n.p.m.' },
  'North German Plain': { uk: 'Північнонімецька низовина', de: 'Norddeutsches Tiefland', pl: 'Nizina Północnoniemiecka' },
  'Exceptional snow s_Ad = 2.3 · s_k as an accidental combination (DIN EN 1991-1-3/NA)': {
    uk: 'Винятковий сніг s_Ad = 2.3 · s_k як аварійна комбінація (DIN EN 1991-1-3/NA)',
    de: 'Außergewöhnliche Schneelast s_Ad = 2,3 · s_k als außergewöhnliche Kombination (DIN EN 1991-1-3/NA)',
    pl: 'Wyjątkowy śnieg s_Ad = 2,3 · s_k jako kombinacja wyjątkowa (DIN EN 1991-1-3/NA)',
  },
  'Soil under the footings': { uk: 'Ґрунт під фундаментами', de: 'Baugrund unter den Fundamenten', pl: 'Grunt pod stopami' },
  'Sand / gravel, medium dense': { uk: 'Пісок / гравій, середньої щільності', de: 'Sand / Kies, mitteldicht', pl: 'Piasek / żwir, średnio zagęszczony' },
  'Clay / silt, semi-firm': { uk: 'Глина / суглинок, напівтверді', de: 'Ton / Schluff, halbfest', pl: 'Ił / pył, półzwarty' },
  'Clay / silt, stiff': { uk: 'Глина / суглинок, тугопластичні', de: 'Ton / Schluff, steif', pl: 'Ił / pył, twardoplastyczny' },
  'Snow load zone': { uk: 'Снігова зона', de: 'Schneelastzone', pl: 'Strefa śniegowa' },
  'Site altitude': { uk: 'Висота ділянки', de: 'Geländehöhe', pl: 'Wysokość terenu' },
  'Exceptional snow': { uk: 'Винятковий сніг', de: 'Außergewöhnlicher Schnee', pl: 'Wyjątkowy śnieg' },
  Soil: { uk: 'Ґрунт', de: 'Baugrund', pl: 'Grunt' },

  // ── Results panel ─────────────────────────────────────────────────────────────────────
  Fastener: { uk: 'Кріплення', de: 'Verbindungsmittel', pl: 'Łącznik' },
  Depth: { uk: 'Глибина', de: 'Tiefe', pl: 'Głębokość' },
  Report: { uk: 'Звіт', de: 'Bericht', pl: 'Raport' },
  'Pre-design calculation by position (PDF): loads, member, joint and footing checks': {
    uk: 'Попередній розрахунок за позиціями (PDF): навантаження, перевірки елементів, вузлів і фундаментів',
    de: 'Vorbemessung nach Positionen (PDF): Lasten, Nachweise der Bauteile, Anschlüsse und Fundamente',
    pl: 'Wstępne obliczenia według pozycji (PDF): obciążenia, sprawdzenia elementów, połączeń i fundamentów',
  },
  'Also checked: rafter, purlin and knee brace joints (EN 1995-1-1 section 8) with the local wind edge zones (EN 1991-1-4 Table 7.6), and the post footings in the soil (DIN 1054 Annex A).': {
    uk: 'Також перевіряються вузли крокв, прогонів і підкосів (EN 1995-1-1 розділ 8) з крайовими вітровими зонами (EN 1991-1-4 табл. 7.6) і фундаменти стовпів у ґрунті (DIN 1054 додаток A).',
    de: 'Außerdem nachgewiesen: Anschlüsse von Sparren, Pfetten und Kopfbändern (EN 1995-1-1 Abschnitt 8) mit den Wind-Randbereichen (EN 1991-1-4 Tabelle 7.6) sowie die Pfostenfundamente im Baugrund (DIN 1054 Anhang A).',
    pl: 'Sprawdzane są też połączenia krokwi, płatwi i mieczy (EN 1995-1-1 rozdział 8) ze strefami brzegowymi wiatru (EN 1991-1-4 tabl. 7.6) oraz stopy słupów w gruncie (DIN 1054 załącznik A).',
  },
  'This pre-design does not replace a checkable structural calculation by a structural engineer. Fire, settlement, wall anchoring and second-order effects are not covered.': {
    uk: 'Цей попередній розрахунок не замінює перевірюваного статичного розрахунку інженера-конструктора. Вогнестійкість, осідання, анкерування стін і ефекти другого порядку не враховано.',
    de: 'Diese Vorbemessung ersetzt keine prüffähige Statik eines Tragwerksplaners. Brandschutz, Setzungen, die Verankerung der Wände und Effekte nach Theorie II. Ordnung sind nicht erfasst.',
    pl: 'To wstępne wymiarowanie nie zastępuje sprawdzalnych obliczeń statycznych konstruktora. Odporność ogniowa, osiadanie, zakotwienie ścian i efekty drugiego rzędu nie są uwzględnione.',
  },

  // ── Statics report (PDF) ─────────────────────────────────────────────────────────────
  '{name} – Structural pre-design': { uk: '{name} – Попередній статичний розрахунок', de: '{name} – Statische Vorbemessung', pl: '{name} – Wstępne obliczenia statyczne' },
  'Structural pre-design': { uk: 'Попередній статичний розрахунок', de: 'Statische Vorbemessung', pl: 'Wstępne obliczenia statyczne' },
  'Simplified pre-design to EN 1995-1-1, EN 1991 and DIN 1054. It does not replace a checkable structural calculation (prüffähige Statik): have the design confirmed by a structural engineer before building or applying for a permit.': {
    uk: 'Спрощений попередній розрахунок за EN 1995-1-1, EN 1991 і DIN 1054. Він не замінює перевірюваного статичного розрахунку (prüffähige Statik): перед будівництвом або поданням на дозвіл доручіть перевірку інженерові-конструктору.',
    de: 'Vereinfachte Vorbemessung nach EN 1995-1-1, EN 1991 und DIN 1054. Sie ersetzt keine prüffähige Statik: Lassen Sie den Entwurf vor dem Bau oder dem Bauantrag von einem Tragwerksplaner bestätigen.',
    pl: 'Uproszczone wstępne wymiarowanie wg EN 1995-1-1, EN 1991 i DIN 1054. Nie zastępuje sprawdzalnych obliczeń statycznych (prüffähige Statik): przed budową lub wnioskiem o pozwolenie zleć sprawdzenie konstruktorowi.',
  },
  '1 System': { uk: '1 Система', de: '1 System', pl: '1 System' },
  'Plan (posts)': { uk: 'План (по стовпах)', de: 'Grundriss (Pfostenachsen)', pl: 'Rzut (osie słupów)' },
  overhangs: { uk: 'звиси', de: 'Überstände', pl: 'okapy' },
  Heights: { uk: 'Висоти', de: 'Höhen', pl: 'Wysokości' },
  'roof pitch': { uk: 'ухил даху', de: 'Dachneigung', pl: 'spadek dachu' },
  'service class': { uk: 'клас експлуатації', de: 'Nutzungsklasse', pl: 'klasa użytkowania' },
  Sections: { uk: 'Перерізи', de: 'Querschnitte', pl: 'Przekroje' },
  Joints: { uk: 'Вузли', de: 'Anschlüsse', pl: 'Połączenia' },
  Footings: { uk: 'Фундаменти', de: 'Fundamente', pl: 'Fundamenty' },
  'none (posts on a slab or bare anchors)': { uk: 'немає (стовпи на плиті або анкерах)', de: 'keine (Pfosten auf Bodenplatte oder Ankern)', pl: 'brak (słupy na płycie lub kotwach)' },
  'zone {zone}, {altitude} m above sea level': { uk: 'зона {zone}, {altitude} m над рівнем моря', de: 'Zone {zone}, {altitude} m über NN', pl: 'strefa {zone}, {altitude} m n.p.m.' },
  'typed in': { uk: 'введено вручну', de: 'frei eingegeben', pl: 'wpisane ręcznie' },
  '2 Load assumptions (characteristic)': { uk: '2 Навантаження (характеристичні)', de: '2 Lastannahmen (charakteristisch)', pl: '2 Założenia obciążeń (charakterystyczne)' },
  'Dead load g': { uk: 'Постійне навантаження g', de: 'Eigengewicht g', pl: 'Ciężar własny g' },
  'roof surface': { uk: 'площі покрівлі', de: 'Dachfläche', pl: 'powierzchni dachu' },
  plan: { uk: 'у плані', de: 'Grundfläche', pl: 'w rzucie' },
  'Snow s': { uk: 'Сніг s', de: 'Schnee s', pl: 'Śnieg s' },
  '(North German Plain, accidental combination)': { uk: '(Північнонімецька низовина, аварійна комбінація)', de: '(Norddeutsches Tiefland, außergewöhnliche Kombination)', pl: '(Nizina Północnoniemiecka, kombinacja wyjątkowa)' },
  Wind: { uk: 'Вітер', de: 'Wind', pl: 'Wiatr' },
  canopy: { uk: 'навіс', de: 'Vordach', pl: 'wiata' },
  'Table 7.6': { uk: 'табл. 7.6', de: 'Tabelle 7.6', pl: 'tabl. 7.6' },
  'Wind, local': { uk: 'Вітер, місцевий', de: 'Wind, örtlich', pl: 'Wiatr, lokalnie' },
  interior: { uk: 'внутрішня зона', de: 'Innenbereich', pl: 'strefa wewnętrzna' },
  'edge strips': { uk: 'крайові смуги', de: 'Randbereiche', pl: 'strefy brzegowe' },
  'Wind force': { uk: 'Вітрова сила', de: 'Windkraft', pl: 'Siła wiatru' },
  uplift: { uk: 'відрив', de: 'Abheben', pl: 'oderwanie' },
  'Safety factors': { uk: 'Коефіцієнти надійності', de: 'Teilsicherheitsbeiwerte', pl: 'Współczynniki częściowe' },
  favourable: { uk: 'сприятливо', de: 'günstig', pl: 'korzystnie' },
  snow: { uk: 'сніг', de: 'Schnee', pl: 'śnieg' },
  wind: { uk: 'вітер', de: 'Wind', pl: 'wiatr' },
  timber: { uk: 'деревина', de: 'Holz', pl: 'drewno' },
  joints: { uk: 'вузли', de: 'Verbindungen', pl: 'połączenia' },
  '3 Verification by position': { uk: '3 Перевірки за позиціями', de: '3 Nachweise nach Positionen', pl: '3 Sprawdzenia według pozycji' },
  'Members under vertical load': { uk: 'Елементи під вертикальним навантаженням', de: 'Bauteile unter vertikaler Last', pl: 'Elementy pod obciążeniem pionowym' },
  'Bracing and lateral stability': { uk: 'Розкріплення та горизонтальна стійкість', de: 'Aussteifung und Horizontalstabilität', pl: 'Stężenia i stateczność pozioma' },
  'Anchoring and joints': { uk: 'Анкерування та вузли', de: 'Verankerung und Anschlüsse', pl: 'Zakotwienie i połączenia' },
  '4 Not covered': { uk: '4 Не враховано', de: '4 Nicht erfasst', pl: '4 Nie uwzględniono' },
  'Fire resistance, settlement and groundwater, slopes and neighbouring buildings (snow drifts), anchoring of boarded walls to the slab, second-order effects, splices and every product with an ETA (post bases, angle brackets, rafter anchors, frame anchors) – check against the manufacturer data. Footing values come from DIN 1054 tables for undisturbed, at least medium dense / stiff soil without a site investigation.': {
    uk: 'Вогнестійкість, осідання та ґрунтові води, схили й сусідні будівлі (снігові мішки), анкерування обшитих стін до плити, ефекти другого порядку, стики та всі вироби з ETA (опори стовпів, кутники, анкери крокв, рамні дюбелі) – перевіряйте за даними виробника. Значення для фундаментів узято з таблиць DIN 1054 для непорушеного ґрунту щонайменше середньої щільності / тугопластичного без інженерно-геологічних вишукувань.',
    de: 'Brandschutz, Setzungen und Grundwasser, Hanglagen und Nachbargebäude (Schneeverwehungen), Verankerung beplankter Wände auf der Bodenplatte, Theorie II. Ordnung, Stöße sowie alle Produkte mit ETA (Pfostenträger, Winkelverbinder, Sparrenpfettenanker, Rahmendübel) – mit den Herstellerangaben prüfen. Die Fundamentwerte stammen aus den Tabellen der DIN 1054 für ungestörten, mindestens mitteldichten / steifen Baugrund ohne Baugrunduntersuchung.',
    pl: 'Odporność ogniowa, osiadanie i woda gruntowa, skarpy i sąsiednie budynki (worki śnieżne), zakotwienie ścian poszytych do płyty, efekty drugiego rzędu, styki oraz wszystkie wyroby z ETA (podstawy słupów, kątowniki, łączniki krokwiowe, kołki ramowe) – sprawdź z danymi producenta. Wartości dla stóp pochodzą z tablic DIN 1054 dla nienaruszonego, co najmniej średnio zagęszczonego / twardoplastycznego gruntu bez badań podłoża.',
  },
} satisfies Dict;
