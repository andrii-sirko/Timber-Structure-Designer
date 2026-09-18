import type { Dict } from '../core';

/**
 * Engine text owned by: openingCatalog.ts (door/window presets), joinery/* (hardware & joinery
 * names/specs/notes), vehicles.ts (catalogue + fit-check messages), paving.ts, freePosts.ts,
 * neighbours.ts, pricing/index.ts and other top-level engine/*.ts files (excluding framing/,
 * statics/, bom/ and orientation.ts, which other agents own).
 */
export default {
  // ---------------------------------------------------------------------------------------
  // engine/framing/openingCatalog.ts — door & window presets
  // ---------------------------------------------------------------------------------------
  'Boarded door 750×2000': { uk: 'Дощані двері 750×2000', de: 'Brettertür 750×2000' },
  'Boarded door 875×2000': { uk: 'Дощані двері 875×2000', de: 'Brettertür 875×2000' },
  'Glazed door 875×2000': { uk: 'Засклені двері 875×2000', de: 'Gartenhaustür verglast 875×2000' },
  'Glazed door 1000×2000': { uk: 'Засклені двері 1000×2000', de: 'Gartenhaustür verglast 1000×2000' },
  'Stable door 875×2000': { uk: 'Двері типу «стайня» 875×2000', de: 'Stalltür 875×2000' },
  'Double door 1500×2000': { uk: 'Подвійні двері 1500×2000', de: 'Doppeltür 1500×2000' },
  'Double door 1750×2000': { uk: 'Подвійні двері 1750×2000', de: 'Doppeltür 1750×2000' },
  'Double glazed door 1750×2000': { uk: 'Подвійні засклені двері 1750×2000', de: 'Doppeltür verglast 1750×2000' },
  'Fixed window 500×500': { uk: 'Глухе вікно 500×500', de: 'Festverglasung 500×500' },
  'Tilt window 800×500': { uk: 'Відкидне вікно 800×500', de: 'Kippfenster 800×500' },
  'Turn-tilt window 600×800': { uk: 'Поворотно-відкидне вікно 600×800', de: 'Dreh-Kipp-Fenster 600×800' },
  'Turn-tilt window 800×800': { uk: 'Поворотно-відкидне вікно 800×800', de: 'Dreh-Kipp-Fenster 800×800' },
  'Turn-tilt window 800×1000': { uk: 'Поворотно-відкидне вікно 800×1000', de: 'Dreh-Kipp-Fenster 800×1000' },
  'Turn-tilt window 1000×1000': { uk: 'Поворотно-відкидне вікно 1000×1000', de: 'Dreh-Kipp-Fenster 1000×1000' },
  'Two-sash window 1200×1000': { uk: 'Двостулкове вікно 1200×1000', de: 'Zweiflügeliges Fenster 1200×1000' },
  'Two-sash window 1400×1000': { uk: 'Двостулкове вікно 1400×1000', de: 'Zweiflügeliges Fenster 1400×1000' },

  'Narrow tool-shed door (DIN 750×2000). Cheapest option; clear passage ≈ 700 mm.': {
    uk: 'Вузькі двері для сарая (DIN 750×2000). Найдешевший варіант; світлий прохід ≈ 700 мм.',
    de: 'Schmale Gartenhaustür (DIN 750×2000). Günstigste Option; lichte Durchgangsbreite ≈ 700 mm.',
  },
  'Standard single garden-house door (DIN 875×2000): boards on a Z-frame. Clear passage ≈ 800 mm.': {
    uk: "Стандартні одностулкові двері садового будиночка (DIN 875×2000): дошки на Z-каркасі. Світлий прохід ≈ 800 мм.",
    de: 'Standard-Gartenhaustür einflügelig (DIN 875×2000): Bretter auf Z-Rahmen. Lichte Durchgangsbreite ≈ 800 mm.',
  },
  'Framed door with a glazed upper half – brings daylight into a summer house. Clear passage ≈ 800 mm.': {
    uk: 'Двері з рамою і засклeною верхньою половиною – додають денного світла в літній будиночок. Світлий прохід ≈ 800 мм.',
    de: 'Rahmentür mit verglastem Oberteil – bringt Tageslicht ins Gartenhaus. Lichte Durchgangsbreite ≈ 800 mm.',
  },
  'Wide framed door with glazing (DIN 1000×2000). Clear passage ≈ 925 mm – comfortable for wheelbarrows.': {
    uk: 'Широкі рамні двері із заскленням (DIN 1000×2000). Світлий прохід ≈ 925 мм – зручно для тачки.',
    de: 'Breite Rahmentür mit Verglasung (DIN 1000×2000). Lichte Durchgangsbreite ≈ 925 mm – bequem für Schubkarren.',
  },
  'Split (Dutch) door: the upper half opens for ventilation while the lower half stays closed.': {
    uk: 'Розділені двері (типу «стайня»): верхня половина відчиняється для провітрювання, нижня залишається закритою.',
    de: 'Geteilte Tür (Stalltür): die obere Hälfte öffnet zur Belüftung, die untere bleibt geschlossen.',
  },
  'Two boarded leaves (DIN 1500×2000) – fits a lawn mower or bicycles. Clear passage ≈ 1420 mm.': {
    uk: 'Дві дощаті стулки (DIN 1500×2000) – вміщує газонокосарку або велосипеди. Світлий прохід ≈ 1420 мм.',
    de: 'Zwei Türblätter aus Brettern (DIN 1500×2000) – passt für Rasenmäher oder Fahrräder. Lichte Durchgangsbreite ≈ 1420 mm.',
  },
  'Wide double door (DIN 1750×2000) for ride-on mowers and garden machinery. Clear passage ≈ 1670 mm.': {
    uk: 'Широкі подвійні двері (DIN 1750×2000) для райдерів і садової техніки. Світлий прохід ≈ 1670 мм.',
    de: 'Breite Doppeltür (DIN 1750×2000) für Aufsitzmäher und Gartentechnik. Lichte Durchgangsbreite ≈ 1670 mm.',
  },
  'Two framed leaves with glazed upper halves – summer-house entrance opening onto a terrace.': {
    uk: 'Дві рамні стулки із засклeними верхніми половинами – вхід до літнього будиночка з виходом на терасу.',
    de: 'Zwei Rahmenflügel mit verglasten Oberteilen – Gartenhauseingang mit Zugang zur Terrasse.',
  },
  'Small fixed light for a tool shed – fits between two studs at 625 mm centres without extra framing.': {
    uk: 'Невелике глухе вікно для сарая – вміщується між двома стійками з кроком 625 мм без додаткового каркасу.',
    de: 'Kleines Festverglasungselement für einen Geräteschuppen – passt zwischen zwei Ständer im Achsabstand 625 mm ohne zusätzlichen Rahmen.',
  },
  'High-level tilt window for ventilation above shelving.': {
    uk: 'Високо розташоване відкидне вікно для провітрювання над полицями.',
    de: 'Hoch angeordnetes Kippfenster zur Belüftung über Regalen.',
  },
  'Compact opening window (standard stock size).': {
    uk: 'Компактне відчинне вікно (стандартний типорозмір).',
    de: 'Kompaktes zu öffnendes Fenster (Standardgröße).',
  },
  'Most common garden-house window size; stocked by every supplier.': {
    uk: 'Найпоширеніший розмір вікна для садового будиночка; є в наявності у кожного постачальника.',
    de: 'Gängigste Fenstergröße für Gartenhäuser; bei jedem Lieferanten vorrätig.',
  },
  'Tall single-sash window for a summer house.': {
    uk: 'Високе одностулкове вікно для літнього будиночка.',
    de: 'Hohes einflügeliges Fenster für ein Gartenhaus.',
  },
  'Square single-sash window (stock size); header stays at 160 mm.': {
    uk: 'Квадратне одностулкове вікно (типовий розмір); перемичка залишається 160 мм.',
    de: 'Quadratisches einflügeliges Fenster (Lagergröße); Sturz bleibt bei 160 mm.',
  },
  'Two sashes with a central mullion – the classic garden-house front window.': {
    uk: "Дві стулки з центральною стійкою – класичне фасадне вікно садового будиночка.",
    de: 'Zwei Flügel mit Mittelpfosten – das klassische Gartenhaus-Frontfenster.',
  },
  'Wide two-sash window; needs a bay of at least ~1700 mm between posts.': {
    uk: 'Широке двостулкове вікно; потребує прогону не менше ≈1700 мм між стовпами.',
    de: 'Breites zweiflügeliges Fenster; benötigt ein Feld von mindestens ≈1700 mm zwischen den Pfosten.',
  },
  'too wide – widest bay between posts allows {n} mm': {
    uk: 'занадто широкий – найширший проліт між стовпами допускає {n} мм',
    de: 'zu breit – das breiteste Feld zwischen den Pfosten erlaubt {n} mm',
  },
  'too tall – wall allows {n} mm under the header': {
    uk: 'занадто високий – стіна допускає {n} мм під перемичкою',
    de: 'zu hoch – die Wand erlaubt {n} mm unter dem Sturz',
  },

  // ---------------------------------------------------------------------------------------
  // engine/framing/openingCatalog.ts — fixture material lists (BOARDED_MATERIALS,
  // GLAZED_MATERIALS, STABLE_MATERIALS, windowMaterials, openingMaterials fallback)
  // ---------------------------------------------------------------------------------------
  'Door leaf: 21–24 mm tongue-and-groove boards (Profilbretter) on a Z-frame of 24×100 mm ledges and brace, {nominal} nominal': {
    uk: "Полотно дверей: дошки шпунтовані 21–24 мм (Profilbretter) на Z-каркасі з планок 24×100 мм і розкосом, номінал {nominal}",
    de: 'Türblatt: 21–24 mm Nut-und-Feder-Bretter (Profilbretter) auf Z-Rahmen aus 24×100 mm Leisten und Strebe, {nominal} Nennmaß',
  },
  'Door leaf ×2: 21–24 mm tongue-and-groove boards (Profilbretter) on a Z-frame of 24×100 mm ledges and brace, {nominal} nominal': {
    uk: "Полотно дверей ×2: дошки шпунтовані 21–24 мм (Profilbretter) на Z-каркасі з планок 24×100 мм і розкосом, номінал {nominal}",
    de: 'Türblatt ×2: 21–24 mm Nut-und-Feder-Bretter (Profilbretter) auf Z-Rahmen aus 24×100 mm Leisten und Strebe, {nominal} Nennmaß',
  },
  'Frame (Zarge): 3 × planed 40×120 mm boards, rebated 15 mm for the leaf, or a ready-made timber frame': {
    uk: "Рама (Zarge): 3 × стругані дошки 40×120 мм, чверть 15 мм під полотно, або готова дерев'яна рама",
    de: 'Zarge: 3 × gehobelte Bretter 40×120 mm, 15 mm Falz für das Türblatt, oder eine fertige Holzzarge',
  },
  'T-hinges (Ladenbänder) 300–400 mm, {n} pcs, galvanised': {
    uk: 'Т-петлі (Ladenbänder) 300–400 мм, {n} шт., оцинковані',
    de: 'T-Bänder (Ladenbänder) 300–400 mm, {n} Stk., verzinkt',
  },
  'Rim lock or mortise lock with cylinder, handle set': {
    uk: 'Накладний або врізний замок з циліндром, комплект ручок',
    de: 'Kastenschloss oder Einsteckschloss mit Zylinder, Griffgarnitur',
  },
  'Threshold: 40×60 mm hardwood or aluminium sill with drip edge': {
    uk: 'Поріг: тверда деревина 40×60 мм або алюмінієвий поріг з крапельником',
    de: 'Schwelle: 40×60 mm Hartholz- oder Aluminiumschwelle mit Tropfkante',
  },
  'Sealing: compression tape (Kompriband) 10 mm around the frame, 6 × 120 mm frame screws': {
    uk: 'Ущільнення: компресійна стрічка (Kompriband) 10 мм по периметру рами, 6 × шурупи для рами 120 мм',
    de: 'Abdichtung: Kompriband 10 mm rund um den Rahmen, 6 × Rahmenschrauben 120 mm',
  },
  'Weather protection: drip cap (Tropfkante) over the header, exterior wood stain': {
    uk: 'Захист від негоди: крапельник (Tropfkante) над перемичкою, зовнішня деревозахисна лазур',
    de: 'Wetterschutz: Tropfkante über dem Sturz, außenliegende Holzlasur',
  },
  'Turn-tilt window (Dreh-Kipp) {size}, timber or uPVC frame 68–70 mm, double glazing 4/16/4, turn-tilt hardware': {
    uk: "Поворотно-відкидне вікно (Dreh-Kipp) {size}, дерев'яна або ПВХ рама 68–70 мм, склопакет 4/16/4, поворотно-відкидна фурнітура",
    de: 'Dreh-Kipp-Fenster {size}, Holz- oder Kunststoffrahmen 68–70 mm, Isolierverglasung 4/16/4, Dreh-Kipp-Beschlag',
  },
  'Exterior window sill (Fensterbank): aluminium or larch board with 40 mm overhang and drip edge': {
    uk: 'Зовнішній підвіконник (Fensterbank): алюміній або модринова дошка з виступом 40 мм і крапельником',
    de: 'Außenfensterbank: Alu-Blech oder Lärchenbrett mit 40 mm Überstand und Tropfkante',
  },
  'Interior sill board 20 mm': { uk: 'Внутрішня підвіконна дошка 20 мм', de: 'Innenfensterbank 20 mm' },
  'Sealing: compression tape 10 mm all round, PU foam, 4–6 frame screws 7.5 × 112 mm': {
    uk: 'Ущільнення: компресійна стрічка 10 мм по периметру, монтажна піна, 4–6 шурупів для рами 7.5 × 112 мм',
    de: 'Abdichtung: Kompriband 10 mm rundum, PU-Schaum, 4–6 Rahmenschrauben 7,5 × 112 mm',
  },
  'Drip cap / flashing over the header, exterior cover strips (Deckleisten) 20×60 mm on the cladding': {
    uk: 'Крапельник / відлив над перемичкою, зовнішні накривні планки (Deckleisten) 20×60 мм на обшивці',
    de: 'Tropfkante / Abdeckblech über dem Sturz, außenliegende Deckleisten 20×60 mm auf der Verkleidung',
  },
  'Framed door leaf (Rahmentür) {nominal} nominal, 40–68 mm thick, upper half insulated glazing, lower boarded panel – or a ready-made garden-house door': {
    uk: 'Рамне полотно дверей (Rahmentür), номінал {nominal}, товщина 40–68 мм, верхня половина зі склопакетом, нижня – дощата панель – або готові двері для садового будиночка',
    de: 'Rahmentür {nominal} Nennmaß, 40–68 mm dick, oberes Türblatt verglast, unteres Feld aus Brettern – oder eine fertige Gartenhaustür',
  },
  'Timber frame (Holzzarge) 68 mm, rebated, with EPDM seal': {
    uk: "Дерев'яна рама (Holzzarge) 68 мм, з чвертю, з ущільненням EPDM",
    de: 'Holzzarge 68 mm, gefalzt, mit EPDM-Dichtung',
  },
  '3 × adjustable hinges (Einbohrbänder), mortise lock with profile cylinder, handle set': {
    uk: '3 × регульовані петлі (Einbohrbänder), врізний замок з профільним циліндром, комплект ручок',
    de: '3 × Einbohrbänder, Einsteckschloss mit Profilzylinder, Griffgarnitur',
  },
  'Threshold: aluminium sill with thermal break and drip edge': {
    uk: 'Поріг: алюмінієвий поріг з термовставкою і крапельником',
    de: 'Schwelle: Aluminiumschwelle mit thermischer Trennung und Tropfkante',
  },
  'Sealing: compression tape 10 mm around the frame, PU foam, 6 × 120 mm frame screws': {
    uk: 'Ущільнення: компресійна стрічка 10 мм по периметру рами, монтажна піна, 6 × шурупи для рами 120 мм',
    de: 'Abdichtung: Kompriband 10 mm rund um den Rahmen, PU-Schaum, 6 × Rahmenschrauben 120 mm',
  },
  'Drip cap over the header, exterior stain or paint': {
    uk: 'Крапельник над перемичкою, зовнішня лазур або фарба',
    de: 'Tropfkante über dem Sturz, außenliegende Lasur oder Farbe',
  },
  'Two boarded leaves (split at ~1100 mm): 21–24 mm tongue-and-groove boards on 24×100 mm Z-frames, 875×2000 nominal': {
    uk: 'Дві дощаті стулки (розділені на висоті ≈1100 мм): дошки шпунтовані 21–24 мм на Z-каркасах 24×100 мм, номінал 875×2000',
    de: 'Zwei Türblätter aus Brettern (geteilt bei ~1100 mm): 21–24 mm Nut-und-Feder-Bretter auf Z-Rahmen 24×100 mm, 875×2000 Nennmaß',
  },
  'Frame (Zarge): 3 × planed 40×120 mm boards, rebated 15 mm': {
    uk: 'Рама (Zarge): 3 × стругані дошки 40×120 мм, чверть 15 мм',
    de: 'Zarge: 3 × gehobelte Bretter 40×120 mm, 15 mm Falz',
  },
  '4 × T-hinges (Ladenbänder) 300 mm, galvanised': {
    uk: '4 × Т-петлі (Ladenbänder) 300 мм, оцинковані',
    de: '4 × T-Bänder (Ladenbänder) 300 mm, verzinkt',
  },
  'Rim lock on the lower leaf, sliding bolt (Riegel) joining upper and lower leaf, hook to hold the upper leaf open': {
    uk: "Накладний замок на нижній стулці, засувка (Riegel), що з'єднує верхню і нижню стулки, гачок для фіксації верхньої стулки відкритою",
    de: 'Kastenschloss am unteren Türblatt, Riegel zur Verbindung von oberem und unterem Türblatt, Haken zum Feststellen des offenen oberen Türblatts',
  },
  'Threshold: 40×60 mm hardwood sill with drip edge': {
    uk: 'Поріг: тверда деревина 40×60 мм з крапельником',
    de: 'Schwelle: 40×60 mm Hartholzschwelle mit Tropfkante',
  },
  'Compression tape 10 mm, 6 × 120 mm frame screws, drip cap over the header': {
    uk: 'Компресійна стрічка 10 мм, 6 × шурупи для рами 120 мм, крапельник над перемичкою',
    de: 'Kompriband 10 mm, 6 × Rahmenschrauben 120 mm, Tropfkante über dem Sturz',
  },
  'Rim lock with cylinder + shoot bolts (Kantenriegel) top and bottom on the passive leaf': {
    uk: 'Накладний замок з циліндром + засувки (Kantenriegel) зверху і знизу на пасивній стулці',
    de: 'Kastenschloss mit Zylinder + Kantenriegel oben und unten am Standflügel',
  },
  'Two framed door leaves (Rahmentür) 1750×2000 nominal, 40–68 mm thick, glazed upper halves, or a ready-made double garden-house door': {
    uk: 'Два рамних полотна дверей (Rahmentür), номінал 1750×2000, товщина 40–68 мм, засклені верхні половини, або готові подвійні двері для садового будиночка',
    de: 'Zwei Rahmentürblätter 1750×2000 Nennmaß, 40–68 mm dick, verglaste Oberteile, oder eine fertige Gartenhaus-Doppeltür',
  },
  '6 × adjustable hinges, mortise lock with profile cylinder on the active leaf, shoot bolts on the passive leaf': {
    uk: '6 × регульовані петлі, врізний замок з профільним циліндром на активній стулці, засувки на пасивній стулці',
    de: '6 × verstellbare Bänder, Einsteckschloss mit Profilzylinder am Gangflügel, Kantenriegel am Standflügel',
  },
  'Compression tape 10 mm, PU foam, 6 × 120 mm frame screws, drip cap over the header': {
    uk: 'Компресійна стрічка 10 мм, монтажна піна, 6 × шурупи для рами 120 мм, крапельник над перемичкою',
    de: 'Kompriband 10 mm, PU-Schaum, 6 × Rahmenschrauben 120 mm, Tropfkante über dem Sturz',
  },
  'Fixed glazing (Festverglasung) {size}, timber or uPVC frame 68–70 mm, double glazing 4/16/4': {
    uk: "Глухе засклення (Festverglasung) {size}, дерев'яна або ПВХ рама 68–70 мм, склопакет 4/16/4",
    de: 'Festverglasung {size}, Holz- oder Kunststoffrahmen 68–70 mm, Isolierverglasung 4/16/4',
  },
  'Tilt window (Kippfenster) {size}, timber or uPVC frame 68–70 mm, double glazing, tilt fitting with stay': {
    uk: "Відкидне вікно (Kippfenster) {size}, дерев'яна або ПВХ рама 68–70 мм, склопакет, відкидна фурнітура з обмежувачем",
    de: 'Kippfenster {size}, Holz- oder Kunststoffrahmen 68–70 mm, Isolierverglasung, Kippbeschlag mit Feststeller',
  },
  'Two-sash window (2-flügelig) {size} with mullion or stulp, timber or uPVC frame 68–70 mm, double glazing': {
    uk: "Двостулкове вікно (2-flügelig) {size} зі стійкою або притулом, дерев'яна або ПВХ рама 68–70 мм, склопакет",
    de: 'Zweiflügeliges Fenster {size} mit Pfosten oder Stulpausführung, Holz- oder Kunststoffrahmen 68–70 mm, Isolierverglasung',
  },
  'Custom door leaf and frame for a {fw}×{fh} mm frame outer size (rough opening {rw}×{rh})': {
    uk: "Індивідуальне полотно та рама дверей для зовнішнього розміру рами {fw}×{fh} мм (чорновий проріз {rw}×{rh})",
    de: 'Individuelles Türblatt und Zarge für ein Rahmenaußenmaß {fw}×{fh} mm (Rohbaumaß {rw}×{rh})',
  },
  'Rebated timber frame from 40×120 mm boards, T-hinges or adjustable hinges, lock with cylinder': {
    uk: "Фальцьована дерев'яна рама з дощок 40×120 мм, Т-петлі або регульовані петлі, замок з циліндром",
    de: 'Gefalzte Holzzarge aus 40×120 mm Brettern, T-Bänder oder Einbohrbänder, Schloss mit Zylinder',
  },
  'Threshold with drip edge, compression tape 10 mm, 6 × 120 mm frame screws, drip cap over the header': {
    uk: 'Поріг з крапельником, компресійна стрічка 10 мм, 6 × шурупи для рами 120 мм, крапельник над перемичкою',
    de: 'Schwelle mit Tropfkante, Kompriband 10 mm, 6 × Rahmenschrauben 120 mm, Tropfkante über dem Sturz',
  },
  'Made-to-measure window, frame outer size {fw}×{fh} mm (rough opening {rw}×{rh})': {
    uk: 'Вікно на замовлення, зовнішній розмір рами {fw}×{fh} мм (чорновий проріз {rw}×{rh})',
    de: 'Maßgefertigtes Fenster, Rahmenaußenmaß {fw}×{fh} mm (Rohbaumaß {rw}×{rh})',
  },
  'Exterior sill with 40 mm overhang, interior sill board, compression tape 10 mm, frame screws, drip cap over the header': {
    uk: 'Зовнішній підвіконник з виступом 40 мм, внутрішня підвіконна дошка, компресійна стрічка 10 мм, шурупи для рами, крапельник над перемичкою',
    de: 'Außenfensterbank mit 40 mm Überstand, Innenfensterbank, Kompriband 10 mm, Rahmenschrauben, Tropfkante über dem Sturz',
  },
  'Open passage – no joinery; finish the reveal with 20 mm boards': {
    uk: "Відкритий прохід – без столярних виробів; облицювати відкоси дошками 20 мм",
    de: 'Offener Durchgang – keine Tür/Fenster; die Laibung mit 20 mm Brettern verkleiden',
  },

  // ---------------------------------------------------------------------------------------
  // engine/joinery/index.ts — hardware & joinery names, specs, notes
  // ---------------------------------------------------------------------------------------
  'Adjustable post base, hot-dip galvanised': { uk: 'Регульована опора стовпа, гарячого оцинкування', de: 'Pfostenträger höhenverstellbar, feuerverzinkt' },
  'Heavy-duty concrete anchor': { uk: 'Важкий анкер для бетону', de: 'Schwerlastanker für Beton' },
  'Hex bolt with nut & washers': { uk: "Шестигранний болт з гайкою та шайбами", de: 'Sechskantschraube mit Mutter und Scheiben' },
  'Angle bracket with rib 90×90×65': { uk: 'Кутовий кронштейн з ребром 90×90×65', de: 'Winkelverbinder mit Rippe 90×90×65' },
  'Connector nails': { uk: 'Кріпильні цвяхи', de: 'Kammnägel' },
  'Rafter–purlin anchor': { uk: 'Анкер кроква–прогон', de: 'Sparren-Pfetten-Anker' },
  'Structural screws, countersunk': { uk: 'Конструкційні шурупи, потайна головка', de: 'Konstruktionsschrauben, Senkkopf' },
  'Structural screws (side posts → rail)': { uk: "Конструкційні шурупи (бічні стовпи → обв'язка)", de: 'Konstruktionsschrauben (Seitenpfosten → Rähm)' },
  'Wood screws (toe-screwed studs)': { uk: 'Шурупи по дереву (стійки навскоси)', de: 'Holzbauschrauben (Ständer schräg verschraubt)' },
  'Structural screws (headers & sills)': { uk: 'Конструкційні шурупи (перемички та підвіконні ригелі)', de: 'Konstruktionsschrauben (Stürze & Brüstungsriegel)' },
  "Frame anchors (bottom plate → slab)": { uk: "Рамні анкери (нижня обв'язка → плита)", de: 'Rahmendübel (Schwelle → Bodenplatte)' },
  'Splice bolts with washers': { uk: 'Болти стику з шайбами', de: 'Stoßverschraubung mit Scheiben' },
  'Flat connector plates': { uk: "Плоскі з'єднувальні пластини", de: 'Flachverbinder' },
  'Stainless cladding screws': { uk: 'Нержавіючі шурупи для обшивки', de: 'Fassadenschrauben aus Edelstahl' },
  'Self-drilling sheet screws with EPDM washer': { uk: 'Самонарізні шурупи для листів з шайбою EPDM', de: 'Bohrschrauben mit EPDM-Dichtscheibe' },
  'Panel fixings with sealing caps': { uk: 'Кріплення для панелей з ущільнювальними ковпачками', de: 'Stegplatten-Befestiger mit Dichtkappen' },
  'Roofing nails, galvanised': { uk: 'Покрівельні цвяхи, оцинковані', de: 'Dachpappnägel, verzinkt' },
  'OSB deck screws': { uk: 'Шурупи для настилу OSB', de: 'OSB-Schalungsschrauben' },
  'Flooring panel screws': { uk: 'Шурупи для підлогових панелей', de: 'Schrauben für Fußbodenplatten' },
  'Floorboard screws': { uk: 'Шурупи для дощок підлоги', de: 'Dielenschrauben' },
  'Point foundation with adjustable beam support': { uk: 'Точковий фундамент з регульованою опорою балки', de: 'Punktfundament mit U-Stützenfuß' },
  'Structural screws (joist → bearer)': { uk: 'Конструкційні шурупи (лага → опорна балка)', de: 'Konstruktionsschrauben (Balken → Unterzug)' },
  'Rubber levelling pads': { uk: 'Гумові вирівнюючі прокладки', de: 'Terrassenpads / Unterlegplatten' },
  'Angle brackets with concrete screws (sleeper → slab)': { uk: 'Кутові кронштейни з бетонними шурупами (лага → плита)', de: 'Winkelverbinder mit Betonschrauben (Lagerholz → Bodenplatte)' },
  'Stainless decking screws': { uk: 'Нержавіючі шурупи для тераси', de: 'Terrassenschrauben aus Edelstahl' },
  'Batten nails, galvanised': { uk: 'Цвяхи для обрешітки, оцинковані', de: 'Lattennägel, verzinkt' },
  'Door fitting kit': { uk: 'Комплект для монтажу дверей', de: 'Türmontage-Set' },
  'Window fitting kit': { uk: 'Комплект для монтажу вікна', de: 'Fenstermontage-Set' },

  'Mortise & tenon post → purlin': { uk: 'Шип і паз, стовп → прогон', de: 'Zapfenverbindung Pfosten–Pfette' },
  'Oak pegs Ø 20 mm': { uk: 'Дубові нагелі Ø 20 мм', de: 'Holznägel Ø 20 mm' },
  'Bevelled seat (level rafter on sloped purlin)': { uk: 'Скошене гніздо (горизонтальна кроква на похилому прогоні)', de: 'Auflager geschrägt' },
  'Birdsmouth seat (rafter on purlin)': { uk: 'Врубка (кроква на прогоні)', de: 'Kerve' },
  'Knee brace tenons (both ends)': { uk: 'Шипи підкосу (з обох кінців)', de: 'Kopfband-Zapfen' },
  'Hooked scarf joint (purlin splice)': { uk: 'Гачковий стик (сполучення прогону)', de: 'Hakenblatt' },
  'Half-lap side rail → post': { uk: "Напівзамкове з'єднання, бічна обв'язка → стовп", de: 'Überblattung Rähm–Pfosten' },
  "Stud tenons into plate & rail": { uk: "Шипи стійок в обв'язку та ригель", de: 'Ständerzapfen' },
  'Housed headers & sills': { uk: 'Врізані перемички та підвіконні ригелі', de: 'Eingelassene Stürze/Riegel' },
  'Rafter screws (secures seat)': { uk: 'Шурупи крокви (фіксують гніздо)', de: 'Sparrenschrauben (sichern Auflager)' },
  'Rafter screws (secures birdsmouth)': { uk: 'Шурупи крокви (фіксують врубку)', de: 'Sparrenschrauben (sichern Kerve)' },
  'Scarf joint bolts': { uk: 'Болти стикового з\'єднання', de: 'Stoßverschraubung' },

  'for {w}×{h} mm': { uk: 'для {w}×{h} мм', de: 'für {w}×{h} mm' },
  '170 mm, left/right alternating': { uk: 'ліворуч/праворуч почергово, 170 мм', de: '170 mm, wechselseitig links/rechts' },
  '40×40×80 cm concrete + U-support': { uk: '40×40×80 см бетон + U-опора', de: '40×40×80 cm Beton + U-Stützenfuß' },
  'Compression tape, PU foam, frame screws, threshold, drip cap': {
    uk: 'Компресійна стрічка, монтажна піна, шурупи для рами, поріг, крапельник',
    de: 'Kompriband, PU-Schaum, Rahmenschrauben, Schwelle, Tropfkante',
  },
  'Compression tape, PU foam, frame screws, sills, drip cap, cover strips': {
    uk: 'Компресійна стрічка, монтажна піна, шурупи для рами, підвіконники, крапельник, накривні планки',
    de: 'Kompriband, PU-Schaum, Rahmenschrauben, Fensterbänke, Tropfkante, Deckleisten',
  },
  'Tenon 40 mm thick, 60 mm long, secured with oak peg': {
    uk: 'Шип 40 мм завтовшки, 60 мм завдовжки, закріплений дубовим нагелем',
    de: 'Zapfen 40 mm dick, 60 mm lang, mit Holznagel gesichert',
  },
  '{n}° bevel': { uk: 'скіс {n}°', de: '{n}° Schräge' },
  '{n} mm deep': { uk: '{n} мм завглибшки', de: '{n} mm tief' },
  'Stub tenon with peg': { uk: 'Короткий шип з нагелем', de: 'Kurzzapfen mit Holznagel' },
  'Located over a post, bolted M12': { uk: 'Розташований над стовпом, скріплений болтом M12', de: 'Über einem Pfosten liegend, mit M12 verschraubt' },

  '1 per post base, min. 100 mm embedment': { uk: 'по 1 на опору стовпа, мін. заглиблення 100 мм', de: '1 je Pfostenträger, min. 100 mm Einbindetiefe' },
  '2 per post base': { uk: 'по 2 на опору стовпа', de: '2 je Pfostenträger' },
  "2 per post–purlin connection": { uk: "по 2 на з'єднання стовп–прогон", de: '2 je Verbindung Pfosten–Pfette' },
  '1 per rafter bearing': { uk: 'по 1 на опору крокви', de: '1 je Sparrenauflager' },
  '2 per brace end': { uk: 'по 2 на кінець підкосу', de: '2 je Kopfbandende' },
  '2 per stud end': { uk: 'по 2 на кінець стійки', de: '2 je Ständerende' },
  'Max. 800 mm apart, 150 mm from plate ends': { uk: "макс. 800 мм між собою, 150 мм від кінців обв'язки", de: 'max. 800 mm Abstand, 150 mm von den Schwellenenden' },
  '≈ 25 per m²': { uk: '≈ 25 на м²', de: '≈ 25 je m²' },
  '≈ 8 per m²': { uk: '≈ 8 на м²', de: '≈ 8 je m²' },
  '≈ 6 per m²': { uk: '≈ 6 на м²', de: '≈ 6 je m²' },
  '≈ 50 per m²': { uk: '≈ 50 на м²', de: '≈ 50 je m²' },
  '1 per bearer support': { uk: 'по 1 на опору балки', de: '1 je Unterzugstütze' },
  '2 per crossing': { uk: 'по 2 на перетин', de: '2 je Kreuzung' },
  '1 per sleeper support': { uk: 'по 1 на опору лаги', de: '1 je Lagerholzstütze' },
  '2 per sleeper': { uk: 'по 2 на лагу', de: '2 je Lagerholz' },
  '2 per board per joist': { uk: 'по 2 на дошку на лагу', de: '2 je Brett und Balken' },
  '1 per door': { uk: 'по 1 на двері', de: '1 je Tür' },
  '1 per window': { uk: 'по 1 на вікно', de: '1 je Fenster' },
  '2 per batten crossing': { uk: 'по 2 на перетин рейки', de: '2 je Lattenkreuzung' },

  // ---------------------------------------------------------------------------------------
  // engine/vehicles.ts — vehicle catalogue and fit-check messages
  // ---------------------------------------------------------------------------------------
  '{model} – city car': { uk: '{model} – міське авто', de: '{model} – Kleinstwagen' },
  '{model} – compact': { uk: '{model} – компактний клас', de: '{model} – Kompaktklasse' },
  '{model} – sedan': { uk: '{model} – седан', de: '{model} – Limousine' },
  '{model} – estate': { uk: '{model} – універсал', de: '{model} – Kombi' },
  '{model} – SUV': { uk: '{model} – позашляховик', de: '{model} – SUV' },
  '{model} – crossover SUV': { uk: '{model} – кросовер (SUV)', de: '{model} – Crossover-SUV' },
  '{model} – large SUV': { uk: '{model} – великий позашляховик', de: '{model} – große SUV' },
  '{model} – van': { uk: '{model} – мінівен', de: '{model} – Van' },
  '{model} – pickup': { uk: '{model} – пікап', de: '{model} – Pickup' },
  '{model} – camper van': { uk: '{model} – автодім (кемпер)', de: '{model} – Wohnmobil' },
  '{model} – panel van': { uk: '{model} – фургон', de: '{model} – Kastenwagen' },

  'Motorcycle – touring': { uk: 'Мотоцикл – туристичний', de: 'Motorrad – Tourer' },
  'Bicycle – city / trekking': { uk: 'Велосипед – міський / трекінговий', de: 'Fahrrad – Stadt / Trekking' },
  'Waste bin 120 L': { uk: 'Смітник 120 л', de: 'Mülltonne 120 L' },
  'Waste bin 240 L': { uk: 'Смітник 240 л', de: 'Mülltonne 240 L' },
  'Waste container 1100 L': { uk: 'Сміттєвий контейнер 1100 л', de: 'Müllcontainer 1100 L' },
  'Lawn mower – push / electric': { uk: 'Газонокосарка – ручна / електрична', de: 'Rasenmäher – Hand-/Elektromäher' },
  'Ride-on lawn mower': { uk: 'Райдер (косарка з сидінням)', de: 'Aufsitzmäher' },
  'Wheelbarrow': { uk: 'Тачка', de: 'Schubkarre' },
  'Tool shelf (free size)': { uk: 'Стелаж для інструментів (довільний розмір)', de: 'Werkzeugregal (freie Größe)' },
  'Table (free size)': { uk: 'Стіл (довільний розмір)', de: 'Tisch (freie Größe)' },
  'Workbench (free size)': { uk: 'Верстак (довільний розмір)', de: 'Werkbank (freie Größe)' },
  'Garden bench': { uk: 'Садова лавка', de: 'Gartenbank' },
  'Firewood stack (free size)': { uk: 'Штабель дров (довільний розмір)', de: 'Brennholzstapel (freie Größe)' },
  'Storage box / crate (free size)': { uk: 'Ящик для зберігання (довільний розмір)', de: 'Aufbewahrungsbox / Kiste (freie Größe)' },
  'Rain barrel 300 L (free size)': { uk: 'Бочка для дощової води 300 л (довільний розмір)', de: 'Regentonne 300 L (freie Größe)' },
  'IBC water tank 1000 L': { uk: 'Резервуар IBC для води 1000 л', de: 'IBC-Wassertank 1000 L' },
  'Ladder – leaning (free size)': { uk: 'Драбина приставна (довільний розмір)', de: 'Anlegeleiter (freie Größe)' },
  'Gas grill with side tables': { uk: 'Газовий гриль з бічними столиками', de: 'Gasgrill mit Seitentischen' },
  'Kettle grill Ø 570': { uk: 'Гриль-кетл Ø 570', de: 'Kugelgrill Ø 570' },

  'Cars (Pkw)': { uk: 'Легкові авто', de: 'Pkw' },
  'Vans & pickups (Transporter)': { uk: 'Фургони та пікапи', de: 'Transporter' },
  'Two-wheelers (Zweiräder)': { uk: 'Двоколісні', de: 'Zweiräder' },
  'Waste bins (Mülltonnen)': { uk: 'Сміттєві контейнери', de: 'Mülltonnen' },
  'Garden tools (Gartengeräte)': { uk: 'Садовий інвентар', de: 'Gartengeräte' },
  'Furniture & workshop (Möbel)': { uk: 'Меблі та майстерня', de: 'Möbel' },
  'Storage (Lager)': { uk: 'Зберігання', de: 'Lager' },
  'Water (Wasser)': { uk: 'Вода', de: 'Wasser' },
  'Leisure (Freizeit)': { uk: 'Відпочинок', de: 'Freizeit' },

  'Fits.': { uk: 'Підходить.', de: 'Passt.' },
  'Not under the roof.': { uk: 'Не під дахом.', de: 'Nicht unter dem Dach.' },
  'Sticks out of the roof by {n} mm.': { uk: 'Виступає за межі даху на {n} мм.', de: 'Ragt {n} mm über das Dach hinaus.' },
  'Collides with a post (mirror width).': { uk: 'Перетинається зі стовпом (за шириною з дзеркалами).', de: 'Kollidiert mit einem Pfosten (Breite mit Spiegeln).' },
  'Crosses closed wall: {walls}.': { uk: 'Перетинає закриту стіну: {walls}.', de: 'Kreuzt geschlossene Wand: {walls}.' },
  'Too tall: {n} mm short under the {obstacle}.': { uk: 'Занадто високий: не вистачає {n} мм під {obstacle}.', de: 'Zu hoch: {n} mm zu wenig unter {obstacle}.' },
  'Tight headroom: only {n} mm under the {obstacle}.': { uk: 'Обмежена висота: лише {n} мм під {obstacle}.', de: 'Knappe Kopfhöhe: nur {n} mm unter {obstacle}.' },
  'Headroom {n} mm under the {obstacle}.': { uk: 'Висота {n} мм під {obstacle}.', de: 'Kopfhöhe {n} mm unter {obstacle}.' },

  rafters: { uk: 'кроквами', de: 'den Sparren' },
  'front purlin': { uk: 'переднім прогоном', de: 'der vorderen Pfette' },
  'rear purlin': { uk: 'заднім прогоном', de: 'der hinteren Pfette' },
  'left purlin': { uk: 'лівим прогоном', de: 'der linken Pfette' },
  'right purlin': { uk: 'правим прогоном', de: 'der rechten Pfette' },
  'mid purlin': { uk: 'середнім прогоном', de: 'der mittleren Pfette' },
  'knee brace at front purlin': { uk: 'підкосом при передньому прогоні', de: 'dem Kopfband an der vorderen Pfette' },
  'knee brace at rear purlin': { uk: 'підкосом при задньому прогоні', de: 'dem Kopfband an der hinteren Pfette' },
  'knee brace at left purlin': { uk: 'підкосом при лівому прогоні', de: 'dem Kopfband an der linken Pfette' },
  'knee brace at right purlin': { uk: 'підкосом при правому прогоні', de: 'dem Kopfband an der rechten Pfette' },
  'knee brace at mid purlin': { uk: 'підкосом при середньому прогоні', de: 'dem Kopfband an der mittleren Pfette' },

  // ---------------------------------------------------------------------------------------
  // engine/paving.ts
  // ---------------------------------------------------------------------------------------
  'Stretcher bond (Läuferverband)': { uk: 'Кладка вперев’язку (Läuferverband)', de: 'Läuferverband' },
  'Stack bond (Reihenverband)': { uk: 'Рядова кладка (Reihenverband)', de: 'Reihenverband' },
  'Herringbone (Fischgrät)': { uk: 'Ялинка (Fischgrät)', de: 'Fischgrät' },

  // ---------------------------------------------------------------------------------------
  // engine/freePosts.ts
  // ---------------------------------------------------------------------------------------
  'Top cut to purlin slope': { uk: 'Верхній зріз під ухил прогону', de: 'Kopfschnitt schräg zur Pfette' },
  'Under purlin': { uk: 'Під прогоном', de: 'Unter der Pfette' },
  'Top cut to rafter underside': { uk: 'Верхній зріз під низ крокви', de: 'Kopfschnitt an Sparrenunterkante' },

  // ---------------------------------------------------------------------------------------
  // engine/pricing/index.ts
  // ---------------------------------------------------------------------------------------
  'Roof deck (OSB, under covering)': { uk: 'Обрешітка даху (OSB, під покриттям)', de: 'Dachschalung (OSB)' },
  'Custom door, made to measure': { uk: 'Двері на замовлення (за розміром)', de: 'Maßgefertigte Tür' },
  'Custom window, made to measure': { uk: 'Вікно на замовлення (за розміром)', de: 'Maßgefertigtes Fenster' },
} satisfies Dict;
