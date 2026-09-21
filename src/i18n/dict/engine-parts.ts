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
  'Boarded door 750×2000': { uk: 'Дощані двері 750×2000', de: 'Brettertür 750×2000', pl: 'Drzwi z desek 750×2000' },
  'Boarded door 875×2000': { uk: 'Дощані двері 875×2000', de: 'Brettertür 875×2000', pl: 'Drzwi z desek 875×2000' },
  'Glazed door 875×2000': { uk: 'Засклені двері 875×2000', de: 'Gartenhaustür verglast 875×2000', pl: 'Drzwi przeszklone 875×2000' },
  'Glazed door 1000×2000': { uk: 'Засклені двері 1000×2000', de: 'Gartenhaustür verglast 1000×2000', pl: 'Drzwi przeszklone 1000×2000' },
  'Stable door 875×2000': { uk: 'Двері типу «стайня» 875×2000', de: 'Stalltür 875×2000', pl: 'Drzwi dzielone (stajenne) 875×2000' },
  'Double door 1500×2000': { uk: 'Подвійні двері 1500×2000', de: 'Doppeltür 1500×2000', pl: 'Drzwi dwuskrzydłowe 1500×2000' },
  'Double door 1750×2000': { uk: 'Подвійні двері 1750×2000', de: 'Doppeltür 1750×2000', pl: 'Drzwi dwuskrzydłowe 1750×2000' },
  'Double glazed door 1750×2000': { uk: 'Подвійні засклені двері 1750×2000', de: 'Doppeltür verglast 1750×2000', pl: 'Drzwi dwuskrzydłowe przeszklone 1750×2000' },
  'Fixed window 500×500': { uk: 'Глухе вікно 500×500', de: 'Festverglasung 500×500', pl: 'Okno stałe 500×500' },
  'Tilt window 800×500': { uk: 'Відкидне вікно 800×500', de: 'Kippfenster 800×500', pl: 'Okno uchylne 800×500' },
  'Turn-tilt window 600×800': { uk: 'Поворотно-відкидне вікно 600×800', de: 'Dreh-Kipp-Fenster 600×800', pl: 'Okno rozwierno-uchylne 600×800' },
  'Turn-tilt window 800×800': { uk: 'Поворотно-відкидне вікно 800×800', de: 'Dreh-Kipp-Fenster 800×800', pl: 'Okno rozwierno-uchylne 800×800' },
  'Turn-tilt window 800×1000': { uk: 'Поворотно-відкидне вікно 800×1000', de: 'Dreh-Kipp-Fenster 800×1000', pl: 'Okno rozwierno-uchylne 800×1000' },
  'Turn-tilt window 1000×1000': { uk: 'Поворотно-відкидне вікно 1000×1000', de: 'Dreh-Kipp-Fenster 1000×1000', pl: 'Okno rozwierno-uchylne 1000×1000' },
  'Two-sash window 1200×1000': { uk: 'Двостулкове вікно 1200×1000', de: 'Zweiflügeliges Fenster 1200×1000', pl: 'Okno dwuskrzydłowe 1200×1000' },
  'Two-sash window 1400×1000': { uk: 'Двостулкове вікно 1400×1000', de: 'Zweiflügeliges Fenster 1400×1000', pl: 'Okno dwuskrzydłowe 1400×1000' },

  'Narrow tool-shed door (DIN 750×2000). Cheapest option; clear passage ≈ 700 mm.': {
    uk: 'Вузькі двері для сарая (DIN 750×2000). Найдешевший варіант; світлий прохід ≈ 700 мм.',
    de: 'Schmale Gartenhaustür (DIN 750×2000). Günstigste Option; lichte Durchgangsbreite ≈ 700 mm.',
    pl: 'Wąskie drzwi do szopy na narzędzia (DIN 750×2000). Najtańsza opcja; prześwit przejścia ≈ 700 mm.',
  },
  'Standard single garden-house door (DIN 875×2000): boards on a Z-frame. Clear passage ≈ 800 mm.': {
    uk: "Стандартні одностулкові двері садового будиночка (DIN 875×2000): дошки на Z-каркасі. Світлий прохід ≈ 800 мм.",
    de: 'Standard-Gartenhaustür einflügelig (DIN 875×2000): Bretter auf Z-Rahmen. Lichte Durchgangsbreite ≈ 800 mm.',
    pl: 'Standardowe jednoskrzydłowe drzwi do domku ogrodowego (DIN 875×2000): deski na ramie Z. Prześwit przejścia ≈ 800 mm.',
  },
  'Framed door with a glazed upper half – brings daylight into a summer house. Clear passage ≈ 800 mm.': {
    uk: 'Двері з рамою і засклeною верхньою половиною – додають денного світла в літній будиночок. Світлий прохід ≈ 800 мм.',
    de: 'Rahmentür mit verglastem Oberteil – bringt Tageslicht ins Gartenhaus. Lichte Durchgangsbreite ≈ 800 mm.',
    pl: 'Drzwi ramowe z przeszkloną górną połową – wpuszczają światło dzienne do altany. Prześwit przejścia ≈ 800 mm.',
  },
  'Wide framed door with glazing (DIN 1000×2000). Clear passage ≈ 925 mm – comfortable for wheelbarrows.': {
    uk: 'Широкі рамні двері із заскленням (DIN 1000×2000). Світлий прохід ≈ 925 мм – зручно для тачки.',
    de: 'Breite Rahmentür mit Verglasung (DIN 1000×2000). Lichte Durchgangsbreite ≈ 925 mm – bequem für Schubkarren.',
    pl: 'Szerokie drzwi ramowe z przeszkleniem (DIN 1000×2000). Prześwit przejścia ≈ 925 mm – wygodnie dla taczek.',
  },
  'Split (Dutch) door: the upper half opens for ventilation while the lower half stays closed.': {
    uk: 'Розділені двері (типу «стайня»): верхня половина відчиняється для провітрювання, нижня залишається закритою.',
    de: 'Geteilte Tür (Stalltür): die obere Hälfte öffnet zur Belüftung, die untere bleibt geschlossen.',
    pl: 'Drzwi dzielone (holenderskie): górna połowa otwiera się do wietrzenia, a dolna pozostaje zamknięta.',
  },
  'Two boarded leaves (DIN 1500×2000) – fits a lawn mower or bicycles. Clear passage ≈ 1420 mm.': {
    uk: 'Дві дощаті стулки (DIN 1500×2000) – вміщує газонокосарку або велосипеди. Світлий прохід ≈ 1420 мм.',
    de: 'Zwei Türblätter aus Brettern (DIN 1500×2000) – passt für Rasenmäher oder Fahrräder. Lichte Durchgangsbreite ≈ 1420 mm.',
    pl: 'Dwa skrzydła z desek (DIN 1500×2000) – zmieści się kosiarka lub rowery. Prześwit przejścia ≈ 1420 mm.',
  },
  'Wide double door (DIN 1750×2000) for ride-on mowers and garden machinery. Clear passage ≈ 1670 mm.': {
    uk: 'Широкі подвійні двері (DIN 1750×2000) для райдерів і садової техніки. Світлий прохід ≈ 1670 мм.',
    de: 'Breite Doppeltür (DIN 1750×2000) für Aufsitzmäher und Gartentechnik. Lichte Durchgangsbreite ≈ 1670 mm.',
    pl: 'Szerokie drzwi dwuskrzydłowe (DIN 1750×2000) dla traktorków i sprzętu ogrodowego. Prześwit przejścia ≈ 1670 mm.',
  },
  'Two framed leaves with glazed upper halves – summer-house entrance opening onto a terrace.': {
    uk: 'Дві рамні стулки із засклeними верхніми половинами – вхід до літнього будиночка з виходом на терасу.',
    de: 'Zwei Rahmenflügel mit verglasten Oberteilen – Gartenhauseingang mit Zugang zur Terrasse.',
    pl: 'Dwa skrzydła ramowe z przeszklonymi górnymi połowami – wejście do altany z wyjściem na taras.',
  },
  'Small fixed light for a tool shed – fits between two studs at 625 mm centres without extra framing.': {
    uk: 'Невелике глухе вікно для сарая – вміщується між двома стійками з кроком 625 мм без додаткового каркасу.',
    de: 'Kleines Festverglasungselement für einen Geräteschuppen – passt zwischen zwei Ständer im Achsabstand 625 mm ohne zusätzlichen Rahmen.',
    pl: 'Małe okno stałe do szopy na narzędzia – mieści się między dwoma słupkami w rozstawie 625 mm bez dodatkowego obramowania.',
  },
  'High-level tilt window for ventilation above shelving.': {
    uk: 'Високо розташоване відкидне вікно для провітрювання над полицями.',
    de: 'Hoch angeordnetes Kippfenster zur Belüftung über Regalen.',
    pl: 'Wysoko umieszczone okno uchylne do wietrzenia nad regałami.',
  },
  'Compact opening window (standard stock size).': {
    uk: 'Компактне відчинне вікно (стандартний типорозмір).',
    de: 'Kompaktes zu öffnendes Fenster (Standardgröße).',
    pl: 'Kompaktowe okno otwierane (standardowy rozmiar magazynowy).',
  },
  'Most common garden-house window size; stocked by every supplier.': {
    uk: 'Найпоширеніший розмір вікна для садового будиночка; є в наявності у кожного постачальника.',
    de: 'Gängigste Fenstergröße für Gartenhäuser; bei jedem Lieferanten vorrätig.',
    pl: 'Najczęstszy rozmiar okna do domku ogrodowego; dostępny u każdego dostawcy.',
  },
  'Tall single-sash window for a summer house.': {
    uk: 'Високе одностулкове вікно для літнього будиночка.',
    de: 'Hohes einflügeliges Fenster für ein Gartenhaus.',
    pl: 'Wysokie okno jednoskrzydłowe do altany.',
  },
  'Square single-sash window (stock size); header stays at 160 mm.': {
    uk: 'Квадратне одностулкове вікно (типовий розмір); перемичка залишається 160 мм.',
    de: 'Quadratisches einflügeliges Fenster (Lagergröße); Sturz bleibt bei 160 mm.',
    pl: 'Kwadratowe okno jednoskrzydłowe (rozmiar magazynowy); nadproże pozostaje 160 mm.',
  },
  'Two sashes with a central mullion – the classic garden-house front window.': {
    uk: "Дві стулки з центральною стійкою – класичне фасадне вікно садового будиночка.",
    de: 'Zwei Flügel mit Mittelpfosten – das klassische Gartenhaus-Frontfenster.',
    pl: 'Dwa skrzydła ze słupkiem środkowym – klasyczne okno frontowe domku ogrodowego.',
  },
  'Wide two-sash window; needs a bay of at least ~1700 mm between posts.': {
    uk: 'Широке двостулкове вікно; потребує прогону не менше ≈1700 мм між стовпами.',
    de: 'Breites zweiflügeliges Fenster; benötigt ein Feld von mindestens ≈1700 mm zwischen den Pfosten.',
    pl: 'Szerokie okno dwuskrzydłowe; wymaga przęsła co najmniej ~1700 mm między słupami.',
  },
  'too wide – widest bay between posts allows {n} mm': {
    uk: 'занадто широкий – найширший проліт між стовпами допускає {n} мм',
    de: 'zu breit – das breiteste Feld zwischen den Pfosten erlaubt {n} mm',
    pl: 'za szerokie – najszersze przęsło między słupami pozwala na {n} mm',
  },
  'too tall – wall allows {n} mm under the header': {
    uk: 'занадто високий – стіна допускає {n} мм під перемичкою',
    de: 'zu hoch – die Wand erlaubt {n} mm unter dem Sturz',
    pl: 'za wysokie – ściana pozwala na {n} mm pod nadprożem',
  },

  // ---------------------------------------------------------------------------------------
  // engine/framing/openingCatalog.ts — fixture material lists (BOARDED_MATERIALS,
  // GLAZED_MATERIALS, STABLE_MATERIALS, windowMaterials, openingMaterials fallback)
  // ---------------------------------------------------------------------------------------
  'Door leaf: 21–24 mm tongue-and-groove boards (Profilbretter) on a Z-frame of 24×100 mm ledges and brace, {nominal} nominal': {
    uk: "Полотно дверей: дошки шпунтовані 21–24 мм (Profilbretter) на Z-каркасі з планок 24×100 мм і розкосом, номінал {nominal}",
    de: 'Türblatt: 21–24 mm Nut-und-Feder-Bretter (Profilbretter) auf Z-Rahmen aus 24×100 mm Leisten und Strebe, {nominal} Nennmaß',
    pl: 'Skrzydło drzwi: deski na pióro i wpust 21–24 mm (Profilbretter) na ramie Z z listew 24×100 mm i zastrzału, wymiar nominalny {nominal}',
  },
  'Door leaf ×2: 21–24 mm tongue-and-groove boards (Profilbretter) on a Z-frame of 24×100 mm ledges and brace, {nominal} nominal': {
    uk: "Полотно дверей ×2: дошки шпунтовані 21–24 мм (Profilbretter) на Z-каркасі з планок 24×100 мм і розкосом, номінал {nominal}",
    de: 'Türblatt ×2: 21–24 mm Nut-und-Feder-Bretter (Profilbretter) auf Z-Rahmen aus 24×100 mm Leisten und Strebe, {nominal} Nennmaß',
    pl: 'Skrzydło drzwi ×2: deski na pióro i wpust 21–24 mm (Profilbretter) na ramie Z z listew 24×100 mm i zastrzału, wymiar nominalny {nominal}',
  },
  'Frame (Zarge): 3 × planed 40×120 mm boards, rebated 15 mm for the leaf, or a ready-made timber frame': {
    uk: "Рама (Zarge): 3 × стругані дошки 40×120 мм, чверть 15 мм під полотно, або готова дерев'яна рама",
    de: 'Zarge: 3 × gehobelte Bretter 40×120 mm, 15 mm Falz für das Türblatt, oder eine fertige Holzzarge',
    pl: 'Ościeżnica (Zarge): 3 × strugane deski 40×120 mm z przylgą 15 mm na skrzydło lub gotowa ościeżnica drewniana',
  },
  'T-hinges (Ladenbänder) 300–400 mm, {n} pcs, galvanised': {
    uk: 'Т-петлі (Ladenbänder) 300–400 мм, {n} шт., оцинковані',
    de: 'T-Bänder (Ladenbänder) 300–400 mm, {n} Stk., verzinkt',
    pl: 'Zawiasy pasowe (Ladenbänder) 300–400 mm, {n} szt., ocynkowane',
  },
  'Rim lock or mortise lock with cylinder, handle set': {
    uk: 'Накладний або врізний замок з циліндром, комплект ручок',
    de: 'Kastenschloss oder Einsteckschloss mit Zylinder, Griffgarnitur',
    pl: 'Zamek nawierzchniowy lub wpuszczany z wkładką, komplet klamek',
  },
  'Threshold: 40×60 mm hardwood or aluminium sill with drip edge': {
    uk: 'Поріг: тверда деревина 40×60 мм або алюмінієвий поріг з крапельником',
    de: 'Schwelle: 40×60 mm Hartholz- oder Aluminiumschwelle mit Tropfkante',
    pl: 'Próg: 40×60 mm z drewna twardego lub aluminiowy z okapnikiem',
  },
  'Sealing: compression tape (Kompriband) 10 mm around the frame, 6 × 120 mm frame screws': {
    uk: 'Ущільнення: компресійна стрічка (Kompriband) 10 мм по периметру рами, 6 × шурупи для рами 120 мм',
    de: 'Abdichtung: Kompriband 10 mm rund um den Rahmen, 6 × Rahmenschrauben 120 mm',
    pl: 'Uszczelnienie: taśma rozprężna (Kompriband) 10 mm wokół ościeżnicy, 6 × kotwy ramowe 120 mm',
  },
  'Weather protection: drip cap (Tropfkante) over the header, exterior wood stain': {
    uk: 'Захист від негоди: крапельник (Tropfkante) над перемичкою, зовнішня деревозахисна лазур',
    de: 'Wetterschutz: Tropfkante über dem Sturz, außenliegende Holzlasur',
    pl: 'Ochrona przed pogodą: okapnik (Tropfkante) nad nadprożem, zewnętrzna lazura do drewna',
  },
  'Turn-tilt window (Dreh-Kipp) {size}, timber or uPVC frame 68–70 mm, double glazing 4/16/4, turn-tilt hardware': {
    uk: "Поворотно-відкидне вікно (Dreh-Kipp) {size}, дерев'яна або ПВХ рама 68–70 мм, склопакет 4/16/4, поворотно-відкидна фурнітура",
    de: 'Dreh-Kipp-Fenster {size}, Holz- oder Kunststoffrahmen 68–70 mm, Isolierverglasung 4/16/4, Dreh-Kipp-Beschlag',
    pl: 'Okno rozwierno-uchylne (Dreh-Kipp) {size}, rama drewniana lub PVC 68–70 mm, szyba zespolona 4/16/4, okucia rozwierno-uchylne',
  },
  'Exterior window sill (Fensterbank): aluminium or larch board with 40 mm overhang and drip edge': {
    uk: 'Зовнішній підвіконник (Fensterbank): алюміній або модринова дошка з виступом 40 мм і крапельником',
    de: 'Außenfensterbank: Alu-Blech oder Lärchenbrett mit 40 mm Überstand und Tropfkante',
    pl: 'Parapet zewnętrzny (Fensterbank): aluminiowy lub z deski modrzewiowej z wysięgiem 40 mm i okapnikiem',
  },
  'Interior sill board 20 mm': { uk: 'Внутрішня підвіконна дошка 20 мм', de: 'Innenfensterbank 20 mm', pl: 'Parapet wewnętrzny 20 mm' },
  'Sealing: compression tape 10 mm all round, PU foam, 4–6 frame screws 7.5 × 112 mm': {
    uk: 'Ущільнення: компресійна стрічка 10 мм по периметру, монтажна піна, 4–6 шурупів для рами 7.5 × 112 мм',
    de: 'Abdichtung: Kompriband 10 mm rundum, PU-Schaum, 4–6 Rahmenschrauben 7,5 × 112 mm',
    pl: 'Uszczelnienie: taśma rozprężna 10 mm dookoła, pianka PU, 4–6 kotew ramowych 7,5 × 112 mm',
  },
  'Drip cap / flashing over the header, exterior cover strips (Deckleisten) 20×60 mm on the cladding': {
    uk: 'Крапельник / відлив над перемичкою, зовнішні накривні планки (Deckleisten) 20×60 мм на обшивці',
    de: 'Tropfkante / Abdeckblech über dem Sturz, außenliegende Deckleisten 20×60 mm auf der Verkleidung',
    pl: 'Okapnik / obróbka blacharska nad nadprożem, zewnętrzne listwy maskujące (Deckleisten) 20×60 mm na okładzinie',
  },
  'Framed door leaf (Rahmentür) {nominal} nominal, 40–68 mm thick, upper half insulated glazing, lower boarded panel – or a ready-made garden-house door': {
    uk: 'Рамне полотно дверей (Rahmentür), номінал {nominal}, товщина 40–68 мм, верхня половина зі склопакетом, нижня – дощата панель – або готові двері для садового будиночка',
    de: 'Rahmentür {nominal} Nennmaß, 40–68 mm dick, oberes Türblatt verglast, unteres Feld aus Brettern – oder eine fertige Gartenhaustür',
    pl: 'Skrzydło drzwi ramowych (Rahmentür) wymiar nominalny {nominal}, grub. 40–68 mm, górna połowa z szybą zespoloną, dolna płyciny z desek – lub gotowe drzwi do domku ogrodowego',
  },
  'Timber frame (Holzzarge) 68 mm, rebated, with EPDM seal': {
    uk: "Дерев'яна рама (Holzzarge) 68 мм, з чвертю, з ущільненням EPDM",
    de: 'Holzzarge 68 mm, gefalzt, mit EPDM-Dichtung',
    pl: 'Ościeżnica drewniana (Holzzarge) 68 mm, z przylgą, z uszczelką EPDM',
  },
  '3 × adjustable hinges (Einbohrbänder), mortise lock with profile cylinder, handle set': {
    uk: '3 × регульовані петлі (Einbohrbänder), врізний замок з профільним циліндром, комплект ручок',
    de: '3 × Einbohrbänder, Einsteckschloss mit Profilzylinder, Griffgarnitur',
    pl: '3 × zawiasy regulowane (Einbohrbänder), zamek wpuszczany z wkładką profilową, komplet klamek',
  },
  'Threshold: aluminium sill with thermal break and drip edge': {
    uk: 'Поріг: алюмінієвий поріг з термовставкою і крапельником',
    de: 'Schwelle: Aluminiumschwelle mit thermischer Trennung und Tropfkante',
    pl: 'Próg: aluminiowy z przekładką termiczną i okapnikiem',
  },
  'Sealing: compression tape 10 mm around the frame, PU foam, 6 × 120 mm frame screws': {
    uk: 'Ущільнення: компресійна стрічка 10 мм по периметру рами, монтажна піна, 6 × шурупи для рами 120 мм',
    de: 'Abdichtung: Kompriband 10 mm rund um den Rahmen, PU-Schaum, 6 × Rahmenschrauben 120 mm',
    pl: 'Uszczelnienie: taśma rozprężna 10 mm wokół ościeżnicy, pianka PU, 6 × kotwy ramowe 120 mm',
  },
  'Drip cap over the header, exterior stain or paint': {
    uk: 'Крапельник над перемичкою, зовнішня лазур або фарба',
    de: 'Tropfkante über dem Sturz, außenliegende Lasur oder Farbe',
    pl: 'Okapnik nad nadprożem, zewnętrzna lazura lub farba',
  },
  'Two boarded leaves (split at ~1100 mm): 21–24 mm tongue-and-groove boards on 24×100 mm Z-frames, 875×2000 nominal': {
    uk: 'Дві дощаті стулки (розділені на висоті ≈1100 мм): дошки шпунтовані 21–24 мм на Z-каркасах 24×100 мм, номінал 875×2000',
    de: 'Zwei Türblätter aus Brettern (geteilt bei ~1100 mm): 21–24 mm Nut-und-Feder-Bretter auf Z-Rahmen 24×100 mm, 875×2000 Nennmaß',
    pl: 'Dwa skrzydła z desek (podział na ~1100 mm): deski na pióro i wpust 21–24 mm na ramach Z 24×100 mm, wymiar nominalny 875×2000',
  },
  'Frame (Zarge): 3 × planed 40×120 mm boards, rebated 15 mm': {
    uk: 'Рама (Zarge): 3 × стругані дошки 40×120 мм, чверть 15 мм',
    de: 'Zarge: 3 × gehobelte Bretter 40×120 mm, 15 mm Falz',
    pl: 'Ościeżnica (Zarge): 3 × strugane deski 40×120 mm z przylgą 15 mm',
  },
  '4 × T-hinges (Ladenbänder) 300 mm, galvanised': {
    uk: '4 × Т-петлі (Ladenbänder) 300 мм, оцинковані',
    de: '4 × T-Bänder (Ladenbänder) 300 mm, verzinkt',
    pl: '4 × zawiasy pasowe (Ladenbänder) 300 mm, ocynkowane',
  },
  'Rim lock on the lower leaf, sliding bolt (Riegel) joining upper and lower leaf, hook to hold the upper leaf open': {
    uk: "Накладний замок на нижній стулці, засувка (Riegel), що з'єднує верхню і нижню стулки, гачок для фіксації верхньої стулки відкритою",
    de: 'Kastenschloss am unteren Türblatt, Riegel zur Verbindung von oberem und unterem Türblatt, Haken zum Feststellen des offenen oberen Türblatts',
    pl: 'Zamek nawierzchniowy na dolnym skrzydle, zasuwa (Riegel) łącząca górne i dolne skrzydło, haczyk do przytrzymania otwartego górnego skrzydła',
  },
  'Threshold: 40×60 mm hardwood sill with drip edge': {
    uk: 'Поріг: тверда деревина 40×60 мм з крапельником',
    de: 'Schwelle: 40×60 mm Hartholzschwelle mit Tropfkante',
    pl: 'Próg: 40×60 mm z drewna twardego z okapnikiem',
  },
  'Compression tape 10 mm, 6 × 120 mm frame screws, drip cap over the header': {
    uk: 'Компресійна стрічка 10 мм, 6 × шурупи для рами 120 мм, крапельник над перемичкою',
    de: 'Kompriband 10 mm, 6 × Rahmenschrauben 120 mm, Tropfkante über dem Sturz',
    pl: 'Taśma rozprężna 10 mm, 6 × kotwy ramowe 120 mm, okapnik nad nadprożem',
  },
  'Rim lock with cylinder + shoot bolts (Kantenriegel) top and bottom on the passive leaf': {
    uk: 'Накладний замок з циліндром + засувки (Kantenriegel) зверху і знизу на пасивній стулці',
    de: 'Kastenschloss mit Zylinder + Kantenriegel oben und unten am Standflügel',
    pl: 'Zamek nawierzchniowy z wkładką + zasuwy krawędziowe (Kantenriegel) u góry i u dołu skrzydła biernego',
  },
  'Two framed door leaves (Rahmentür) 1750×2000 nominal, 40–68 mm thick, glazed upper halves, or a ready-made double garden-house door': {
    uk: 'Два рамних полотна дверей (Rahmentür), номінал 1750×2000, товщина 40–68 мм, засклені верхні половини, або готові подвійні двері для садового будиночка',
    de: 'Zwei Rahmentürblätter 1750×2000 Nennmaß, 40–68 mm dick, verglaste Oberteile, oder eine fertige Gartenhaus-Doppeltür',
    pl: 'Dwa skrzydła drzwi ramowych (Rahmentür) wymiar nominalny 1750×2000, grub. 40–68 mm, przeszklone górne połowy, lub gotowe dwuskrzydłowe drzwi do domku ogrodowego',
  },
  '6 × adjustable hinges, mortise lock with profile cylinder on the active leaf, shoot bolts on the passive leaf': {
    uk: '6 × регульовані петлі, врізний замок з профільним циліндром на активній стулці, засувки на пасивній стулці',
    de: '6 × verstellbare Bänder, Einsteckschloss mit Profilzylinder am Gangflügel, Kantenriegel am Standflügel',
    pl: '6 × zawiasy regulowane, zamek wpuszczany z wkładką profilową na skrzydle czynnym, zasuwy krawędziowe na skrzydle biernym',
  },
  'Compression tape 10 mm, PU foam, 6 × 120 mm frame screws, drip cap over the header': {
    uk: 'Компресійна стрічка 10 мм, монтажна піна, 6 × шурупи для рами 120 мм, крапельник над перемичкою',
    de: 'Kompriband 10 mm, PU-Schaum, 6 × Rahmenschrauben 120 mm, Tropfkante über dem Sturz',
    pl: 'Taśma rozprężna 10 mm, pianka PU, 6 × kotwy ramowe 120 mm, okapnik nad nadprożem',
  },
  'Fixed glazing (Festverglasung) {size}, timber or uPVC frame 68–70 mm, double glazing 4/16/4': {
    uk: "Глухе засклення (Festverglasung) {size}, дерев'яна або ПВХ рама 68–70 мм, склопакет 4/16/4",
    de: 'Festverglasung {size}, Holz- oder Kunststoffrahmen 68–70 mm, Isolierverglasung 4/16/4',
    pl: 'Przeszklenie stałe (Festverglasung) {size}, rama drewniana lub PVC 68–70 mm, szyba zespolona 4/16/4',
  },
  'Tilt window (Kippfenster) {size}, timber or uPVC frame 68–70 mm, double glazing, tilt fitting with stay': {
    uk: "Відкидне вікно (Kippfenster) {size}, дерев'яна або ПВХ рама 68–70 мм, склопакет, відкидна фурнітура з обмежувачем",
    de: 'Kippfenster {size}, Holz- oder Kunststoffrahmen 68–70 mm, Isolierverglasung, Kippbeschlag mit Feststeller',
    pl: 'Okno uchylne (Kippfenster) {size}, rama drewniana lub PVC 68–70 mm, szyba zespolona, okucie uchylne z ogranicznikiem',
  },
  'Two-sash window (2-flügelig) {size} with mullion or stulp, timber or uPVC frame 68–70 mm, double glazing': {
    uk: "Двостулкове вікно (2-flügelig) {size} зі стійкою або притулом, дерев'яна або ПВХ рама 68–70 мм, склопакет",
    de: 'Zweiflügeliges Fenster {size} mit Pfosten oder Stulpausführung, Holz- oder Kunststoffrahmen 68–70 mm, Isolierverglasung',
    pl: 'Okno dwuskrzydłowe (2-flügelig) {size} ze słupkiem stałym lub ruchomym (stulp), rama drewniana lub PVC 68–70 mm, szyba zespolona',
  },
  'Custom door leaf and frame for a {fw}×{fh} mm frame outer size (rough opening {rw}×{rh})': {
    uk: "Індивідуальне полотно та рама дверей для зовнішнього розміру рами {fw}×{fh} мм (чорновий проріз {rw}×{rh})",
    de: 'Individuelles Türblatt und Zarge für ein Rahmenaußenmaß {fw}×{fh} mm (Rohbaumaß {rw}×{rh})',
    pl: 'Skrzydło i ościeżnica drzwi na wymiar dla ościeżnicy o wymiarze zewnętrznym {fw}×{fh} mm (otwór surowy {rw}×{rh})',
  },
  'Rebated timber frame from 40×120 mm boards, T-hinges or adjustable hinges, lock with cylinder': {
    uk: "Фальцьована дерев'яна рама з дощок 40×120 мм, Т-петлі або регульовані петлі, замок з циліндром",
    de: 'Gefalzte Holzzarge aus 40×120 mm Brettern, T-Bänder oder Einbohrbänder, Schloss mit Zylinder',
    pl: 'Ościeżnica drewniana z przylgą z desek 40×120 mm, zawiasy pasowe lub regulowane, zamek z wkładką',
  },
  'Threshold with drip edge, compression tape 10 mm, 6 × 120 mm frame screws, drip cap over the header': {
    uk: 'Поріг з крапельником, компресійна стрічка 10 мм, 6 × шурупи для рами 120 мм, крапельник над перемичкою',
    de: 'Schwelle mit Tropfkante, Kompriband 10 mm, 6 × Rahmenschrauben 120 mm, Tropfkante über dem Sturz',
    pl: 'Próg z okapnikiem, taśma rozprężna 10 mm, 6 × kotwy ramowe 120 mm, okapnik nad nadprożem',
  },
  'Made-to-measure window, frame outer size {fw}×{fh} mm (rough opening {rw}×{rh})': {
    uk: 'Вікно на замовлення, зовнішній розмір рами {fw}×{fh} мм (чорновий проріз {rw}×{rh})',
    de: 'Maßgefertigtes Fenster, Rahmenaußenmaß {fw}×{fh} mm (Rohbaumaß {rw}×{rh})',
    pl: 'Okno na wymiar, wymiar zewnętrzny ramy {fw}×{fh} mm (otwór surowy {rw}×{rh})',
  },
  'Exterior sill with 40 mm overhang, interior sill board, compression tape 10 mm, frame screws, drip cap over the header': {
    uk: 'Зовнішній підвіконник з виступом 40 мм, внутрішня підвіконна дошка, компресійна стрічка 10 мм, шурупи для рами, крапельник над перемичкою',
    de: 'Außenfensterbank mit 40 mm Überstand, Innenfensterbank, Kompriband 10 mm, Rahmenschrauben, Tropfkante über dem Sturz',
    pl: 'Parapet zewnętrzny z wysięgiem 40 mm, parapet wewnętrzny, taśma rozprężna 10 mm, kotwy ramowe, okapnik nad nadprożem',
  },
  'Open passage – no joinery; finish the reveal with 20 mm boards': {
    uk: "Відкритий прохід – без столярних виробів; облицювати відкоси дошками 20 мм",
    de: 'Offener Durchgang – keine Tür/Fenster; die Laibung mit 20 mm Brettern verkleiden',
    pl: 'Otwarte przejście – bez stolarki; wykończ ościeże deskami 20 mm',
  },

  // ---------------------------------------------------------------------------------------
  // engine/joinery/index.ts — hardware & joinery names, specs, notes
  // ---------------------------------------------------------------------------------------
  'Adjustable post base, hot-dip galvanised': { uk: 'Регульована опора стовпа, гарячого оцинкування', de: 'Pfostenträger höhenverstellbar, feuerverzinkt', pl: 'Regulowana kotwa słupa, ocynkowana ogniowo' },
  'Heavy-duty concrete anchor': { uk: 'Важкий анкер для бетону', de: 'Schwerlastanker für Beton', pl: 'Kotwa do betonu o dużej nośności' },
  'Hex bolt with nut & washers': { uk: "Шестигранний болт з гайкою та шайбами", de: 'Sechskantschraube mit Mutter und Scheiben', pl: 'Śruba z łbem sześciokątnym z nakrętką i podkładkami' },
  'Angle bracket with rib 90×90×65': { uk: 'Кутовий кронштейн з ребром 90×90×65', de: 'Winkelverbinder mit Rippe 90×90×65', pl: 'Kątownik z przetłoczeniem 90×90×65' },
  'Connector nails': { uk: 'Кріпильні цвяхи', de: 'Kammnägel', pl: 'Gwoździe do łączników' },
  'Rafter–purlin anchor': { uk: 'Анкер кроква–прогон', de: 'Sparren-Pfetten-Anker', pl: 'Łącznik krokiew–płatew' },
  'Structural screws, countersunk': { uk: 'Конструкційні шурупи, потайна головка', de: 'Konstruktionsschrauben, Senkkopf', pl: 'Wkręty konstrukcyjne, łeb stożkowy' },
  'Structural screws (side posts → rail)': { uk: "Конструкційні шурупи (бічні стовпи → обв'язка)", de: 'Konstruktionsschrauben (Seitenpfosten → Rähm)', pl: 'Wkręty konstrukcyjne (słupy boczne → oczep)' },
  'Wood screws (toe-screwed studs)': { uk: 'Шурупи по дереву (стійки навскоси)', de: 'Holzbauschrauben (Ständer schräg verschraubt)', pl: 'Wkręty do drewna (słupki przykręcane ukośnie)' },
  'Structural screws (headers & sills)': { uk: 'Конструкційні шурупи (перемички та підвіконні ригелі)', de: 'Konstruktionsschrauben (Stürze & Brüstungsriegel)', pl: 'Wkręty konstrukcyjne (nadproża i podokienniki)' },
  "Frame anchors (bottom plate → slab)": { uk: "Рамні анкери (нижня обв'язка → плита)", de: 'Rahmendübel (Schwelle → Bodenplatte)', pl: 'Kotwy ramowe (podwalina → płyta)' },
  'Splice bolts with washers': { uk: 'Болти стику з шайбами', de: 'Stoßverschraubung mit Scheiben', pl: 'Śruby łączące z podkładkami' },
  'Flat connector plates': { uk: "Плоскі з'єднувальні пластини", de: 'Flachverbinder', pl: 'Płaskie płytki łączące' },
  'Stainless cladding screws': { uk: 'Нержавіючі шурупи для обшивки', de: 'Fassadenschrauben aus Edelstahl', pl: 'Nierdzewne wkręty do okładzin' },
  'Self-drilling sheet screws with EPDM washer': { uk: 'Самонарізні шурупи для листів з шайбою EPDM', de: 'Bohrschrauben mit EPDM-Dichtscheibe', pl: 'Wkręty samowiercące do blachy z podkładką EPDM' },
  'Panel fixings with sealing caps': { uk: 'Кріплення для панелей з ущільнювальними ковпачками', de: 'Stegplatten-Befestiger mit Dichtkappen', pl: 'Mocowania płyt z kapturkami uszczelniającymi' },
  'Roofing nails, galvanised': { uk: 'Покрівельні цвяхи, оцинковані', de: 'Dachpappnägel, verzinkt', pl: 'Gwoździe papowe, ocynkowane' },
  'OSB deck screws': { uk: 'Шурупи для настилу OSB', de: 'OSB-Schalungsschrauben', pl: 'Wkręty do deskowania OSB' },
  'Flooring panel screws': { uk: 'Шурупи для підлогових панелей', de: 'Schrauben für Fußbodenplatten', pl: 'Wkręty do płyt podłogowych' },
  'Floorboard screws': { uk: 'Шурупи для дощок підлоги', de: 'Dielenschrauben', pl: 'Wkręty do desek podłogowych' },
  'Point foundation with adjustable beam support': { uk: 'Точковий фундамент з регульованою опорою балки', de: 'Punktfundament mit U-Stützenfuß', pl: 'Fundament punktowy z regulowaną podstawą belki' },
  'Structural screws (joist → bearer)': { uk: 'Конструкційні шурупи (лага → опорна балка)', de: 'Konstruktionsschrauben (Balken → Unterzug)', pl: 'Wkręty konstrukcyjne (legar → podciąg)' },
  'Rubber levelling pads': { uk: 'Гумові вирівнюючі прокладки', de: 'Terrassenpads / Unterlegplatten', pl: 'Gumowe podkładki poziomujące' },
  'Angle brackets with concrete screws (sleeper → slab)': { uk: 'Кутові кронштейни з бетонними шурупами (лага → плита)', de: 'Winkelverbinder mit Betonschrauben (Lagerholz → Bodenplatte)', pl: 'Kątowniki z wkrętami do betonu (legar → płyta)' },
  'Stainless decking screws': { uk: 'Нержавіючі шурупи для тераси', de: 'Terrassenschrauben aus Edelstahl', pl: 'Nierdzewne wkręty tarasowe' },
  'Batten nails, galvanised': { uk: 'Цвяхи для обрешітки, оцинковані', de: 'Lattennägel, verzinkt', pl: 'Gwoździe do łat, ocynkowane' },
  'Door fitting kit': { uk: 'Комплект для монтажу дверей', de: 'Türmontage-Set', pl: 'Zestaw montażowy drzwi' },
  'Window fitting kit': { uk: 'Комплект для монтажу вікна', de: 'Fenstermontage-Set', pl: 'Zestaw montażowy okna' },

  'Mortise & tenon post → purlin': { uk: 'Шип і паз, стовп → прогон', de: 'Zapfenverbindung Pfosten–Pfette', pl: 'Połączenie czopowe słup → płatew' },
  'Oak pegs Ø 20 mm': { uk: 'Дубові нагелі Ø 20 мм', de: 'Holznägel Ø 20 mm', pl: 'Kołki dębowe Ø 20 mm' },
  'Bevelled seat (level rafter on sloped purlin)': { uk: 'Скошене гніздо (горизонтальна кроква на похилому прогоні)', de: 'Auflager geschrägt', pl: 'Oparcie ścięte (pozioma krokiew na pochyłej płatwi)' },
  'Birdsmouth seat (rafter on purlin)': { uk: 'Врубка (кроква на прогоні)', de: 'Kerve', pl: 'Wrąb (krokiew na płatwi)' },
  'Knee brace tenons (both ends)': { uk: 'Шипи підкосу (з обох кінців)', de: 'Kopfband-Zapfen', pl: 'Czopy mieczy (oba końce)' },
  'Hooked scarf joint (purlin splice)': { uk: 'Гачковий стик (сполучення прогону)', de: 'Hakenblatt', pl: 'Zamek hakowy (łączenie płatwi)' },
  'Half-lap side rail → post': { uk: "Напівзамкове з'єднання, бічна обв'язка → стовп", de: 'Überblattung Rähm–Pfosten', pl: 'Nakładka połówkowa oczep boczny → słup' },
  "Stud tenons into plate & rail": { uk: "Шипи стійок в обв'язку та ригель", de: 'Ständerzapfen', pl: 'Czopy słupków w podwalinie i oczepie' },
  'Housed headers & sills': { uk: 'Врізані перемички та підвіконні ригелі', de: 'Eingelassene Stürze/Riegel', pl: 'Wpuszczane nadproża i podokienniki' },
  'Rafter screws (secures seat)': { uk: 'Шурупи крокви (фіксують гніздо)', de: 'Sparrenschrauben (sichern Auflager)', pl: 'Wkręty do krokwi (zabezpieczają oparcie)' },
  'Rafter screws (secures birdsmouth)': { uk: 'Шурупи крокви (фіксують врубку)', de: 'Sparrenschrauben (sichern Kerve)', pl: 'Wkręty do krokwi (zabezpieczają wrąb)' },
  'Scarf joint bolts': { uk: 'Болти стикового з\'єднання', de: 'Stoßverschraubung', pl: 'Śruby zamka ciesielskiego' },

  'for {w}×{h} mm': { uk: 'для {w}×{h} мм', de: 'für {w}×{h} mm', pl: 'do {w}×{h} mm' },
  '170 mm, left/right alternating': { uk: 'ліворуч/праворуч почергово, 170 мм', de: '170 mm, wechselseitig links/rechts', pl: '170 mm, naprzemiennie z lewej/prawej' },
  '40×40×80 cm concrete + U-support': { uk: '40×40×80 см бетон + U-опора', de: '40×40×80 cm Beton + U-Stützenfuß', pl: 'Beton 40×40×80 cm + podpora U' },
  'Compression tape, PU foam, frame screws, threshold, drip cap': {
    uk: 'Компресійна стрічка, монтажна піна, шурупи для рами, поріг, крапельник',
    de: 'Kompriband, PU-Schaum, Rahmenschrauben, Schwelle, Tropfkante',
    pl: 'Taśma rozprężna, pianka PU, kotwy ramowe, próg, okapnik',
  },
  'Compression tape, PU foam, frame screws, sills, drip cap, cover strips': {
    uk: 'Компресійна стрічка, монтажна піна, шурупи для рами, підвіконники, крапельник, накривні планки',
    de: 'Kompriband, PU-Schaum, Rahmenschrauben, Fensterbänke, Tropfkante, Deckleisten',
    pl: 'Taśma rozprężna, pianka PU, kotwy ramowe, parapety, okapnik, listwy maskujące',
  },
  'Tenon 40 mm thick, 60 mm long, secured with oak peg': {
    uk: 'Шип 40 мм завтовшки, 60 мм завдовжки, закріплений дубовим нагелем',
    de: 'Zapfen 40 mm dick, 60 mm lang, mit Holznagel gesichert',
    pl: 'Czop grub. 40 mm, dł. 60 mm, zabezpieczony kołkiem dębowym',
  },
  '{n}° bevel': { uk: 'скіс {n}°', de: '{n}° Schräge', pl: 'ścięcie {n}°' },
  '{n} mm deep': { uk: '{n} мм завглибшки', de: '{n} mm tief', pl: 'głęb. {n} mm' },
  'Stub tenon with peg': { uk: 'Короткий шип з нагелем', de: 'Kurzzapfen mit Holznagel', pl: 'Krótki czop z kołkiem' },
  'Located over a post, bolted M12': { uk: 'Розташований над стовпом, скріплений болтом M12', de: 'Über einem Pfosten liegend, mit M12 verschraubt', pl: 'Nad słupem, skręcony śrubami M12' },

  '1 per post base, min. 100 mm embedment': { uk: 'по 1 на опору стовпа, мін. заглиблення 100 мм', de: '1 je Pfostenträger, min. 100 mm Einbindetiefe', pl: '1 na kotwę słupa, min. 100 mm zakotwienia' },
  '2 per post base': { uk: 'по 2 на опору стовпа', de: '2 je Pfostenträger', pl: '2 na kotwę słupa' },
  "2 per post–purlin connection": { uk: "по 2 на з'єднання стовп–прогон", de: '2 je Verbindung Pfosten–Pfette', pl: '2 na połączenie słup–płatew' },
  '1 per rafter bearing': { uk: 'по 1 на опору крокви', de: '1 je Sparrenauflager', pl: '1 na oparcie krokwi' },
  '2 per brace end': { uk: 'по 2 на кінець підкосу', de: '2 je Kopfbandende', pl: '2 na koniec miecza' },
  '2 per stud end': { uk: 'по 2 на кінець стійки', de: '2 je Ständerende', pl: '2 na koniec słupka' },
  'Max. 800 mm apart, 150 mm from plate ends': { uk: "макс. 800 мм між собою, 150 мм від кінців обв'язки", de: 'max. 800 mm Abstand, 150 mm von den Schwellenenden', pl: 'Maks. co 800 mm, 150 mm od końców podwaliny' },
  '≈ 25 per m²': { uk: '≈ 25 на м²', de: '≈ 25 je m²', pl: '≈ 25 na m²' },
  '≈ 8 per m²': { uk: '≈ 8 на м²', de: '≈ 8 je m²', pl: '≈ 8 na m²' },
  '≈ 6 per m²': { uk: '≈ 6 на м²', de: '≈ 6 je m²', pl: '≈ 6 na m²' },
  '≈ 50 per m²': { uk: '≈ 50 на м²', de: '≈ 50 je m²', pl: '≈ 50 na m²' },
  '1 per bearer support': { uk: 'по 1 на опору балки', de: '1 je Unterzugstütze', pl: '1 na podporę podciągu' },
  '2 per crossing': { uk: 'по 2 на перетин', de: '2 je Kreuzung', pl: '2 na skrzyżowanie' },
  '1 per sleeper support': { uk: 'по 1 на опору лаги', de: '1 je Lagerholzstütze', pl: '1 na podporę legara' },
  '2 per sleeper': { uk: 'по 2 на лагу', de: '2 je Lagerholz', pl: '2 na legar' },
  '2 per board per joist': { uk: 'по 2 на дошку на лагу', de: '2 je Brett und Balken', pl: '2 na deskę na legar' },
  '1 per door': { uk: 'по 1 на двері', de: '1 je Tür', pl: '1 na drzwi' },
  '1 per window': { uk: 'по 1 на вікно', de: '1 je Fenster', pl: '1 na okno' },
  '2 per batten crossing': { uk: 'по 2 на перетин рейки', de: '2 je Lattenkreuzung', pl: '2 na skrzyżowanie łat' },

  // ---------------------------------------------------------------------------------------
  // engine/vehicles.ts — vehicle catalogue and fit-check messages
  // ---------------------------------------------------------------------------------------
  '{model} – city car': { uk: '{model} – міське авто', de: '{model} – Kleinstwagen', pl: '{model} – samochód miejski' },
  '{model} – compact': { uk: '{model} – компактний клас', de: '{model} – Kompaktklasse', pl: '{model} – kompakt' },
  '{model} – sedan': { uk: '{model} – седан', de: '{model} – Limousine', pl: '{model} – sedan' },
  '{model} – estate': { uk: '{model} – універсал', de: '{model} – Kombi', pl: '{model} – kombi' },
  '{model} – SUV': { uk: '{model} – позашляховик', de: '{model} – SUV', pl: '{model} – SUV' },
  '{model} – crossover SUV': { uk: '{model} – кросовер (SUV)', de: '{model} – Crossover-SUV', pl: '{model} – crossover SUV' },
  '{model} – large SUV': { uk: '{model} – великий позашляховик', de: '{model} – große SUV', pl: '{model} – duży SUV' },
  '{model} – van': { uk: '{model} – мінівен', de: '{model} – Van', pl: '{model} – van' },
  '{model} – pickup': { uk: '{model} – пікап', de: '{model} – Pickup', pl: '{model} – pickup' },
  '{model} – camper van': { uk: '{model} – автодім (кемпер)', de: '{model} – Wohnmobil', pl: '{model} – kamper' },
  '{model} – panel van': { uk: '{model} – фургон', de: '{model} – Kastenwagen', pl: '{model} – furgon' },

  'Motorcycle – touring': { uk: 'Мотоцикл – туристичний', de: 'Motorrad – Tourer', pl: 'Motocykl – turystyczny' },
  'Bicycle – city / trekking': { uk: 'Велосипед – міський / трекінговий', de: 'Fahrrad – Stadt / Trekking', pl: 'Rower – miejski / trekking' },
  'Waste bin 120 L': { uk: 'Смітник 120 л', de: 'Mülltonne 120 L', pl: 'Pojemnik na odpady 120 L' },
  'Waste bin 240 L': { uk: 'Смітник 240 л', de: 'Mülltonne 240 L', pl: 'Pojemnik na odpady 240 L' },
  'Waste container 1100 L': { uk: 'Сміттєвий контейнер 1100 л', de: 'Müllcontainer 1100 L', pl: 'Kontener na odpady 1100 L' },
  'Lawn mower – push / electric': { uk: 'Газонокосарка – ручна / електрична', de: 'Rasenmäher – Hand-/Elektromäher', pl: 'Kosiarka – pchana / elektryczna' },
  'Ride-on lawn mower': { uk: 'Райдер (косарка з сидінням)', de: 'Aufsitzmäher', pl: 'Traktorek ogrodowy' },
  'Wheelbarrow': { uk: 'Тачка', de: 'Schubkarre', pl: 'Taczka' },
  'Tool shelf (free size)': { uk: 'Стелаж для інструментів (довільний розмір)', de: 'Werkzeugregal (freie Größe)', pl: 'Regał na narzędzia (dowolny rozmiar)' },
  'Table (free size)': { uk: 'Стіл (довільний розмір)', de: 'Tisch (freie Größe)', pl: 'Stół (dowolny rozmiar)' },
  'Workbench (free size)': { uk: 'Верстак (довільний розмір)', de: 'Werkbank (freie Größe)', pl: 'Stół warsztatowy (dowolny rozmiar)' },
  'Garden bench': { uk: 'Садова лавка', de: 'Gartenbank', pl: 'Ławka ogrodowa' },
  'Firewood stack (free size)': { uk: 'Штабель дров (довільний розмір)', de: 'Brennholzstapel (freie Größe)', pl: 'Stos drewna opałowego (dowolny rozmiar)' },
  'Storage box / crate (free size)': { uk: 'Ящик для зберігання (довільний розмір)', de: 'Aufbewahrungsbox / Kiste (freie Größe)', pl: 'Pojemnik / skrzynia (dowolny rozmiar)' },
  'Rain barrel 300 L (free size)': { uk: 'Бочка для дощової води 300 л (довільний розмір)', de: 'Regentonne 300 L (freie Größe)', pl: 'Beczka na deszczówkę 300 L (dowolny rozmiar)' },
  'IBC water tank 1000 L': { uk: 'Резервуар IBC для води 1000 л', de: 'IBC-Wassertank 1000 L', pl: 'Zbiornik IBC na wodę 1000 L' },
  'Ladder – leaning (free size)': { uk: 'Драбина приставна (довільний розмір)', de: 'Anlegeleiter (freie Größe)', pl: 'Drabina przystawna (dowolny rozmiar)' },
  'Gas grill with side tables': { uk: 'Газовий гриль з бічними столиками', de: 'Gasgrill mit Seitentischen', pl: 'Grill gazowy z bocznymi blatami' },
  'Kettle grill Ø 570': { uk: 'Гриль-кетл Ø 570', de: 'Kugelgrill Ø 570', pl: 'Grill kulisty Ø 570' },

  'Cars (Pkw)': { uk: 'Легкові авто', de: 'Pkw', pl: 'Samochody osobowe (Pkw)' },
  'Vans & pickups (Transporter)': { uk: 'Фургони та пікапи', de: 'Transporter', pl: 'Busy i pickupy (Transporter)' },
  'Two-wheelers (Zweiräder)': { uk: 'Двоколісні', de: 'Zweiräder', pl: 'Jednoślady (Zweiräder)' },
  'Waste bins (Mülltonnen)': { uk: 'Сміттєві контейнери', de: 'Mülltonnen', pl: 'Pojemniki na odpady (Mülltonnen)' },
  'Garden tools (Gartengeräte)': { uk: 'Садовий інвентар', de: 'Gartengeräte', pl: 'Narzędzia ogrodowe (Gartengeräte)' },
  'Furniture & workshop (Möbel)': { uk: 'Меблі та майстерня', de: 'Möbel', pl: 'Meble i warsztat (Möbel)' },
  'Storage (Lager)': { uk: 'Зберігання', de: 'Lager', pl: 'Przechowywanie (Lager)' },
  'Water (Wasser)': { uk: 'Вода', de: 'Wasser', pl: 'Woda (Wasser)' },
  'Leisure (Freizeit)': { uk: 'Відпочинок', de: 'Freizeit', pl: 'Rekreacja (Freizeit)' },

  'Fits.': { uk: 'Підходить.', de: 'Passt.', pl: 'Pasuje.' },
  'Not under the roof.': { uk: 'Не під дахом.', de: 'Nicht unter dem Dach.', pl: 'Nie pod dachem.' },
  'Sticks out of the roof by {n} mm.': { uk: 'Виступає за межі даху на {n} мм.', de: 'Ragt {n} mm über das Dach hinaus.', pl: 'Wystaje poza dach o {n} mm.' },
  'Collides with a post (mirror width).': { uk: 'Перетинається зі стовпом (за шириною з дзеркалами).', de: 'Kollidiert mit einem Pfosten (Breite mit Spiegeln).', pl: 'Koliduje ze słupem (szerokość z lusterkami).' },
  'Crosses closed wall: {walls}.': { uk: 'Перетинає закриту стіну: {walls}.', de: 'Kreuzt geschlossene Wand: {walls}.', pl: 'Przecina zamkniętą ścianę: {walls}.' },
  'Too tall: {n} mm short under the {obstacle}.': { uk: 'Занадто високий: не вистачає {n} мм під {obstacle}.', de: 'Zu hoch: {n} mm zu wenig unter {obstacle}.', pl: 'Za wysoki: brakuje {n} mm pod {obstacle}.' },
  'Tight headroom: only {n} mm under the {obstacle}.': { uk: 'Обмежена висота: лише {n} мм під {obstacle}.', de: 'Knappe Kopfhöhe: nur {n} mm unter {obstacle}.', pl: 'Mało miejsca nad głową: tylko {n} mm pod {obstacle}.' },
  'Headroom {n} mm under the {obstacle}.': { uk: 'Висота {n} мм під {obstacle}.', de: 'Kopfhöhe {n} mm unter {obstacle}.', pl: 'Prześwit {n} mm pod {obstacle}.' },

  rafters: { uk: 'кроквами', de: 'den Sparren', pl: 'krokwiami' },
  'front purlin': { uk: 'переднім прогоном', de: 'der vorderen Pfette', pl: 'przednią płatwią' },
  'rear purlin': { uk: 'заднім прогоном', de: 'der hinteren Pfette', pl: 'tylną płatwią' },
  'left purlin': { uk: 'лівим прогоном', de: 'der linken Pfette', pl: 'lewą płatwią' },
  'right purlin': { uk: 'правим прогоном', de: 'der rechten Pfette', pl: 'prawą płatwią' },
  'mid purlin': { uk: 'середнім прогоном', de: 'der mittleren Pfette', pl: 'środkową płatwią' },
  'knee brace at front purlin': { uk: 'підкосом при передньому прогоні', de: 'dem Kopfband an der vorderen Pfette', pl: 'mieczem przy przedniej płatwi' },
  'knee brace at rear purlin': { uk: 'підкосом при задньому прогоні', de: 'dem Kopfband an der hinteren Pfette', pl: 'mieczem przy tylnej płatwi' },
  'knee brace at left purlin': { uk: 'підкосом при лівому прогоні', de: 'dem Kopfband an der linken Pfette', pl: 'mieczem przy lewej płatwi' },
  'knee brace at right purlin': { uk: 'підкосом при правому прогоні', de: 'dem Kopfband an der rechten Pfette', pl: 'mieczem przy prawej płatwi' },
  'knee brace at mid purlin': { uk: 'підкосом при середньому прогоні', de: 'dem Kopfband an der mittleren Pfette', pl: 'mieczem przy środkowej płatwi' },

  // ---------------------------------------------------------------------------------------
  // engine/paving.ts
  // ---------------------------------------------------------------------------------------
  'Stretcher bond (Läuferverband)': { uk: 'Кладка вперев’язку (Läuferverband)', de: 'Läuferverband', pl: 'Wiązanie wozówkowe (Läuferverband)' },
  'Stack bond (Reihenverband)': { uk: 'Рядова кладка (Reihenverband)', de: 'Reihenverband', pl: 'Wiązanie proste (Reihenverband)' },
  'Herringbone (Fischgrät)': { uk: 'Ялинка (Fischgrät)', de: 'Fischgrät', pl: 'Jodełka (Fischgrät)' },

  // ---------------------------------------------------------------------------------------
  // engine/freePosts.ts
  // ---------------------------------------------------------------------------------------
  'Top cut to purlin slope': { uk: 'Верхній зріз під ухил прогону', de: 'Kopfschnitt schräg zur Pfette', pl: 'Górne cięcie pod spadek płatwi' },
  'Under purlin': { uk: 'Під прогоном', de: 'Unter der Pfette', pl: 'Pod płatwią' },
  'Top cut to rafter underside': { uk: 'Верхній зріз під низ крокви', de: 'Kopfschnitt an Sparrenunterkante', pl: 'Górne cięcie do spodu krokwi' },

  // ---------------------------------------------------------------------------------------
  // engine/pricing/index.ts
  // ---------------------------------------------------------------------------------------
  'Roof deck (OSB, under covering)': { uk: 'Обрешітка даху (OSB, під покриттям)', de: 'Dachschalung (OSB)', pl: 'Deskowanie dachu (OSB, pod pokryciem)' },
  'Custom door, made to measure': { uk: 'Двері на замовлення (за розміром)', de: 'Maßgefertigte Tür', pl: 'Drzwi niestandardowe, na wymiar' },
  'Custom window, made to measure': { uk: 'Вікно на замовлення (за розміром)', de: 'Maßgefertigtes Fenster', pl: 'Okno niestandardowe, na wymiar' },
} satisfies Dict;
