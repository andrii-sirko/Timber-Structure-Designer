import type { Dict } from '../core';

/**
 * Strings produced by the statics engine (src/engine/statics/*): check element names,
 * detail/recommendation sentences, auto-fix change labels, and material/covering names
 * defined in materials.ts. tx() matches these as templates or sentence-by-sentence, so most
 * entries mirror one clause of a larger detail/recommendation string.
 */
export default {
  // ── Axis labels (shared by several element / detail templates) ──────────────────────────
  'along the length (X)': { uk: 'уздовж довжини (X)', de: 'entlang der Länge (X)', pl: 'wzdłuż długości (X)' },
  'across (Z)': { uk: 'впоперек (Z)', de: 'quer (Z)', pl: 'w poprzek (Z)' },
  'along the length (X) and across (Z)': { uk: 'уздовж довжини (X) та впоперек (Z)', de: 'entlang der Länge (X) und quer (Z)', pl: 'wzdłuż długości (X) i w poprzek (Z)' },
  '{combo} across (Z)': { uk: '{combo} впоперек (Z)', de: '{combo} quer (Z)', pl: '{combo} w poprzek (Z)' },
  '{combo} along the length (X)': { uk: '{combo} уздовж довжини (X)', de: '{combo} entlang der Länge (X)', pl: '{combo} wzdłuż długości (X)' },
  'front + rear': { uk: 'передню + задню', de: 'vordere + hintere', pl: 'przód + tył' },
  'rear + front': { uk: 'задню + передню', de: 'hintere + vordere', pl: 'tył + przód' },
  'left + right': { uk: 'ліву + праву', de: 'linke + rechte', pl: 'lewa + prawa' },
  'right + left': { uk: 'праву + ліву', de: 'rechte + linke', pl: 'prawa + lewa' },

  // ── Element names ─────────────────────────────────────────────────────────────────────
  Rafter: { uk: 'Кроква', de: 'Sparren', pl: 'Krokiew' },
  'Purlin {side}': { uk: 'Прогон {side}', de: 'Pfette {side}', pl: 'Płatew {side}' },
  'Purlin mid': { uk: 'Проміжний прогон', de: 'Mittelpfette', pl: 'Płatew środkowa' },
  'Post {side}': { uk: 'Стовп {side}', de: 'Pfosten {side}', pl: 'Słup {side}' },
  'Post mid': { uk: 'Стовп середній', de: 'Pfosten mitte', pl: 'Słup środkowy' },
  'Knee braces {axis}': { uk: 'Підкоси {axis}', de: 'Kopfbänder {axis}', pl: 'Miecze {axis}' },
  'Sway posts {axis}': { uk: 'Консольні стовпи {axis}', de: 'Eingespannte Pfosten {axis}', pl: 'Słupy utwierdzone {axis}' },
  'Boarded wall {axis}': { uk: 'Обшита стіна {axis}', de: 'Wandscheibe {axis}', pl: 'Ściana poszyta {axis}' },
  'Roof uplift / anchoring': { uk: 'Відрив даху / кріплення', de: 'Abhebesicherung des Dachs', pl: 'Odrywanie dachu / zakotwienie' },
  'Floor joist': { uk: 'Лага підлоги', de: 'Fußbodenbalken', pl: 'Legar podłogi' },
  Sleeper: { uk: 'Лага', de: 'Lagerholz', pl: 'Legar na płycie' },
  'Floor bearer': { uk: 'Опорна балка підлоги', de: 'Unterzug', pl: 'Podciąg podłogi' },
  partition: { uk: 'перегородка', de: 'Trennwand', pl: 'ściana działowa' },
  'Header {opening} ({wall})': { uk: 'Перемичка {opening} ({wall})', de: 'Sturz {opening} ({wall})', pl: 'Nadproże {opening} ({wall})' },
  'Header ({wall})': { uk: 'Перемичка ({wall})', de: 'Sturz ({wall})', pl: 'Nadproże ({wall})' },

  // ── Rafter ────────────────────────────────────────────────────────────────────────────
  'Increase rafters to {dims}, or reduce rafter spacing / the max rafter length (adds a mid purlin).': {
    uk: 'Збільште перерізи крокв до {dims}, або зменшіть крок крокв / максимальну довжину крокви (додасть проміжний прогон).',
    de: 'Vergrößern Sie die Sparren auf {dims}, oder verringern Sie den Sparrenabstand / die max. Sparrenlänge (fügt eine Zwischenpfette hinzu).',
    pl: 'Zwiększ krokwie do {dims} albo zmniejsz rozstaw krokwi / maks. długość krokwi (doda płatew pośrednią).',
  },
  'Reduce the max rafter length to add an intermediate purlin row and halve the rafter span.': {
    uk: 'Зменшіть максимальну довжину крокви, щоб додати проміжний ряд прогонів і зменшити проліт крокви вдвічі.',
    de: 'Verringern Sie die max. Sparrenlänge, um eine zusätzliche Pfettenreihe einzufügen und die Sparrenspannweite zu halbieren.',
    pl: 'Zmniejsz maks. długość krokwi, aby dodać pośredni rząd płatwi i o połowę skrócić rozpiętość krokwi.',
  },
  'Simply supported on both purlins, span {span} m ({slope}), spacing {spacing} mm, cantilever {cant} mm.': {
    uk: 'Просто обпертий на обидва прогони, проліт {span} m ({slope}), крок {spacing} mm, консоль {cant} mm.',
    de: 'Einfach gelagert auf beiden Pfetten, Spannweite {span} m ({slope}), Abstand {spacing} mm, Kragarm {cant} mm.',
    pl: 'Swobodnie podparta na obu płatwiach, rozpiętość {span} m ({slope}), rozstaw {spacing} mm, wspornik {cant} mm.',
  },
  'Supported on {n} purlin rows, governing bay treated as simply supported (conservative), span {span} m ({slope}), spacing {spacing} mm, cantilever {cant} mm.': {
    uk: 'Обпертий на {n} рядів прогонів, розрахунковий проліт прийнято просто обпертим (в запас міцності), проліт {span} m ({slope}), крок {spacing} mm, консоль {cant} mm.',
    de: 'Gelagert auf {n} Pfettenreihen, maßgebendes Feld konservativ als einfach gelagert angenommen, Spannweite {span} m ({slope}), Abstand {spacing} mm, Kragarm {cant} mm.',
    pl: 'Podparta na {n} rzędach płatwi, miarodajne przęsło przyjęte jako swobodnie podparte (zachowawczo), rozpiętość {span} m ({slope}), rozstaw {spacing} mm, wspornik {cant} mm.',
  },
  level: { uk: 'горизонтально', de: 'eben', pl: 'poziomo' },
  sloped: { uk: 'похило', de: 'geneigt', pl: 'ukośnie' },
  'Governing {combo}: σ_m,d = {sigma} ≤ f_m,d = {fmd} N/mm² ({p1}), shear {p2}, w_fin = {wfin} mm ≤ {wlim} mm.': {
    uk: 'Визначальне {combo}: σ_m,d = {sigma} ≤ f_m,d = {fmd} N/mm² ({p1}), зсув {p2}, w_fin = {wfin} mm ≤ {wlim} mm.',
    de: 'Maßgebend {combo}: σ_m,d = {sigma} ≤ f_m,d = {fmd} N/mm² ({p1}), Schub {p2}, w_fin = {wfin} mm ≤ {wlim} mm.',
    pl: 'Miarodajne {combo}: σ_m,d = {sigma} ≤ f_m,d = {fmd} N/mm² ({p1}), ścinanie {p2}, w_fin = {wfin} mm ≤ {wlim} mm.',
  },

  // ── Purlin ────────────────────────────────────────────────────────────────────────────
  '{row} rests on 1 post – a purlin row needs at least two posts.': {
    uk: '{row} спирається на 1 стовп – ряду прогону потрібно щонайменше два стовпи.',
    de: '{row} liegt auf 1 Pfosten auf – eine Pfettenreihe benötigt mindestens zwei Pfosten.',
    pl: '{row} opiera się na 1 słupie – rząd płatwi wymaga co najmniej dwóch słupów.',
  },
  '{row} rests on {n} posts – a purlin row needs at least two posts.': {
    uk: '{row} спирається на {n} стовпів – ряду прогону потрібно щонайменше два стовпи.',
    de: '{row} liegt auf {n} Pfosten auf – eine Pfettenreihe benötigt mindestens zwei Pfosten.',
    pl: '{row} opiera się na {n} słupach – rząd płatwi wymaga co najmniej dwóch słupów.',
  },
  'Increase purlins to {dims}, reduce the max. post spacing.': {
    uk: 'Збільште перерізи прогонів до {dims}, зменшіть максимальний крок стовпів.',
    de: 'Vergrößern Sie die Pfetten auf {dims}, verringern Sie den max. Pfostenabstand.',
    pl: 'Zwiększ płatwie do {dims}, zmniejsz maks. rozstaw słupów.',
  },
  'Increase purlins to {dims}, reduce the max. post spacing or enable knee braces.': {
    uk: 'Збільште перерізи прогонів до {dims}, зменшіть максимальний крок стовпів або увімкніть підкоси.',
    de: 'Vergrößern Sie die Pfetten auf {dims}, verringern Sie den max. Pfostenabstand oder aktivieren Sie Kopfbänder.',
    pl: 'Zwiększ płatwie do {dims}, zmniejsz maks. rozstaw słupów lub włącz miecze.',
  },
  'Reduce the maximum post spacing (add posts).': {
    uk: 'Зменшіть максимальний крок стовпів (додайте стовпи).',
    de: 'Verringern Sie den max. Pfostenabstand (fügen Sie Pfosten hinzu).',
    pl: 'Zmniejsz maksymalny rozstaw słupów (dodaj słupy).',
  },
  'Only {n} post in this row – no supported span.': {
    uk: 'Лише {n} стовп у цьому ряду – проліт не забезпечено.',
    de: 'Nur {n} Pfosten in dieser Reihe – keine gestützte Spannweite.',
    pl: 'Tylko {n} słup w tym rzędzie – brak podpartej rozpiętości.',
  },
  'Governing span {span} m, {posts} posts, simply supported (conservative), tributary width {trib} m, end cantilever {cant} mm': {
    uk: 'Визначальний проліт {span} m, {posts} стовпів, просто обпертий (в запас міцності), вантажна ширина {trib} m, кінцева консоль {cant} mm',
    de: 'Maßgebende Spannweite {span} m, {posts} Pfosten, einfach gelagert (konservativ), Einzugsbreite {trib} m, Endkragarm {cant} mm',
    pl: 'Miarodajna rozpiętość {span} m, {posts} słupów, swobodnie podparta (zachowawczo), szerokość zbierania {trib} m, wspornik końcowy {cant} mm',
  },
  'Governing span {span} m (sloped), {posts} posts, simply supported (conservative), tributary width {trib} m, end cantilever {cant} mm': {
    uk: 'Визначальний проліт {span} m (похило), {posts} стовпів, просто обпертий (в запас міцності), вантажна ширина {trib} m, кінцева консоль {cant} mm',
    de: 'Maßgebende Spannweite {span} m (geneigt), {posts} Pfosten, einfach gelagert (konservativ), Einzugsbreite {trib} m, Endkragarm {cant} mm',
    pl: 'Miarodajna rozpiętość {span} m (ukośnie), {posts} słupów, swobodnie podparta (zachowawczo), szerokość zbierania {trib} m, wspornik końcowy {cant} mm',
  },
  'Governing span {span} m ({raw} m between posts, 1 knee brace credited with {pct} % of the {leg} mm leg), {posts} posts, simply supported (conservative), tributary width {trib} m, end cantilever {cant} mm': {
    uk: 'Визначальний проліт {span} m ({raw} m між стовпами, 1 підкіс враховано як {pct} % катета {leg} mm), {posts} стовпів, просто обпертий (в запас міцності), вантажна ширина {trib} m, кінцева консоль {cant} mm',
    de: 'Maßgebende Spannweite {span} m ({raw} m zwischen den Pfosten, 1 Kopfband mit {pct} % der {leg} mm langen Strebe angesetzt), {posts} Pfosten, einfach gelagert (konservativ), Einzugsbreite {trib} m, Endkragarm {cant} mm',
    pl: 'Miarodajna rozpiętość {span} m ({raw} m między słupami, 1 miecz uwzględniony z {pct} % ramienia {leg} mm), {posts} słupów, swobodnie podparta (zachowawczo), szerokość zbierania {trib} m, wspornik końcowy {cant} mm',
  },
  'Governing span {span} m ({raw} m between posts, {n} knee braces credited with {pct} % of the {leg} mm leg), {posts} posts, simply supported (conservative), tributary width {trib} m, end cantilever {cant} mm': {
    uk: 'Визначальний проліт {span} m ({raw} m між стовпами, {n} підкоси враховано як {pct} % катета {leg} mm), {posts} стовпів, просто обпертий (в запас міцності), вантажна ширина {trib} m, кінцева консоль {cant} mm',
    de: 'Maßgebende Spannweite {span} m ({raw} m zwischen den Pfosten, {n} Kopfbänder mit {pct} % der {leg} mm langen Strebe angesetzt), {posts} Pfosten, einfach gelagert (konservativ), Einzugsbreite {trib} m, Endkragarm {cant} mm',
    pl: 'Miarodajna rozpiętość {span} m ({raw} m między słupami, {n} mieczy uwzględnionych z {pct} % ramienia {leg} mm), {posts} słupów, swobodnie podparta (zachowawczo), szerokość zbierania {trib} m, wspornik końcowy {cant} mm',
  },
  'Governing {combo}: σ_m,d = {sigma} ≤ {fmd} N/mm² ({p1}), w_fin = {wfin} mm ≤ {wlim} mm.': {
    uk: 'Визначальне {combo}: σ_m,d = {sigma} ≤ {fmd} N/mm² ({p1}), w_fin = {wfin} mm ≤ {wlim} mm.',
    de: 'Maßgebend {combo}: σ_m,d = {sigma} ≤ {fmd} N/mm² ({p1}), w_fin = {wfin} mm ≤ {wlim} mm.',
    pl: 'Miarodajne {combo}: σ_m,d = {sigma} ≤ {fmd} N/mm² ({p1}), w_fin = {wfin} mm ≤ {wlim} mm.',
  },

  // ── Posts ─────────────────────────────────────────────────────────────────────────────
  'Use {dims} posts or add posts to reduce the load per post.': {
    uk: 'Використайте стовпи {dims} або додайте стовпи, щоб зменшити навантаження на кожен стовп.',
    de: 'Verwenden Sie {dims} Pfosten oder fügen Sie Pfosten hinzu, um die Last je Pfosten zu verringern.',
    pl: 'Użyj słupów {dims} lub dodaj słupy, aby zmniejszyć obciążenie na słup.',
  },
  'Add posts to reduce the load per post.': {
    uk: 'Додайте стовпи, щоб зменшити навантаження на кожен стовп.',
    de: 'Fügen Sie Pfosten hinzu, um die Last je Pfosten zu verringern.',
    pl: 'Dodaj słupy, aby zmniejszyć obciążenie na słup.',
  },
  'Bracing {axis} (knee braces / a boarded wall) halves the buckling length and removes the wind moment.': {
    uk: 'Розкосини {axis} (підкоси / обшита стіна) зменшують розрахункову довжину вдвічі та усувають вітровий момент.',
    de: 'Eine Aussteifung {axis} (Kopfbänder / eine beplankte Wand) halbiert die Knicklänge und beseitigt das Windmoment.',
    pl: 'Stężenie {axis} (miecze / ściana poszyta) skraca o połowę długość wyboczeniową i eliminuje moment od wiatru.',
  },
  'N_d = {Nd} (G + S), buckling length {Lef} mm (in row {Lrow} / across {Lperp} mm; λ = {lambda}, k_c = {kc}).': {
    uk: 'N_d = {Nd} (G + S), розрахункова довжина {Lef} mm (уздовж ряду {Lrow} / впоперек {Lperp} mm; λ = {lambda}, k_c = {kc}).',
    de: 'N_d = {Nd} (G + S), Knicklänge {Lef} mm (in Reihenrichtung {Lrow} / quer {Lperp} mm; λ = {lambda}, k_c = {kc}).',
    pl: 'N_d = {Nd} (G + S), długość wyboczeniowa {Lef} mm (w rzędzie {Lrow} / w poprzek {Lperp} mm; λ = {lambda}, k_c = {kc}).',
  },
  'σ_c,0,d = {sigma} ≤ k_c·f_c,0,d = {fcd} N/mm² ({pct}).': {
    uk: 'σ_c,0,d = {sigma} ≤ k_c·f_c,0,d = {fcd} N/mm² ({pct}).',
    de: 'σ_c,0,d = {sigma} ≤ k_c·f_c,0,d = {fcd} N/mm² ({pct}).',
    pl: 'σ_c,0,d = {sigma} ≤ k_c·f_c,0,d = {fcd} N/mm² ({pct}).',
  },
  'With wind moment {list}.': { uk: 'З урахуванням вітрового моменту {list}.', de: 'Mit Windmoment {list}.', pl: 'Z momentem od wiatru {list}.' },
  'Governing {g}.': { uk: 'Визначальне {g}.', de: 'Maßgebend {g}.', pl: 'Miarodajne {g}.' },
  // Full post-buckling detail, merged start-to-end: the "N_d ..." and "σ_c,0,d ..." sentences never get
  // split apart by the sentence-splitter (it doesn't split before a lowercase Greek σ), and any of these
  // sub-templates left with an unbounded trailing placeholder would otherwise greedily re-match all the
  // way to the LAST ")." in the whole text (e.g. the "Governing ... (Z)." tail) and mistranslate. Matching
  // the complete text end-to-end (its real, single terminator) avoids the ambiguity entirely.
  'N_d = {Nd} (G + S), buckling length {Lef} mm (in row {Lrow} / across {Lperp} mm; λ = {lambda}, k_c = {kc}). σ_c,0,d = {sigma} ≤ k_c·f_c,0,d = {fcd} N/mm² ({pct}). Governing {g}.': {
    uk: 'N_d = {Nd} (G + S), розрахункова довжина {Lef} mm (уздовж ряду {Lrow} / впоперек {Lperp} mm; λ = {lambda}, k_c = {kc}). σ_c,0,d = {sigma} ≤ k_c·f_c,0,d = {fcd} N/mm² ({pct}). Визначальне {g}.',
    de: 'N_d = {Nd} (G + S), Knicklänge {Lef} mm (in Reihenrichtung {Lrow} / quer {Lperp} mm; λ = {lambda}, k_c = {kc}). σ_c,0,d = {sigma} ≤ k_c·f_c,0,d = {fcd} N/mm² ({pct}). Maßgebend {g}.',
    pl: 'N_d = {Nd} (G + S), długość wyboczeniowa {Lef} mm (w rzędzie {Lrow} / w poprzek {Lperp} mm; λ = {lambda}, k_c = {kc}). σ_c,0,d = {sigma} ≤ k_c·f_c,0,d = {fcd} N/mm² ({pct}). Miarodajne {g}.',
  },
  'N_d = {Nd} (G + S), buckling length {Lef} mm (in row {Lrow} / across {Lperp} mm; λ = {lambda}, k_c = {kc}). σ_c,0,d = {sigma} ≤ k_c·f_c,0,d = {fcd} N/mm² ({pct}). With wind moment {list}. Governing {g}.': {
    uk: 'N_d = {Nd} (G + S), розрахункова довжина {Lef} mm (уздовж ряду {Lrow} / впоперек {Lperp} mm; λ = {lambda}, k_c = {kc}). σ_c,0,d = {sigma} ≤ k_c·f_c,0,d = {fcd} N/mm² ({pct}). З урахуванням вітрового моменту {list}. Визначальне {g}.',
    de: 'N_d = {Nd} (G + S), Knicklänge {Lef} mm (in Reihenrichtung {Lrow} / quer {Lperp} mm; λ = {lambda}, k_c = {kc}). σ_c,0,d = {sigma} ≤ k_c·f_c,0,d = {fcd} N/mm² ({pct}). Mit Windmoment {list}. Maßgebend {g}.',
    pl: 'N_d = {Nd} (G + S), długość wyboczeniowa {Lef} mm (w rzędzie {Lrow} / w poprzek {Lperp} mm; λ = {lambda}, k_c = {kc}). σ_c,0,d = {sigma} ≤ k_c·f_c,0,d = {fcd} N/mm² ({pct}). Z momentem od wiatru {list}. Miarodajne {g}.',
  },

  // ── Bracing (knee braces) ─────────────────────────────────────────────────────────────
  'Use {section} knee braces, add posts (more braces per row).': {
    uk: 'Використайте підкоси перерізом {section}, додайте стовпи (більше підкосів у ряду).',
    de: 'Verwenden Sie Kopfbänder {section}, fügen Sie Pfosten hinzu (mehr Kopfbänder pro Reihe).',
    pl: 'Użyj mieczy {section}, dodaj słupy (więcej mieczy w rzędzie).',
  },
  'Use {section} knee braces, add posts (more braces per row) or use mechanical connectors so the tension braces also act.': {
    uk: "Використайте підкоси перерізом {section}, додайте стовпи (більше підкосів у ряду) або застосуйте механічні з'єднувачі, щоб розтягнуті підкоси теж працювали.",
    de: 'Verwenden Sie Kopfbänder {section}, fügen Sie Pfosten hinzu (mehr Kopfbänder pro Reihe) oder verwenden Sie mechanische Verbinder, damit auch die Zugkopfbänder mitwirken.',
    pl: 'Użyj mieczy {section}, dodaj słupy (więcej mieczy w rzędzie) lub zastosuj łączniki mechaniczne, aby pracowały też miecze rozciągane.',
  },
  'Add posts (more braces per row).': {
    uk: 'Додайте стовпи (більше підкосів у ряду).',
    de: 'Fügen Sie Pfosten hinzu (mehr Kopfbänder pro Reihe).',
    pl: 'Dodaj słupy (więcej mieczy w rzędzie).',
  },
  'Add posts (more braces per row) or set the brace direction to both sides.': {
    uk: 'Додайте стовпи (більше підкосів у ряду) або встановіть напрямок підкосів на обидві сторони.',
    de: 'Fügen Sie Pfosten hinzu (mehr Kopfbänder pro Reihe) oder stellen Sie die Kopfbandrichtung auf beide Seiten.',
    pl: 'Dodaj słupy (więcej mieczy w rzędzie) lub ustaw kierunek mieczy na obustronny.',
  },
  'Wind {axis}: W_k = {Wk}, H_d = {Hd} (incl. {p} % notional sway) shared by {n} braced row': {
    uk: 'Вітер {axis}: W_k = {Wk}, H_d = {Hd} (включно з {p} % умовної розгойдувальної сили) розподілено на {n} розкосний ряд',
    de: 'Wind {axis}: W_k = {Wk}, H_d = {Hd} (inkl. {p} % rechnerischer Schiefstellung) auf {n} ausgesteifte Reihe verteilt',
    pl: 'Wiatr {axis}: W_k = {Wk}, H_d = {Hd} (w tym {p} % imperfekcji przechyłowej) przenoszone przez {n} stężony rząd',
  },
  'Wind {axis}: W_k = {Wk}, H_d = {Hd} (incl. {p} % notional sway) shared by {n} braced rows': {
    uk: 'Вітер {axis}: W_k = {Wk}, H_d = {Hd} (включно з {p} % умовної розгойдувальної сили) розподілено на {n} розкосні ряди',
    de: 'Wind {axis}: W_k = {Wk}, H_d = {Hd} (inkl. {p} % rechnerischer Schiefstellung) auf {n} ausgesteifte Reihen verteilt',
    pl: 'Wiatr {axis}: W_k = {Wk}, H_d = {Hd} (w tym {p} % imperfekcji przechyłowej) przenoszone przez {n} stężone rzędy',
  },
  '{row} has 1 active brace per load sense (tension braces count – mechanical connectors).': {
    uk: "{row}: активних підкосів на напрямок навантаження – 1 (розтягнуті підкоси теж працюють – механічні з'єднувачі).",
    de: '{row}: 1 aktives Kopfband je Lastrichtung (Zugkopfbänder wirken mit – mechanische Verbinder).',
    pl: '{row}: 1 czynny miecz na kierunek obciążenia (miecze rozciągane pracują – łączniki mechaniczne).',
  },
  '{row} has 1 active brace per load sense (compression only – tenon joints).': {
    uk: "{row}: активних підкосів на напрямок навантаження – 1 (лише стиск – шипові з'єднання).",
    de: '{row}: 1 aktives Kopfband je Lastrichtung (nur Druck – Zapfenverbindungen).',
    pl: '{row}: 1 czynny miecz na kierunek obciążenia (tylko ściskanie – połączenia czopowe).',
  },
  '{row} has {active} active braces per load sense (tension braces count – mechanical connectors).': {
    uk: "{row}: активних підкосів на напрямок навантаження – {active} (розтягнуті підкоси теж працюють – механічні з'єднувачі).",
    de: '{row}: {active} aktive Kopfbänder je Lastrichtung (Zugkopfbänder wirken mit – mechanische Verbinder).',
    pl: '{row}: {active} czynnych mieczy na kierunek obciążenia (miecze rozciągane pracują – łączniki mechaniczne).',
  },
  '{row} has {active} active braces per load sense (compression only – tenon joints).': {
    uk: "{row}: активних підкосів на напрямок навантаження – {active} (лише стиск – шипові з'єднання).",
    de: '{row}: {active} aktive Kopfbänder je Lastrichtung (nur Druck – Zapfenverbindungen).',
    pl: '{row}: {active} czynnych mieczy na kierunek obciążenia (tylko ściskanie – połączenia czopowe).',
  },
  'Strut N_d = {N}, L_ef = {Lef} mm, k_c = {kc}: σ_c,0,d = {sigma} ≤ {fcd} N/mm² ({pct}).': {
    uk: 'Стрижень N_d = {N}, L_ef = {Lef} mm, k_c = {kc}: σ_c,0,d = {sigma} ≤ {fcd} N/mm² ({pct}).',
    de: 'Strebe N_d = {N}, L_ef = {Lef} mm, k_c = {kc}: σ_c,0,d = {sigma} ≤ {fcd} N/mm² ({pct}).',
    pl: 'Zastrzał N_d = {N}, L_ef = {Lef} mm, k_c = {kc}: σ_c,0,d = {sigma} ≤ {fcd} N/mm² ({pct}).',
  },
  'Brace-to-post / purlin joints not verified.': {
    uk: "З'єднання підкосів зі стовпом / прогоном не перевірено.",
    de: 'Die Anschlüsse Kopfband–Pfosten/Pfette wurden nicht nachgewiesen.',
    pl: 'Połączenia miecz–słup / płatew nie są sprawdzane.',
  },

  // ── Boarded wall ──────────────────────────────────────────────────────────────────────
  'Wind {axis}: W_k = {Wk}, H_d = {Hd} resisted by the closed {walls} wall as shear wall ({shear} kN/m² of boarding).': {
    uk: 'Вітер {axis}: W_k = {Wk}, H_d = {Hd} сприймається зашитою стіною {walls} як стіна-діафрагма ({shear} kN/m² обшивки).',
    de: 'Wind {axis}: W_k = {Wk}, H_d = {Hd} wird von der geschlossenen Wand {walls} als Wandscheibe aufgenommen ({shear} kN/m² Beplankung).',
    pl: 'Wiatr {axis}: W_k = {Wk}, H_d = {Hd} przenoszone przez zamkniętą ścianę {walls} jako tarczę ({shear} kN/m² poszycia).',
  },
  'Wind {axis}: W_k = {Wk}, H_d = {Hd} resisted by the closed {walls} walls as shear walls ({shear} kN/m² of boarding).': {
    uk: 'Вітер {axis}: W_k = {Wk}, H_d = {Hd} сприймається зашитими стінами {walls} як стіни-діафрагми ({shear} kN/m² обшивки).',
    de: 'Wind {axis}: W_k = {Wk}, H_d = {Hd} wird von den geschlossenen Wänden {walls} als Wandscheiben aufgenommen ({shear} kN/m² Beplankung).',
    pl: 'Wiatr {axis}: W_k = {Wk}, H_d = {Hd} przenoszone przez zamknięte ściany {walls} jako tarcze ({shear} kN/m² poszycia).',
  },
  'Board / panel fixing not verified – use ≥ 18 mm boarding or OSB nailed at ≤ 150 mm.': {
    uk: 'Кріплення обшивки / плит не перевірено – використовуйте обшивку ≥ 18 mm або OSB, прибиту цвяхами з кроком ≤ 150 mm.',
    de: 'Die Befestigung der Beplankung wurde nicht nachgewiesen – verwenden Sie eine Beplankung ≥ 18 mm oder OSB, genagelt mit ≤ 150 mm Abstand.',
    pl: 'Mocowanie desek / płyt nie jest sprawdzane – użyj poszycia ≥ 18 mm lub OSB przybitego co ≤ 150 mm.',
  },

  // ── Sway posts ────────────────────────────────────────────────────────────────────────
  'Enable knee braces in this direction (or close a wall in this plane), or use larger posts.': {
    uk: 'Увімкніть підкоси в цьому напрямку (або зашийте стіну в цій площині), або використайте більші стовпи.',
    de: 'Aktivieren Sie Kopfbänder in dieser Richtung (oder schließen Sie eine Wand in dieser Ebene), oder verwenden Sie größere Pfosten.',
    pl: 'Włącz miecze w tym kierunku (lub zamknij ścianę w tej płaszczyźnie) albo użyj większych słupów.',
  },
  'Close a wall in this plane (shear wall) or use larger posts.': {
    uk: 'Зашийте стіну в цій площині (стіна-діафрагма) або використайте більші стовпи.',
    de: 'Schließen Sie eine Wand in dieser Ebene (Wandscheibe) oder verwenden Sie größere Pfosten.',
    pl: 'Zamknij ścianę w tej płaszczyźnie (tarcza) lub użyj większych słupów.',
  },
  'Requires moment-fixed post bases (H-anchors ≥ 600 mm embedded or cast-in steel shoes) – {shear} shear and {moment} kNm per base.': {
    uk: 'Потребує жорстко защемлених опор стовпів (H-анкери завглибшки ≥ 600 mm або залиті сталеві черевики) – {shear} зсуву та {moment} kNm на опору.',
    de: 'Erfordert biegesteife Pfostenfüße (H-Anker ≥ 600 mm einbetoniert oder eingegossene Stahlschuhe) – {shear} Schub und {moment} kNm je Fuß.',
    pl: 'Wymaga utwierdzonych stóp słupów (kotwy H zabetonowane na ≥ 600 mm lub stalowe stopy wbetonowane) – {shear} ścinania i {moment} kNm na stopę.',
  },
  // Wk/Hd end in a literal " kN." (not just a bare placeholder before the final period): with nothing
  // bounding a trailing placeholder, the template engine's greedy match will otherwise swallow whole
  // unrelated sentences that happen to start the same way (e.g. the bracing/boarded-wall detail texts
  // also begin "Wind {axis}: W_k = ..., H_d = ...") and hijack their translation.
  'Wind {axis}: W_k = {Wk} kN, H_d = {Hd} kN.': { uk: 'Вітер {axis}: W_k = {Wk} kN, H_d = {Hd} kN.', de: 'Wind {axis}: W_k = {Wk} kN, H_d = {Hd} kN.', pl: 'Wiatr {axis}: W_k = {Wk} kN, H_d = {Hd} kN.' },
  'No knee braces or boarded wall act in this direction – the posts cantilever from their bases (buckling length 2·h).': {
    uk: 'У цьому напрямку не діють ні підкоси, ні обшита стіна – стовпи працюють як консолі від основи (розрахункова довжина 2·h).',
    de: 'In dieser Richtung wirken weder Kopfbänder noch eine beplankte Wand – die Pfosten wirken ab ihrem Fußpunkt als Kragarm (Knicklänge 2·h).',
    pl: 'W tym kierunku nie pracują ani miecze, ani ściana poszyta – słupy są wspornikami utwierdzonymi u podstawy (długość wyboczeniowa 2·h).',
  },
  // N_d ends in a literal " kN." for the same reason as the sway "Wind {axis}" template above: this
  // sentence is directly followed (no ". " break, since the next clause starts with the Greek σ, which
  // the sentence-splitter doesn't recognise as a capital letter) by the σ_c/σ_m formula sentence, so an
  // unbounded trailing {N} would otherwise greedily swallow it and hijack "Post {side}"'s translation.
  '{row}: H_d = {Hpost} per post ({n} posts share {Hd} incl. {p} % notional sway), M_d = {Md} kNm at the base, N_d = {N} kN.': {
    uk: '{row}: H_d = {Hpost} на стовп ({n} стовпів розподіляють {Hd}, включно з {p} % умовної розгойдувальної сили), M_d = {Md} kNm біля основи, N_d = {N} kN.',
    de: '{row}: H_d = {Hpost} je Pfosten ({n} Pfosten teilen sich {Hd} inkl. {p} % rechnerischer Schiefstellung), M_d = {Md} kNm an der Basis, N_d = {N} kN.',
    pl: '{row}: H_d = {Hpost} na słup ({n} słupów przenosi {Hd} w tym {p} % imperfekcji przechyłowej), M_d = {Md} kNm u podstawy, N_d = {N} kN.',
  },
  // Merged with the σ_c/σ_m formula sentence that always immediately follows it in the sway-post detail:
  // the sentence-splitter never separates them (it doesn't split before a lowercase Greek σ), so this
  // combined piece is what recursion actually has to match; matching it end-to-end (its one true
  // terminator) avoids the same unbounded-trailing-placeholder ambiguity fixed above for post buckling.
  '{row}: H_d = {Hpost} per post ({n} posts share {Hd} incl. {p} % notional sway), M_d = {Md} kNm at the base, N_d = {N} kN. σ_c/(k_c·f_c,0,d) + σ_m/f_m,d = {a} + {b} = {pct} ({combo}, k_mod {kmod}).': {
    uk: '{row}: H_d = {Hpost} на стовп ({n} стовпів розподіляють {Hd}, включно з {p} % умовної розгойдувальної сили), M_d = {Md} kNm біля основи, N_d = {N} kN. σ_c/(k_c·f_c,0,d) + σ_m/f_m,d = {a} + {b} = {pct} ({combo}, k_mod {kmod}).',
    de: '{row}: H_d = {Hpost} je Pfosten ({n} Pfosten teilen sich {Hd} inkl. {p} % rechnerischer Schiefstellung), M_d = {Md} kNm an der Basis, N_d = {N} kN. σ_c/(k_c·f_c,0,d) + σ_m/f_m,d = {a} + {b} = {pct} ({combo}, k_mod {kmod}).',
    pl: '{row}: H_d = {Hpost} na słup ({n} słupów przenosi {Hd} w tym {p} % imperfekcji przechyłowej), M_d = {Md} kNm u podstawy, N_d = {N} kN. σ_c/(k_c·f_c,0,d) + σ_m/f_m,d = {a} + {b} = {pct} ({combo}, k_mod {kmod}).',
  },
  'σ_c/(k_c·f_c,0,d) + σ_m/f_m,d = {a} + {b} = {pct} ({combo}, k_mod {kmod}).': {
    uk: 'σ_c/(k_c·f_c,0,d) + σ_m/f_m,d = {a} + {b} = {pct} ({combo}, k_mod {kmod}).',
    de: 'σ_c/(k_c·f_c,0,d) + σ_m/f_m,d = {a} + {b} = {pct} ({combo}, k_mod {kmod}).',
    pl: 'σ_c/(k_c·f_c,0,d) + σ_m/f_m,d = {a} + {b} = {pct} ({combo}, k_mod {kmod}).',
  },

  // ── Headers over openings ─────────────────────────────────────────────────────────────
  'Use a deeper header (Sturz) or a doubled header section.': {
    uk: 'Використайте вищу перемичку (Sturz) або здвоєний переріз перемички.',
    de: 'Verwenden Sie einen höheren Sturz oder einen doppelten Sturzquerschnitt.',
    pl: 'Użyj wyższego nadproża (Sturz) lub podwójnego przekroju nadproża.',
  },
  'Infill wall header – carries wall self-weight above the opening plus a nominal 0.5 kN/m.': {
    uk: 'Перемичка заповнювальної стіни – несе власну вагу стіни над прорізом плюс номінальне навантаження 0.5 kN/m.',
    de: 'Sturz der Ausfachungswand – trägt das Eigengewicht der Wand über der Öffnung zuzüglich einer nominellen Last von 0,5 kN/m.',
    pl: 'Nadproże ściany wypełniającej – przenosi ciężar własny ściany nad otworem oraz umowne 0,5 kN/m.',
  },
  'Clear span {span} mm, section {section}.': {
    uk: 'Чистий проліт {span} mm, переріз {section}.',
    de: 'Lichte Spannweite {span} mm, Querschnitt {section}.',
    pl: 'Rozpiętość w świetle {span} mm, przekrój {section}.',
  },
  'σ = {sigma} N/mm² ({pct}), w_fin = {wfin} mm ≤ {wlim} mm.': {
    uk: 'σ = {sigma} N/mm² ({pct}), w_fin = {wfin} mm ≤ {wlim} mm.',
    de: 'σ = {sigma} N/mm² ({pct}), w_fin = {wfin} mm ≤ {wlim} mm.',
    pl: 'σ = {sigma} N/mm² ({pct}), w_fin = {wfin} mm ≤ {wlim} mm.',
  },

  // ── Roof uplift ───────────────────────────────────────────────────────────────────────
  'Every post anchor and purlin-to-post joint must resist {net} tension (net uplift).': {
    uk: "Кожна анкеровка стовпа та з'єднання прогону зі стовпом мають витримати розтяг {net} (чистий відрив).",
    de: 'Jede Pfostenverankerung und jede Pfetten-Pfosten-Verbindung muss einer Zugkraft von {net} standhalten (Netto-Abhebung).',
    pl: 'Każde zakotwienie słupa i połączenie płatew–słup musi przenieść rozciąganie {net} (odrywanie netto).',
  },
  'Use tension-rated post shoes and screw / bolt the purlins and rafters down.': {
    uk: 'Використайте розраховані на розтяг черевики стовпів і прикрутіть / притягніть болтами прогони та крокви.',
    de: 'Verwenden Sie zugfeste Pfostenschuhe und schrauben / verschrauben Sie Pfetten und Sparren.',
    pl: 'Użyj stóp słupów przenoszących rozciąganie i przykręć / przyśrubuj płatwie i krokwie.',
  },
  'Canopy suction c_f = {cf} → {windUp} kN/m² plan (q_p = {q} kN/m²).': {
    uk: 'Відсмоктування навісу c_f = {cf} → {windUp} kN/m² в плані (q_p = {q} kN/m²).',
    de: 'Sog am Vordach c_f = {cf} → {windUp} kN/m² in der Grundfläche (q_p = {q} kN/m²).',
    pl: 'Ssanie na zadaszenie c_f = {cf} → {windUp} kN/m² w rzucie (q_p = {q} kN/m²).',
  },
  '{row}: uplift 1.5·W = {up} vs. dead load 1.0·G = {down} per post (roof + purlin {roofG}, post {postG}) ({pct}).': {
    uk: '{row}: відрив 1.5·W = {up} проти постійного навантаження 1.0·G = {down} на стовп (дах + прогон {roofG}, стовп {postG}) ({pct}).',
    de: '{row}: Abhebung 1.5·W = {up} gegenüber Eigenlast 1.0·G = {down} je Pfosten (Dach + Pfette {roofG}, Pfosten {postG}) ({pct}).',
    pl: '{row}: odrywanie 1.5·W = {up} wobec ciężaru własnego 1.0·G = {down} na słup (dach + płatew {roofG}, słup {postG}) ({pct}).',
  },
  'Net {net} tension per post.': { uk: 'Чистий розтяг {net} на стовп.', de: 'Netto {net} Zug je Pfosten.', pl: 'Rozciąganie netto {net} na słup.' },
  'Dead load holds the roof down; anchors take shear only.': {
    uk: 'Власна вага утримує дах; анкери сприймають лише зсув.',
    de: 'Die Eigenlast hält das Dach; die Anker nehmen nur Schub auf.',
    pl: 'Ciężar własny utrzymuje dach; kotwy przenoszą tylko ścinanie.',
  },
  'Light coverings ({covering}) are governed by uplift, not snow.': {
    uk: 'Легкі покрівельні матеріали ({covering}) розраховуються за відривом, а не за снігом.',
    de: 'Leichte Dachdeckungen ({covering}) werden durch Abhebung, nicht durch Schnee, maßgebend.',
    pl: 'O lekkich pokryciach ({covering}) decyduje odrywanie, a nie śnieg.',
  },

  // ── Timber floor ──────────────────────────────────────────────────────────────────────
  'Simply supported between bearers, span {span} m, spacing {spacing} mm, imposed load {load} kN/m².': {
    uk: 'Просто обперта між опорними балками, проліт {span} m, крок {spacing} mm, корисне навантаження {load} kN/m².',
    de: 'Einfach gelagert zwischen Unterzügen, Spannweite {span} m, Abstand {spacing} mm, Nutzlast {load} kN/m².',
    pl: 'Swobodnie podparty między podciągami, rozpiętość {span} m, rozstaw {spacing} mm, obciążenie użytkowe {load} kN/m².',
  },
  'Simply supported between levelling pads, span {span} m, spacing {spacing} mm, imposed load {load} kN/m².': {
    uk: 'Просто обперта між регульованими опорами, проліт {span} m, крок {spacing} mm, корисне навантаження {load} kN/m².',
    de: 'Einfach gelagert zwischen Stellfüßen, Spannweite {span} m, Abstand {spacing} mm, Nutzlast {load} kN/m².',
    pl: 'Swobodnie podparty między podkładkami poziomującymi, rozpiętość {span} m, rozstaw {spacing} mm, obciążenie użytkowe {load} kN/m².',
  },
  'Simply supported between point foundations, span {span} m, tributary width {trib} mm.': {
    uk: 'Просто обперта між точковими фундаментами, проліт {span} m, вантажна ширина {trib} mm.',
    de: 'Einfach gelagert zwischen Punktfundamenten, Spannweite {span} m, Einzugsbreite {trib} mm.',
    pl: 'Swobodnie podparty między fundamentami punktowymi, rozpiętość {span} m, szerokość zbierania {trib} mm.',
  },
  'Increase the floor joists to {dims}, or reduce the bearer spacing.': {
    uk: 'Збільште перерізи лаг підлоги до {dims}, або зменшіть крок опорних балок.',
    de: 'Vergrößern Sie die Fußbodenbalken auf {dims}, oder verringern Sie den Unterzugsabstand.',
    pl: 'Zwiększ legary podłogi do {dims} albo zmniejsz rozstaw podciągów.',
  },
  'Increase the floor sleepers to {dims}, or reduce the pad spacing.': {
    uk: 'Збільште перерізи лаг до {dims}, або зменшіть крок опорних подушок.',
    de: 'Vergrößern Sie die Lagerhölzer auf {dims}, oder verringern Sie den Stützenabstand.',
    pl: 'Zwiększ legary na płycie do {dims} albo zmniejsz rozstaw podkładek.',
  },
  'Reduce the bearer spacing to shorten the span.': {
    uk: 'Зменшіть крок опорних балок, щоб скоротити проліт.',
    de: 'Verringern Sie den Unterzugsabstand, um die Spannweite zu verkürzen.',
    pl: 'Zmniejsz rozstaw podciągów, aby skrócić rozpiętość.',
  },
  'Reduce the pad spacing to shorten the span.': {
    uk: 'Зменшіть крок опорних подушок, щоб скоротити проліт.',
    de: 'Verringern Sie den Stützenabstand, um die Spannweite zu verkürzen.',
    pl: 'Zmniejsz rozstaw podkładek, aby skrócić rozpiętość.',
  },
  'Increase the bearers to {dims}, or reduce the foundation spacing.': {
    uk: 'Збільште перерізи опорних балок до {dims}, або зменшіть крок фундаментів.',
    de: 'Vergrößern Sie die Unterzüge auf {dims}, oder verringern Sie den Fundamentabstand.',
    pl: 'Zwiększ podciągi do {dims} albo zmniejsz rozstaw fundamentów.',
  },
  'Reduce the foundation spacing to shorten the bearer span.': {
    uk: 'Зменшіть крок фундаментів, щоб скоротити проліт опорної балки.',
    de: 'Verringern Sie den Fundamentabstand, um die Unterzugsspannweite zu verkürzen.',
    pl: 'Zmniejsz rozstaw fundamentów, aby skrócić rozpiętość podciągów.',
  },

  // ── autofix.ts: change labels ─────────────────────────────────────────────────────────
  // Note: 'Rafter', 'Max rafter spacing', 'Max rafter length', 'Max post spacing', 'Posts per row'
  // and 'Brace direction' are already defined identically (or equivalently) in panels.ts – reused, not redefined here.
  'Rafters (Sparren)': { uk: 'Крокви (Sparren)', de: 'Sparren', pl: 'Krokwie (Sparren)' },
  'Purlins (Pfetten)': { uk: 'Прогони (Pfetten)', de: 'Pfetten', pl: 'Płatwie (Pfetten)' },
  'Posts (Pfosten)': { uk: 'Стовпи (Pfosten)', de: 'Pfosten', pl: 'Słupy (Pfosten)' },
  'Wall studs (Ständer)': { uk: 'Стійки стін (Ständer)', de: 'Wandständer', pl: 'Słupki ścienne (Ständer)' },
  'Knee braces (Kopfbänder)': { uk: 'Підкоси (Kopfbänder)', de: 'Kopfbänder', pl: 'Miecze (Kopfbänder)' },
  'Knee braces enabled': { uk: 'Підкоси увімкнено', de: 'Kopfbänder aktiviert', pl: 'Miecze włączone' },
  'Floor joists (Fußbodenbalken)': { uk: 'Лаги підлоги (Fußbodenbalken)', de: 'Fußbodenbalken', pl: 'Legary podłogi (Fußbodenbalken)' },
  'Floor bearers (Unterzüge)': { uk: 'Опорні балки підлоги (Unterzüge)', de: 'Unterzüge', pl: 'Podciągi podłogi (Unterzüge)' },
  'Max floor bearer spacing': { uk: 'Макс. крок опорних балок підлоги', de: 'Max. Unterzugsabstand', pl: 'Maks. rozstaw podciągów podłogi' },
  'Max floor support spacing': { uk: 'Макс. крок опор підлоги', de: 'Max. Stützenabstand (Boden)', pl: 'Maks. rozstaw podpór podłogi' },

  // ── materials.ts: roof covering names ─────────────────────────────────────────────────
  'Trapezoidal steel sheet': { uk: 'Профнастил', de: 'Trapezblech', pl: 'Blacha trapezowa stalowa' },
  'Polycarbonate panels': { uk: 'Полікарбонатні панелі', de: 'Stegplatten', pl: 'Płyty poliwęglanowe' },
  'Bitumen shingles on OSB': { uk: 'Бітумна черепиця на ОСП', de: 'Bitumenschindeln auf OSB', pl: 'Gont bitumiczny na OSB' },
  'Concrete / clay tiles': { uk: 'Бетонна / керамічна черепиця', de: 'Beton-/Tondachziegel', pl: 'Dachówki betonowe / ceramiczne' },
  'Extensive green roof': { uk: 'Екстенсивний зелений дах', de: 'Extensive Dachbegrünung', pl: 'Ekstensywny zielony dach' },
} satisfies Dict;
