import type { Dict } from '../core';
import { OPENING_PRESETS } from '@/engine/framing/openingCatalog';
import engineParts from './engine-parts';

/**
 * Strings of the three-structure review (13/10/2026): pinned post bases and bracing, the uplift
 * load path, studs in wind, roof battens and sheets, foundations, wall bases, planning warnings,
 * the build settings editor and the reports.
 */
const entries = {
  // ── Element names ─────────────────────────────────────────────────────────────────────
  '1 Roof sheet fasteners': { uk: '1 Кріплення покрівельних листів', de: '1 Befestigung der Dachbleche', pl: '1 Mocowanie blach dachowych' },
  '2 Rafter → purlin': { uk: '2 Кроква → прогін', de: '2 Sparren → Pfette', pl: '2 Krokiew → płatew' },
  '3 Purlin → post': { uk: '3 Прогін → стовп', de: '3 Pfette → Pfosten', pl: '3 Płatew → słup' },
  '4 Post → post base': { uk: '4 Стовп → опора стовпа', de: '4 Pfosten → Pfostenanker', pl: '4 Słup → podstawa słupa' },
  '5 Post base → foundation': { uk: '5 Опора стовпа → фундамент', de: '5 Pfostenanker → Fundament', pl: '5 Podstawa słupa → fundament' },
  'No bracing {axis}': { uk: 'Немає розкріплення {axis}', de: 'Keine Aussteifung {axis}', pl: 'Brak stężenia {axis}' },
  'Braced wall {axis}': { uk: 'Розкріплена стіна {axis}', de: 'Ausgesteifte Wand {axis}', pl: 'Ściana stężona {axis}' },
  'Posts in brace bending {axis}': { uk: 'Згин стовпів від підкосів {axis}', de: 'Pfostenbiegung aus Kopfbändern {axis}', pl: 'Zginanie słupów od mieczy {axis}' },
  'Wall studs in wind ({wall})': { uk: 'Стійки стін під вітром ({wall})', de: 'Ständer unter Windlast ({wall})', pl: 'Słupki ścian pod wiatrem ({wall})' },
  'Screen battens in wind ({wall})': { uk: 'Рейки екрана під вітром ({wall})', de: 'Traglatten unter Windlast ({wall})', pl: 'Łaty ekranu pod wiatrem ({wall})' },
  'Roof battens': { uk: 'Покрівельна обрешітка', de: 'Dachlattung', pl: 'Łaty dachowe' },
  'Roof batten': { uk: 'Рейка обрешітки', de: 'Dachlatte', pl: 'Łata dachowa' },
  'Roof batten {n}': { uk: 'Рейка обрешітки {n}', de: 'Dachlatte {n}', pl: 'Łata dachowa {n}' },
  'Roof batten (Dachlatte)': { uk: 'Рейка обрешітки (Dachlatte)', de: 'Dachlatte', pl: 'Łata dachowa (Dachlatte)' },
  'Roof sheet span': { uk: 'Проліт покрівельного листа', de: 'Stützweite Trapezblech', pl: 'Rozpiętość blachy dachowej' },
  'Rail {side}': { uk: 'Ригель {side}', de: 'Rähm {side}', pl: 'Oczep {side}' },

  // ── Bracing ───────────────────────────────────────────────────────────────────────────
  'Wind {axis}: W_k = {wk}, H_d = {hd} without a bracing system.': { uk: 'Вітер {axis}: W_k = {wk}, H_d = {hd} без системи розкріплення.', de: 'Wind {axis}: W_k = {wk}, H_d = {hd} ohne Aussteifungssystem.', pl: 'Wiatr {axis}: W_k = {wk}, H_d = {hd} bez układu stężeń.' },
  'Resistance: {how} ({p}).': { uk: 'Опір: {how} ({p}).', de: 'Widerstand: {how} ({p}).', pl: 'Nośność: {how} ({p}).' },
  'Nails: {x}.': { uk: 'Цвяхи: {x}.', de: 'Nägel: {x}.', pl: 'Gwoździe: {x}.' },
  'Interaction: {x}.': { uk: 'Взаємодія: {x}.', de: 'Interaktion: {x}.', pl: 'Interakcja: {x}.' },
  'Bending: {x}.': { uk: 'Згин: {x}.', de: 'Biegung: {x}.', pl: 'Zginanie: {x}.' },
  'Wind {axis}: W_k = {wk}, H_d = {hd} (incl. {p} % notional sway) shared by {n} braced posts in {l} lines.': {
    uk: 'Вітер {axis}: W_k = {wk}, H_d = {hd} (з {p} % умовного нахилу) розподілено на {n} розкріплених стовпів у {l} лініях.',
    de: 'Wind {axis}: W_k = {wk}, H_d = {hd} (inkl. {p} % Schiefstellung) verteilt auf {n} ausgesteifte Pfosten in {l} Linien.',
    pl: 'Wiatr {axis}: W_k = {wk}, H_d = {hd} (z {p} % pochylenia) rozdzielone na {n} stężonych słupów w {l} liniach.',
  },
  'Wind {axis}: W_k = {wk}, H_d = {hd} on {n} braced walls ({h} each).': {
    uk: 'Вітер {axis}: W_k = {wk}, H_d = {hd} на {n} розкріплені стіни ({h} на кожну).',
    de: 'Wind {axis}: W_k = {wk}, H_d = {hd} auf {n} ausgesteifte Wände ({h} je Wand).',
    pl: 'Wiatr {axis}: W_k = {wk}, H_d = {hd} na {n} stężone ściany ({h} na każdą).',
  },
  'Active braces per load sense: {list}.': { uk: 'Діючі підкоси на напрямок навантаження: {list}.', de: 'Wirksame Kopfbänder je Lastrichtung: {list}.', pl: 'Czynne miecze na kierunek obciążenia: {list}.' },
  'Tension braces count too (mechanical connectors).': { uk: 'Розтягнуті підкоси теж враховано (механічні з’єднувачі).', de: 'Zugbeanspruchte Kopfbänder zählen mit (mechanische Verbindungsmittel).', pl: 'Miecze rozciągane też się liczą (łączniki mechaniczne).' },
  'Compression braces only (tenon joints).': { uk: 'Лише стиснуті підкоси (шипові з’єднання).', de: 'Nur druckbeanspruchte Kopfbänder (Zapfenverbindungen).', pl: 'Tylko miecze ściskane (połączenia na czop).' },
  'Strut N_d = {n}, L_ef = {l} mm, k_c = {kc}: σ_c,0,d = {s} ≤ {f} N/mm² ({p}).': {
    uk: 'Зусилля в підкосі N_d = {n}, L_ef = {l} mm, k_c = {kc}: σ_c,0,d = {s} ≤ {f} N/mm² ({p}).',
    de: 'Strebenkraft N_d = {n}, L_ef = {l} mm, k_c = {kc}: σ_c,0,d = {s} ≤ {f} N/mm² ({p}).',
    pl: 'Siła w mieczu N_d = {n}, L_ef = {l} mm, k_c = {kc}: σ_c,0,d = {s} ≤ {f} N/mm² ({p}).',
  },
  '{line}: H_d = {h} on {n} braced posts → V_d = {v} at each pinned base, M_d = {m} kNm at the brace foot ({a} mm above the base), N_d = {nd} incl. the brace\'s vertical component ({combo}).': {
    uk: '{line}: H_d = {h} на {n} розкріплених стовпів → V_d = {v} на кожній шарнірній опорі, M_d = {m} kNm біля низу підкоса ({a} mm над опорою), N_d = {nd} з вертикальною складовою підкоса ({combo}).',
    de: '{line}: H_d = {h} auf {n} ausgesteifte Pfosten → V_d = {v} je gelenkigem Fußpunkt, M_d = {m} kNm am Kopfbandfuß ({a} mm über dem Fußpunkt), N_d = {nd} inkl. der Vertikalkomponente des Kopfbands ({combo}).',
    pl: '{line}: H_d = {h} na {n} stężonych słupów → V_d = {v} na każdej przegubowej podstawie, M_d = {m} kNm przy stopce miecza ({a} mm nad podstawą), N_d = {nd} z pionową składową miecza ({combo}).',
  },
  'σ_c/(k_c·f_c,0,d) + σ_m/f_m,d = {a} + {b} = {p} (k_mod {k})': { uk: 'σ_c/(k_c·f_c,0,d) + σ_m/f_m,d = {a} + {b} = {p} (k_mod {k})', de: 'σ_c/(k_c·f_c,0,d) + σ_m/f_m,d = {a} + {b} = {p} (k_mod {k})', pl: 'σ_c/(k_c·f_c,0,d) + σ_m/f_m,d = {a} + {b} = {p} (k_mod {k})' },
  'Brace more posts in this direction (both sides of each post), shorten the post or use larger posts.': {
    uk: 'Розкріпіть більше стовпів у цьому напрямку (з обох боків кожного стовпа), вкоротіть стовп або візьміть більший переріз.',
    de: 'Mehr Pfosten in dieser Richtung aussteifen (beidseitig je Pfosten), den Pfosten kürzen oder größere Pfosten verwenden.',
    pl: 'Stęż więcej słupów w tym kierunku (po obu stronach każdego słupa), skróć słup albo użyj większych słupów.',
  },
  'The post bases are pinned (no fixity), so without knee braces or a braced wall the frame has no lateral stability in this direction.': {
    uk: 'Опори стовпів шарнірні (без защемлення), тож без підкосів чи розкріпленої стіни каркас не має горизонтальної стійкості в цьому напрямку.',
    de: 'Die Pfostenfüße sind gelenkig (keine Einspannung) – ohne Kopfbänder oder ausgesteifte Wand ist das Tragwerk in dieser Richtung nicht horizontal stabil.',
    pl: 'Podstawy słupów są przegubowe (bez utwierdzenia), więc bez mieczy lub stężonej ściany rama nie ma stateczności poziomej w tym kierunku.',
  },
  'Add knee braces (Kopfbänder) in this direction, or brace a closed wall in this plane with crossed Windrispenband / sheet panels.': {
    uk: 'Додайте підкоси (Kopfbänder) у цьому напрямку або розкріпіть закриту стіну в цій площині перехресною вітровою стрічкою / плитами.',
    de: 'Kopfbänder in dieser Richtung ergänzen oder eine geschlossene Wand in dieser Ebene mit gekreuztem Windrispenband / Plattenwerkstoff aussteifen.',
    pl: 'Dodaj miecze (Kopfbänder) w tym kierunku albo stęż zamkniętą ścianę w tej płaszczyźnie krzyżową taśmą wiatrową / płytami.',
  },
  'Put a rail (Rähm) on an open side and brace it with knee braces, or close and brace a wall in this plane.': {
    uk: 'Поставте ригель (Rähm) з відкритого боку й розкріпіть його підкосами або закрийте й розкріпіть стіну в цій площині.',
    de: 'Ein Rähm an einer offenen Seite anordnen und mit Kopfbändern aussteifen, oder eine Wand in dieser Ebene schließen und aussteifen.',
    pl: 'Załóż oczep (Rähm) na otwartej stronie i stęż go mieczami albo zamknij i stęż ścianę w tej płaszczyźnie.',
  },
  'The board cladding of the {walls} wall is not a shear wall (no diagonal straps or sheet panels).': {
    uk: 'Дощата обшивка стіни {walls} не є діафрагмою (немає діагональних стрічок чи плит).',
    de: 'Die Brettschalung der Wand {walls} ist keine Wandscheibe (keine Diagonalbänder oder Platten).',
    pl: 'Deskowanie ściany {walls} nie jest tarczą (brak taśm ukośnych lub płyt).',
  },
  'The board cladding of the {walls} walls is not a shear wall (no diagonal straps or sheet panels).': {
    uk: 'Дощата обшивка стін {walls} не є діафрагмою (немає діагональних стрічок чи плит).',
    de: 'Die Brettschalung der Wände {walls} ist keine Wandscheibe (keine Diagonalbänder oder Platten).',
    pl: 'Deskowanie ścian {walls} nie jest tarczą (brak taśm ukośnych lub płyt).',
  },
  'Wall {side}: Windrispenband 40 × 2 mm, {n} × cross (flattest {a}°, diagonal {d} m): T_d = {t} ≤ N_t,Rd = {r} ({p}).': {
    uk: 'Стіна {side}: вітрова стрічка 40 × 2 mm, {n} × хрест (найпологіший {a}°, діагональ {d} m): T_d = {t} ≤ N_t,Rd = {r} ({p}).',
    de: 'Wand {side}: Windrispenband 40 × 2 mm, {n} × Kreuz (flachstes {a}°, Diagonale {d} m): T_d = {t} ≤ N_t,Rd = {r} ({p}).',
    pl: 'Ściana {side}: taśma wiatrowa 40 × 2 mm, {n} × krzyż (najbardziej płaski {a}°, przekątna {d} m): T_d = {t} ≤ N_t,Rd = {r} ({p}).',
  },
  '{n} Kammnägel 4.0 × 40 per strap end (F_v,Rd = {f} each)': {
    uk: '{n} рифлених цвяхів 4.0 × 40 на кінець стрічки (F_v,Rd = {f} кожен)',
    de: '{n} Kammnägel 4,0 × 40 je Bandende (F_v,Rd = {f} je Nagel)',
    pl: '{n} gwoździ pierścieniowych 4,0 × 40 na koniec taśmy (F_v,Rd = {f} każdy)',
  },
  'Hold-down at the wall ends {t} – anchor the end studs into the base.': {
    uk: 'Анкерування на кінцях стіни {t} – закріпіть крайні стійки в основі.',
    de: 'Zugverankerung an den Wandenden {t} – Endständer in der Unterkonstruktion verankern.',
    pl: 'Zakotwienie na końcach ściany {t} – zakotw słupki skrajne w podłożu.',
  },
  'Wall {side}: sheet panels (OSB ≥ 15 mm, nailed at ≤ 150 mm) carry {h}.': {
    uk: 'Стіна {side}: плити (OSB ≥ 15 mm, цвяхи з кроком ≤ 150 mm) сприймають {h}.',
    de: 'Wand {side}: Beplankung (OSB ≥ 15 mm, Nagelabstand ≤ 150 mm) trägt {h}.',
    pl: 'Ściana {side}: płyty (OSB ≥ 15 mm, gwoździe co ≤ 150 mm) przenoszą {h}.',
  },
  // ── Shear walls under a rigid roof diaphragm (position, torsion, OSB 9.2.4.2, roof bracing) ──
  'Wind {axis}: W_k = {wk}, H_d = {hd} acting at {at}, centre of stiffness at {c}: eccentricity {e} m, torsion M_t = {mt} kNm (rigid roof diaphragm, walls stiff in proportion to their braced length).': {
    uk: 'Вітер {axis}: W_k = {wk}, H_d = {hd} прикладено при {at}, центр жорсткості при {c}: ексцентриситет {e} m, крутний момент M_t = {mt} kNm (жорсткий диск даху, жорсткість стін пропорційна їх розкріпленій довжині).',
    de: 'Wind {axis}: W_k = {wk}, H_d = {hd} wirkt bei {at}, Steifigkeitsmittelpunkt bei {c}: Exzentrizität {e} m, Torsionsmoment M_t = {mt} kNm (starre Dachscheibe, Wandsteifigkeit proportional zur ausgesteiften Länge).',
    pl: 'Wiatr {axis}: W_k = {wk}, H_d = {hd} przyłożone przy {at}, środek sztywności przy {c}: mimośród {e} m, moment skręcający M_t = {mt} kNm (sztywna tarcza dachu, sztywność ścian proporcjonalna do ich stężonej długości).',
  },
  'The braced walls stand on one line and nothing takes the torsion M_t = {mt} kNm.': {
    uk: 'Розкріплені стіни стоять на одній лінії, і крутний момент M_t = {mt} kNm нічим не сприймається.',
    de: 'Die ausgesteiften Wände stehen in einer Linie, nichts nimmt das Torsionsmoment M_t = {mt} kNm auf.',
    pl: 'Stężone ściany stoją w jednej linii i nic nie przenosi momentu skręcającego M_t = {mt} kNm.',
  },
  'The torsion M_t = {mt} kNm goes into the knee braces {axis} (not checked here).': {
    uk: 'Крутний момент M_t = {mt} kNm передається на підкоси {axis} (тут не перевірено).',
    de: 'Das Torsionsmoment M_t = {mt} kNm geht in die Kopfbänder {axis} (hier nicht nachgewiesen).',
    pl: 'Moment skręcający M_t = {mt} kNm przechodzi na miecze {axis} (tu niesprawdzone).',
  },
  'Wall {side}: F_d = {f} ({how}) on {b} m braced length.': {
    uk: 'Стіна {side}: F_d = {f} ({how}) на {b} m розкріпленої довжини.',
    de: 'Wand {side}: F_d = {f} ({how}) auf {b} m ausgesteifter Länge.',
    pl: 'Ściana {side}: F_d = {f} ({how}) na {b} m stężonej długości.',
  },
  'Wall {side}: F_d = {f} ({how}).': { uk: 'Стіна {side}: F_d = {f} ({how}).', de: 'Wand {side}: F_d = {f} ({how}).', pl: 'Ściana {side}: F_d = {f} ({how}).' },
  'share {a} + torsion {b}': { uk: 'частка {a} + кручення {b}', de: 'Anteil {a} + Verdrehung {b}', pl: 'udział {a} + skręcanie {b}' },
  'share {a} − torsion {b}': { uk: 'частка {a} − кручення {b}', de: 'Anteil {a} − Verdrehung {b}', pl: 'udział {a} − skręcanie {b}' },
  'share {a}': { uk: 'частка {a}', de: 'Anteil {a}', pl: 'udział {a}' },
  'torsion couple from the wind {axis}': { uk: 'пара сил від кручення при вітрі {axis}', de: 'Kräftepaar aus Verdrehung bei Wind {axis}', pl: 'para sił ze skręcania przy wietrze {axis}' },
  'OSB/3 15 mm, ring nails 2.8 × 60 at {s} mm along the panel edges: F_f,Rd = {f} kN per nail (k_mod {k}), f_v,Rd = F_f,Rd/s = {fv} kN/m against v_d = {v} kN/m ({p}, EN 1995-1-1 9.2.4.2).': {
    uk: 'OSB/3 15 mm, рифлені цвяхи 2.8 × 60 з кроком {s} mm по краях плит: F_f,Rd = {f} kN на цвях (k_mod {k}), f_v,Rd = F_f,Rd/s = {fv} kN/m проти v_d = {v} kN/m ({p}, EN 1995-1-1 9.2.4.2).',
    de: 'OSB/3 15 mm, Rillennägel 2,8 × 60 im Abstand {s} mm an den Plattenrändern: F_f,Rd = {f} kN je Nagel (k_mod {k}), f_v,Rd = F_f,Rd/s = {fv} kN/m gegen v_d = {v} kN/m ({p}, EN 1995-1-1 9.2.4.2).',
    pl: 'OSB/3 15 mm, gwoździe pierścieniowe 2,8 × 60 co {s} mm wzdłuż krawędzi płyt: F_f,Rd = {f} kN na gwóźdź (k_mod {k}), f_v,Rd = F_f,Rd/s = {fv} kN/m wobec v_d = {v} kN/m ({p}, EN 1995-1-1 9.2.4.2).',
  },
  'Hold-down T_d = F_i·h/b_i − 0.9·G = {t} at the stretch ends (h = {h} mm).': {
    uk: 'Анкерування T_d = F_i·h/b_i − 0.9·G = {t} на кінцях ділянок (h = {h} mm).',
    de: 'Zugverankerung T_d = F_i·h/b_i − 0.9·G = {t} an den Abschnittsenden (h = {h} mm).',
    pl: 'Zakotwienie T_d = F_i·h/b_i − 0.9·G = {t} na końcach odcinków (h = {h} mm).',
  },
  'Windrispenband 40 × 2 mm, {n} × cross (flattest {a}°, diagonal {d} m): T_d = {t} ≤ N_t,Rd = {r} ({p}).': {
    uk: 'Вітрова стрічка 40 × 2 mm, {n} × хрест (найпологіший {a}°, діагональ {d} m): T_d = {t} ≤ N_t,Rd = {r} ({p}).',
    de: 'Windrispenband 40 × 2 mm, {n} × Kreuz (flachstes {a}°, Diagonale {d} m): T_d = {t} ≤ N_t,Rd = {r} ({p}).',
    pl: 'Taśma wiatrowa 40 × 2 mm, {n} × krzyż (najbardziej płaski {a}°, przekątna {d} m): T_d = {t} ≤ N_t,Rd = {r} ({p}).',
  },
  'Wall {side}: no stretch of at least h/4 between openings for sheet panels.': {
    uk: 'Стіна {side}: між прорізами немає ділянки шириною щонайменше h/4 для плит.',
    de: 'Wand {side}: kein Abschnitt von mindestens h/4 zwischen den Öffnungen für Platten.',
    pl: 'Ściana {side}: brak odcinka o szerokości co najmniej h/4 między otworami na płyty.',
  },
  'Wall {side} has no stretch of at least h/4 between openings for sheet panels – brace another wall or add knee braces.': {
    uk: 'Стіна {side} не має між прорізами ділянки шириною щонайменше h/4 для плит – розкріпіть іншу стіну або додайте підкоси.',
    de: 'Wand {side} hat keinen Abschnitt von mindestens h/4 zwischen den Öffnungen für Platten – eine andere Wand aussteifen oder Kopfbänder ergänzen.',
    pl: 'Ściana {side} nie ma odcinka o szerokości co najmniej h/4 między otworami na płyty – stęż inną ścianę albo dodaj miecze.',
  },
  'Wall {side}: close the nail spacing (down to 50 mm), sheathe both faces or lengthen the braced stretch.': {
    uk: 'Стіна {side}: зменшіть крок цвяхів (до 50 mm), обшийте обидві сторони або подовжте розкріплену ділянку.',
    de: 'Wand {side}: Nagelabstand verringern (bis 50 mm), beidseitig beplanken oder den ausgesteiften Abschnitt verlängern.',
    pl: 'Ściana {side}: zagęść gwoździe (do 50 mm), poszyj obie strony albo wydłuż stężony odcinek.',
  },
  'Anchor the end studs of every braced stretch of wall {side} with a hold-down (Zuganker / hold-down angle bolted into the foundation) for T_d ≥ {t}.': {
    uk: 'Закріпіть крайні стійки кожної розкріпленої ділянки стіни {side} анкером на відрив (Zuganker / анкерний кутник на болтах у фундаменті) на T_d ≥ {t}.',
    de: 'Die Endständer jedes ausgesteiften Abschnitts der Wand {side} mit einem Zuganker (Zugwinkel, in das Fundament gedübelt) für T_d ≥ {t} verankern.',
    pl: 'Zakotw słupki skrajne każdego stężonego odcinka ściany {side} kotwą rozciąganą (Zuganker / kątownik kotwiący przykręcony do fundamentu) na T_d ≥ {t}.',
  },
  'Brace a wall {a} as well: the braced walls {b} stand on one line and cannot take the torsion.': {
    uk: 'Розкріпіть також стіну {a}: розкріплені стіни {b} стоять на одній лінії й не сприймають кручення.',
    de: 'Auch eine Wand {a} aussteifen: die ausgesteiften Wände {b} stehen in einer Linie und können die Verdrehung nicht aufnehmen.',
    pl: 'Stęż również ścianę {a}: stężone ściany {b} stoją w jednej linii i nie przeniosą skręcania.',
  },
  'Roof bracing {axis}': { uk: 'Розкріплення покрівлі {axis}', de: 'Dachverband {axis}', pl: 'Stężenie dachu {axis}' },
  'The braced walls {axis} stand on one line (wall {side}): the roof carries H_d = {h} over {l} m to it as a cantilever diaphragm.': {
    uk: 'Розкріплені стіни {axis} стоять на одній лінії (стіна {side}): дах передає на неї H_d = {h} на довжині {l} m як консольний диск.',
    de: 'Die ausgesteiften Wände {axis} stehen in einer Linie (Wand {side}): das Dach trägt H_d = {h} über {l} m als Kragscheibe dorthin.',
    pl: 'Stężone ściany {axis} stoją w jednej linii (ściana {side}): dach przenosi na nią H_d = {h} na długości {l} m jako tarcza wspornikowa.',
  },
  'Roof covering: {cover} – no reliable diaphragm, so the roof plane needs strap crosses.': {
    uk: 'Покриття: {cover} – не є надійним диском, тож площина даху потребує хрестів зі стрічок.',
    de: 'Dacheindeckung: {cover} – keine verlässliche Scheibe, die Dachebene braucht Bandkreuze.',
    pl: 'Pokrycie: {cover} – nie jest pewną tarczą, więc płaszczyzna dachu wymaga krzyży z taśm.',
  },
  'Shear at the wall line V_d = {v} ({q} kN/m over {d} m depth).': {
    uk: 'Зсув на лінії стіни V_d = {v} ({q} kN/m на глибині {d} m).',
    de: 'Schub an der Wandlinie V_d = {v} ({q} kN/m über {d} m Scheibenhöhe).',
    pl: 'Ścinanie na linii ściany V_d = {v} ({q} kN/m na głębokości {d} m).',
  },
  'Strap cross in the bay at the wall line {a} × {b} m (diagonal {c} m, {deg}°): T_d = {t} ≤ {n} × N_t,Rd = {r} ({p}).': {
    uk: 'Хрест зі стрічок у прольоті біля стіни {a} × {b} m (діагональ {c} m, {deg}°): T_d = {t} ≤ {n} × N_t,Rd = {r} ({p}).',
    de: 'Bandkreuz im Feld an der Wandlinie {a} × {b} m (Diagonale {c} m, {deg}°): T_d = {t} ≤ {n} × N_t,Rd = {r} ({p}).',
    pl: 'Krzyż z taśm w polu przy linii ściany {a} × {b} m (przekątna {c} m, {deg}°): T_d = {t} ≤ {n} × N_t,Rd = {r} ({p}).',
  },
  'Chord force in the edge members N_d = ±{n} (M_d = {m} kNm).': {
    uk: 'Зусилля в поясах (крайніх елементах) N_d = ±{n} (M_d = {m} kNm).',
    de: 'Gurtkraft in den Randgliedern N_d = ±{n} (M_d = {m} kNm).',
    pl: 'Siła w pasach (elementach skrajnych) N_d = ±{n} (M_d = {m} kNm).',
  },
  'Brace a wall at the other end so the roof spans between two wall lines – strap crosses would need {n} straps per diagonal.': {
    uk: 'Розкріпіть стіну на іншому кінці, щоб дах працював між двома лініями стін – хрестам знадобилося б {n} стрічок на діагональ.',
    de: 'Eine Wand am anderen Ende aussteifen, damit das Dach zwischen zwei Wandlinien spannt – Bandkreuze bräuchten {n} Bänder je Diagonale.',
    pl: 'Stęż ścianę na drugim końcu, aby dach pracował między dwiema liniami ścian – krzyże wymagałyby {n} taśm na przekątną.',
  },
  'Fit crossed Windrispenband 40 × 2 ({n} per diagonal) under the roof covering in every bay from wall {side} to the free end, nailed to each member it crosses, with {k} Kammnägel 4.0 × 40 per strap end and anchored into the top of that wall.': {
    uk: 'Встановіть перехресну вітрову стрічку 40 × 2 ({n} на діагональ) під покриттям у кожному прольоті від стіни {side} до вільного кінця, прибиту до кожного елемента, який вона перетинає, з {k} рифленими цвяхами 4.0 × 40 на кінець стрічки й заанкерену у верх цієї стіни.',
    de: 'Gekreuztes Windrispenband 40 × 2 ({n} je Diagonale) unter der Dacheindeckung in jedem Feld von Wand {side} bis zum freien Ende anordnen, an jedes gekreuzte Bauteil genagelt, mit {k} Kammnägeln 4,0 × 40 je Bandende und im Kopf dieser Wand verankert.',
    pl: 'Załóż krzyżową taśmę wiatrową 40 × 2 ({n} na przekątną) pod pokryciem w każdym polu od ściany {side} do wolnego końca, przybitą do każdego przecinanego elementu, z {k} gwoździami pierścieniowymi 4,0 × 40 na koniec taśmy i zakotwioną w górze tej ściany.',
  },
  'Wall {side}: no room for a strap cross.': { uk: 'Стіна {side}: немає місця для хреста зі стрічок.', de: 'Wand {side}: kein Platz für ein Bandkreuz.', pl: 'Ściana {side}: brak miejsca na krzyż z taśm.' },
  'Wall {side} has no stretch free of openings for a strap cross – brace another wall or add knee braces.': {
    uk: 'Стіна {side} не має ділянки без прорізів для хреста зі стрічок – розкріпіть іншу стіну або додайте підкоси.',
    de: 'Wand {side} hat keinen öffnungsfreien Abschnitt für ein Bandkreuz – eine andere Wand aussteifen oder Kopfbänder ergänzen.',
    pl: 'Ściana {side} nie ma odcinka bez otworów na krzyż z taśm – stęż inną ścianę albo dodaj miecze.',
  },
  'Brace a second wall in this plane or add knee braces.': {
    uk: 'Розкріпіть другу стіну в цій площині або додайте підкоси.',
    de: 'Eine zweite Wand in dieser Ebene aussteifen oder Kopfbänder ergänzen.',
    pl: 'Stęż drugą ścianę w tej płaszczyźnie albo dodaj miecze.',
  },

  // ── Uplift chain ──────────────────────────────────────────────────────────────────────
  'Timber-thread roofing screws {d} × {l} mm with EPDM washer into the {support}: thread {t} mm, R_d = {r} per screw (EN 1995-1-1 8.7.2).': {
    uk: 'Покрівельні шурупи з різьбою по дереву {d} × {l} mm з EPDM-шайбою в {support}: різьба {t} mm, R_d = {r} на шуруп (EN 1995-1-1 8.7.2).',
    de: 'Dachschrauben mit Holzgewinde {d} × {l} mm und EPDM-Dichtscheibe in {support}: Gewinde {t} mm, R_d = {r} je Schraube (EN 1995-1-1 8.7.2).',
    pl: 'Wkręty dachowe z gwintem do drewna {d} × {l} mm z podkładką EPDM w {support}: gwint {t} mm, R_d = {r} na wkręt (EN 1995-1-1 8.7.2).',
  },
  '{sec} mm battens': { uk: 'рейки {sec} mm', de: 'Latten {sec} mm', pl: 'łaty {sec} mm' },
  '{sec} mm rafters': { uk: 'крокви {sec} mm', de: 'Sparren {sec} mm', pl: 'krokwie {sec} mm' },
  'Edge zones c_p,net {a}, {n} screws/m²: T_d = {t}; field {b}, {m} screws/m²: T_d = {u} (q_p {q} kN/m², sheet 1.0·g {g} kN/m²) ({p}).': {
    uk: 'Крайові зони c_p,net {a}, {n} шурупів/m²: T_d = {t}; поле {b}, {m} шурупів/m²: T_d = {u} (q_p {q} kN/m², лист 1.0·g {g} kN/m²) ({p}).',
    de: 'Randbereiche c_p,net {a}, {n} Schrauben/m²: T_d = {t}; Feld {b}, {m} Schrauben/m²: T_d = {u} (q_p {q} kN/m², Blech 1,0·g {g} kN/m²) ({p}).',
    pl: 'Strefy brzegowe c_p,net {a}, {n} wkrętów/m²: T_d = {t}; pole {b}, {m} wkrętów/m²: T_d = {u} (q_p {q} kN/m², blacha 1,0·g {g} kN/m²) ({p}).',
  },
  'Pull-through of the sheet per the manufacturer.': { uk: 'Продавлювання листа – за даними виробника.', de: 'Durchknöpfen des Blechs nach Herstellerangabe.', pl: 'Przeciąganie blachy – wg producenta.' },
  'The {d} × {l} mm screw keeps only {t} mm of thread in the {support} (EN 1995-1-1 needs ≥ {n} mm) – use a longer screw.': {
    uk: 'Шуруп {d} × {l} mm має лише {t} mm різьби в {support} (EN 1995-1-1 вимагає ≥ {n} mm) – візьміть довший шуруп.',
    de: 'Die Schraube {d} × {l} mm hat nur {t} mm Gewinde in {support} (EN 1995-1-1 verlangt ≥ {n} mm) – längere Schraube verwenden.',
    pl: 'Wkręt {d} × {l} mm ma tylko {t} mm gwintu w {support} (EN 1995-1-1 wymaga ≥ {n} mm) – użyj dłuższego wkrętu.',
  },
  'Use more roofing screws in the edge zones ({n} per m² now) or longer screws.': {
    uk: 'Поставте більше покрівельних шурупів у крайових зонах (зараз {n} на m²) або довші шурупи.',
    de: 'Mehr Dachschrauben in den Randbereichen setzen (jetzt {n} je m²) oder längere Schrauben verwenden.',
    pl: 'Użyj więcej wkrętów dachowych w strefach brzegowych (teraz {n} na m²) albo dłuższych wkrętów.',
  },
  'Local suction c_p,net {c} ({case}; rafter spacing {s} m, inner supports × 1.25): T_d = 1.5·W − 1.0·G = {t} per bearing.': {
    uk: 'Місцеве відсмоктування c_p,net {c} ({case}; крок крокв {s} m, внутрішні опори × 1.25): T_d = 1.5·W − 1.0·G = {t} на опору.',
    de: 'Örtlicher Sog c_p,net {c} ({case}; Sparrenabstand {s} m, Innenstützen × 1,25): T_d = 1,5·W − 1,0·G = {t} je Auflager.',
    pl: 'Lokalne ssanie c_p,net {c} ({case}; rozstaw krokwi {s} m, podpory wewnętrzne × 1,25): T_d = 1,5·W − 1,0·G = {t} na podporę.',
  },
  '{row}, edge row': { uk: '{row}, крайовий ряд', de: '{row}, Randreihe', pl: '{row}, rząd brzegowy' },
  '{row}, outermost rafter in the edge strip': { uk: '{row}, крайня кроква в крайовій смузі', de: '{row}, äußerster Sparren im Randbereich', pl: '{row}, skrajna krokiew w strefie brzegowej' },
  '{row}, inner rafters': { uk: '{row}, внутрішні крокви', de: '{row}, innere Sparren', pl: '{row}, krokwie wewnętrzne' },
  '{n} Sparrenpfettenanker per bearing, R_k = {rk} kN each (ETA): R_d = {m} × k_mod {k} × R_k / 1.3 = {r}': {
    uk: '{n} анкер(и) кроква–прогін на опору, R_k = {rk} kN кожен (ETA): R_d = {m} × k_mod {k} × R_k / 1.3 = {r}',
    de: '{n} Sparrenpfettenanker je Auflager, R_k = {rk} kN je Anker (ETA): R_d = {m} × k_mod {k} × R_k / 1,3 = {r}',
    pl: '{n} łącznik(i) krokwiowo-płatwiowe na podporę, R_k = {rk} kN każdy (ETA): R_d = {m} × k_mod {k} × R_k / 1,3 = {r}',
  },
  '1 rafter screw Ø8 × 280 mm (EN 1995-1-1 8.7.2): R_d = {r}': {
    uk: '1 шуруп крокви Ø8 × 280 mm (EN 1995-1-1 8.7.2): R_d = {r}',
    de: '1 Sparrenschraube Ø8 × 280 mm (EN 1995-1-1 8.7.2): R_d = {r}',
    pl: '1 wkręt krokwiowy Ø8 × 280 mm (EN 1995-1-1 8.7.2): R_d = {r}',
  },
  'Add a second rafter screw per bearing or a Sparrenpfettenanker.': { uk: 'Додайте другий шуруп на опору або анкер кроква–прогін.', de: 'Eine zweite Sparrenschraube je Auflager oder einen Sparrenpfettenanker ergänzen.', pl: 'Dodaj drugi wkręt na podporę albo łącznik krokwiowo-płatwiowy.' },
  'Use 2 Sparrenpfettenanker per bearing (one each side).': { uk: 'Поставте 2 анкери кроква–прогін на опору (по одному з кожного боку).', de: '2 Sparrenpfettenanker je Auflager verwenden (einer je Seite).', pl: 'Użyj 2 łączników krokwiowo-płatwiowych na podporę (po jednym z każdej strony).' },
  'Reduce the rafter spacing or use rafter anchors with a higher ETA value.': { uk: 'Зменште крок крокв або візьміть анкери з вищим значенням за ETA.', de: 'Sparrenabstand verringern oder Sparrenpfettenanker mit höherem ETA-Wert verwenden.', pl: 'Zmniejsz rozstaw krokwi albo użyj łączników o wyższej wartości ETA.' },
  '{post}: suction 1.5·W = {w} vs. roof + purlin 1.0·G = {g} → T_d = {t} per joint.': {
    uk: '{post}: відсмоктування 1.5·W = {w} проти ваги покрівлі й прогону 1.0·G = {g} → T_d = {t} на вузол.',
    de: '{post}: Sog 1,5·W = {w} gegen Dach + Pfette 1,0·G = {g} → T_d = {t} je Anschluss.',
    pl: '{post}: ssanie 1,5·W = {w} wobec ciężaru dachu i płatwi 1,0·G = {g} → T_d = {t} na połączenie.',
  },
  '2 angle brackets 90×90×65, R_k = {rk} kN each (ETA): R_d = {r}': {
    uk: '2 кутники 90×90×65, R_k = {rk} kN кожен (ETA): R_d = {r}',
    de: '2 Winkelverbinder 90×90×65, R_k = {rk} kN je Winkel (ETA): R_d = {r}',
    pl: '2 kątowniki 90×90×65, R_k = {rk} kN każdy (ETA): R_d = {r}',
  },
  '2 fully threaded screws 8 × 300 mm do not reach the post through the {h} mm purlin': {
    uk: '2 шурупи з повною різьбою 8 × 300 mm не дістають стовпа крізь прогін {h} mm',
    de: '2 Vollgewindeschrauben 8 × 300 mm erreichen den Pfosten durch die {h} mm hohe Pfette nicht',
    pl: '2 wkręty z pełnym gwintem 8 × 300 mm nie sięgają słupa przez płatew {h} mm',
  },
  '2 fully threaded screws 8 × 300 mm from the purlin top, {l} mm thread in the post end grain (EN 1995-1-1 8.7.2, α = 0°): R_d = {r}': {
    uk: '2 шурупи з повною різьбою 8 × 300 mm згори крізь прогін, {l} mm різьби в торці стовпа (EN 1995-1-1 8.7.2, α = 0°): R_d = {r}',
    de: '2 Vollgewindeschrauben 8 × 300 mm von der Pfettenoberseite, {l} mm Gewinde im Hirnholz des Pfostens (EN 1995-1-1 8.7.2, α = 0°): R_d = {r}',
    pl: '2 wkręty z pełnym gwintem 8 × 300 mm od góry płatwi, {l} mm gwintu w czole słupa (EN 1995-1-1 8.7.2, α = 0°): R_d = {r}',
  },
  'Perforated strap (Lochband) 40 × 2 mm over the purlin, {n} Kammnägel 4.0 × 40 per leg on both post faces: R_d = {r}': {
    uk: 'Перфострічка (Lochband) 40 × 2 mm через прогін, {n} рифлених цвяхів 4.0 × 40 на кожну гілку з обох боків стовпа: R_d = {r}',
    de: 'Lochband 40 × 2 mm über die Pfette, {n} Kammnägel 4,0 × 40 je Schenkel an beiden Pfostenseiten: R_d = {r}',
    pl: 'Taśma perforowana (Lochband) 40 × 2 mm przez płatew, {n} gwoździ pierścieniowych 4,0 × 40 na ramię po obu stronach słupa: R_d = {r}',
  },
  'Use longer screws (purlin height + ≥ 100 mm) or angle brackets / a perforated strap.': { uk: 'Візьміть довші шурупи (висота прогону + ≥ 100 mm) або кутники / перфострічку.', de: 'Längere Schrauben (Pfettenhöhe + ≥ 100 mm) oder Winkelverbinder / Lochband verwenden.', pl: 'Użyj dłuższych wkrętów (wysokość płatwi + ≥ 100 mm) albo kątowników / taśmy perforowanej.' },
  'Choose a stronger purlin–post connector (angle brackets / perforated strap) or add one each side.': { uk: 'Оберіть міцніше з’єднання прогону зі стовпом (кутники / перфострічка) або додайте по одному з кожного боку.', de: 'Einen stärkeren Anschluss Pfette–Pfosten wählen (Winkelverbinder / Lochband) oder je Seite einen ergänzen.', pl: 'Wybierz mocniejsze połączenie płatew–słup (kątowniki / taśma perforowana) albo dodaj po jednym z każdej strony.' },
  '{post}: 1.5·W = {w} vs. 1.0·G = {g} (roof, purlin, post) → T_d = {t}.': {
    uk: '{post}: 1.5·W = {w} проти 1.0·G = {g} (покрівля, прогін, стовп) → T_d = {t}.',
    de: '{post}: 1,5·W = {w} gegen 1,0·G = {g} (Dach, Pfette, Pfosten) → T_d = {t}.',
    pl: '{post}: 1,5·W = {w} wobec 1,0·G = {g} (dach, płatew, słup) → T_d = {t}.',
  },
  '2 × M12 bolts in double shear through the post (EN 1995-1-1 8.2.3, load parallel to the grain): R_d = {r}': {
    uk: '2 болти M12 з двома зрізами крізь стовп (EN 1995-1-1 8.2.3, навантаження вздовж волокон): R_d = {r}',
    de: '2 Bolzen M12 zweischnittig durch den Pfosten (EN 1995-1-1 8.2.3, Last in Faserrichtung): R_d = {r}',
    pl: '2 śruby M12 dwucięte przez słup (EN 1995-1-1 8.2.3, obciążenie wzdłuż włókien): R_d = {r}',
  },
  'Adjustable post base: resistance only from its ETA – not verified here.': { uk: 'Регульована опора: несуча здатність лише за ETA – тут не перевіряється.', de: 'Höhenverstellbarer Pfostenträger: Widerstand nur aus seiner ETA – hier nicht nachgewiesen.', pl: 'Regulowana podstawa: nośność tylko z ETA – tutaj nie sprawdzana.' },
  'Check the adjustable post base and its anchor for {t} tension per its ETA – or use cast-in H post bases.': {
    uk: 'Перевірте регульовану опору та її анкер на розтяг {t} за ETA – або використайте забетоновані H-анкери.',
    de: 'Den höhenverstellbaren Pfostenträger und seinen Anker für {t} Zug nach ETA prüfen – oder einbetonierte H-Pfostenanker verwenden.',
    pl: 'Sprawdź regulowaną podstawę i jej kotwę na rozciąganie {t} wg ETA – albo użyj zabetonowanych kotew H.',
  },
  'Use a reinforced H post base with more bolts, or add weight / knee braces.': { uk: 'Візьміть посилений H-анкер з більшою кількістю болтів або додайте вагу / підкоси.', de: 'Verstärkten H-Pfostenanker mit mehr Bolzen verwenden oder Gewicht / Kopfbänder ergänzen.', pl: 'Użyj wzmocnionej kotwy H z większą liczbą śrub albo dodaj ciężar / miecze.' },
  '{post}: uplift 1.5·W = {w} vs. 0.9·G = 0.9 × (roof + purlin {a} + post {b} + concrete {size} × {d} mm {c}) = {g} ({p}).': {
    uk: '{post}: відрив 1.5·W = {w} проти 0.9·G = 0.9 × (покрівля + прогін {a} + стовп {b} + бетон {size} × {d} mm {c}) = {g} ({p}).',
    de: '{post}: Abheben 1,5·W = {w} gegen 0,9·G = 0,9 × (Dach + Pfette {a} + Pfosten {b} + Beton {size} × {d} mm {c}) = {g} ({p}).',
    pl: '{post}: oderwanie 1,5·W = {w} wobec 0,9·G = 0,9 × (dach + płatew {a} + słup {b} + beton {size} × {d} mm {c}) = {g} ({p}).',
  },
  'Soil weight and skin friction are not counted.': { uk: 'Вагу ґрунту й тертя по боковій поверхні не враховано.', de: 'Bodengewicht und Mantelreibung sind nicht angesetzt.', pl: 'Ciężaru gruntu i tarcia bocznego nie uwzględniono.' },
  'The H post anchor is cast {e} mm into the concrete – found at least {d} mm deep.': {
    uk: 'H-анкер забетоновано на {e} mm – закладайте фундамент щонайменше на {d} mm.',
    de: 'Der H-Pfostenanker ist {e} mm einbetoniert – mindestens {d} mm tief gründen.',
    pl: 'Kotwa H jest zabetonowana na {e} mm – posadów co najmniej {d} mm głęboko.',
  },
  'Enlarge the foundations to {a} × {b} × {d} mm.': { uk: 'Збільште фундаменти до {a} × {b} × {d} mm.', de: 'Fundamente auf {a} × {b} × {d} mm vergrößern.', pl: 'Powiększ fundamenty do {a} × {b} × {d} mm.' },
  'Deepen the foundations or tie the posts into a strip foundation.': { uk: 'Заглибте фундаменти або об’єднайте стовпи стрічковим фундаментом.', de: 'Fundamente tiefer gründen oder die Pfosten in ein Streifenfundament einbinden.', pl: 'Pogłęb fundamenty albo połącz słupy ławą fundamentową.' },

  // ── Knee brace ends ───────────────────────────────────────────────────────────────────
  'Brace force N_d = {n} (tension or compression) on {fasteners} per end in single shear: F_v,Rd = {f} per fastener (EN 1995-1-1 8.2.2), R_d = {r} ({p}).': {
    uk: 'Зусилля в підкосі N_d = {n} (розтяг або стиск) на {fasteners} на кінець, один зріз: F_v,Rd = {f} на з’єднувач (EN 1995-1-1 8.2.2), R_d = {r} ({p}).',
    de: 'Strebenkraft N_d = {n} (Zug oder Druck) auf {fasteners} je Ende, einschnittig: F_v,Rd = {f} je Verbindungsmittel (EN 1995-1-1 8.2.2), R_d = {r} ({p}).',
    pl: 'Siła w mieczu N_d = {n} (rozciąganie lub ściskanie) na {fasteners} na koniec, jednocięte: F_v,Rd = {f} na łącznik (EN 1995-1-1 8.2.2), R_d = {r} ({p}).',
  },
  '2 structural screws Ø8 × 200 mm': { uk: '2 конструкційні шурупи Ø8 × 200 mm', de: '2 Konstruktionsschrauben Ø8 × 200 mm', pl: '2 wkręty konstrukcyjne Ø8 × 200 mm' },
  '1 bolt M12 with washers': { uk: '1 болт M12 із шайбами', de: '1 Bolzen M12 mit Scheiben', pl: '1 śruba M12 z podkładkami' },
  'Use 2 structural screws Ø8 × 200 mm plus the bolt, or larger knee braces.': { uk: 'Додайте до болта 2 конструкційні шурупи Ø8 × 200 mm або візьміть більші підкоси.', de: 'Zusätzlich zum Bolzen 2 Konstruktionsschrauben Ø8 × 200 mm setzen oder größere Kopfbänder verwenden.', pl: 'Dodaj do śruby 2 wkręty konstrukcyjne Ø8 × 200 mm albo użyj większych mieczy.' },
  'Use a bolt M12 per brace end in addition, or larger knee braces.': { uk: 'Додайте болт M12 на кожен кінець підкоса або візьміть більші підкоси.', de: 'Zusätzlich einen Bolzen M12 je Kopfbandende setzen oder größere Kopfbänder verwenden.', pl: 'Dodaj śrubę M12 na każdy koniec miecza albo użyj większych mieczy.' },

  // ── Studs and battens in wind ─────────────────────────────────────────────────────────
  'Wall studs {sec} mm ({h} in the wind direction), simply supported over {l} m, spacing {s} mm: w = c_p {cp} ({kind}) × q_p {q} kN/m² × {m} m = {w} kN/m.': {
    uk: 'Стійки стін {sec} mm ({h} у напрямку вітру), шарнірно оперті на {l} m, крок {s} mm: w = c_p {cp} ({kind}) × q_p {q} kN/m² × {m} m = {w} kN/m.',
    de: 'Ständer {sec} mm ({h} in Windrichtung), Einfeldträger über {l} m, Abstand {s} mm: w = c_p {cp} ({kind}) × q_p {q} kN/m² × {m} m = {w} kN/m.',
    pl: 'Słupki ścian {sec} mm ({h} w kierunku wiatru), swobodnie podparte na {l} m, rozstaw {s} mm: w = c_p {cp} ({kind}) × q_p {q} kN/m² × {m} m = {w} kN/m.',
  },
  'Screen battens {sec} mm ({h} in the wind direction), simply supported over {l} m, spacing {s} mm: w = c_p {cp} ({kind}) × q_p {q} kN/m² × {m} m = {w} kN/m.': {
    uk: 'Рейки екрана {sec} mm ({h} у напрямку вітру), шарнірно оперті на {l} m, крок {s} mm: w = c_p {cp} ({kind}) × q_p {q} kN/m² × {m} m = {w} kN/m.',
    de: 'Traglatten {sec} mm ({h} in Windrichtung), Einfeldträger über {l} m, Abstand {s} mm: w = c_p {cp} ({kind}) × q_p {q} kN/m² × {m} m = {w} kN/m.',
    pl: 'Łaty ekranu {sec} mm ({h} w kierunku wiatru), swobodnie podparte na {l} m, rozstaw {s} mm: w = c_p {cp} ({kind}) × q_p {q} kN/m² × {m} m = {w} kN/m.',
  },
  porous: { uk: 'проникний', de: 'durchlässig', pl: 'ażurowy' },
  'closed boarding': { uk: 'суцільна обшивка', de: 'geschlossene Schalung', pl: 'pełne deskowanie' },
  'σ_m,d = {s} ≤ f_m,d = {f} N/mm² ({p}), w_inst = {w} mm ≤ L/{n} = {l} mm': { uk: 'σ_m,d = {s} ≤ f_m,d = {f} N/mm² ({p}), w_inst = {w} mm ≤ L/{n} = {l} mm', de: 'σ_m,d = {s} ≤ f_m,d = {f} N/mm² ({p}), w_inst = {w} mm ≤ L/{n} = {l} mm', pl: 'σ_m,d = {s} ≤ f_m,d = {f} N/mm² ({p}), w_inst = {w} mm ≤ L/{n} = {l} mm' },
  'Smallest passing section of 40×60 / 60×60 / 60×80 / 80×80: {x}; the current section passes up to {s} spacing.': {
    uk: 'Найменший достатній переріз із 40×60 / 60×60 / 60×80 / 80×80: {x}; поточний переріз витримує крок до {s}.',
    de: 'Kleinster ausreichender Querschnitt aus 40×60 / 60×60 / 60×80 / 80×80: {x}; der jetzige Querschnitt reicht bis {s} Abstand.',
    pl: 'Najmniejszy wystarczający przekrój z 40×60 / 60×60 / 60×80 / 80×80: {x}; obecny przekrój wystarcza do rozstawu {s}.',
  },
  none: { uk: 'жодного', de: 'keiner', pl: 'żaden' },
  'Use {sec} mm ({h} in the wind direction) or reduce the spacing to ≤ {s} mm.': { uk: 'Візьміть {sec} mm ({h} у напрямку вітру) або зменште крок до ≤ {s} mm.', de: '{sec} mm verwenden ({h} in Windrichtung) oder den Abstand auf ≤ {s} mm verringern.', pl: 'Użyj {sec} mm ({h} w kierunku wiatru) albo zmniejsz rozstaw do ≤ {s} mm.' },
  'Use {sec} mm ({h} in the wind direction).': { uk: 'Візьміть {sec} mm ({h} у напрямку вітру).', de: '{sec} mm verwenden ({h} in Windrichtung).', pl: 'Użyj {sec} mm ({h} w kierunku wiatru).' },
  'Use a larger section than 80×80 mm or reduce the spacing to ≤ {s} mm.': { uk: 'Візьміть переріз більший за 80×80 mm або зменште крок до ≤ {s} mm.', de: 'Einen größeren Querschnitt als 80×80 mm verwenden oder den Abstand auf ≤ {s} mm verringern.', pl: 'Użyj przekroju większego niż 80×80 mm albo zmniejsz rozstaw do ≤ {s} mm.' },
  'Use a larger section than 80×80 mm.': { uk: 'Візьміть переріз більший за 80×80 mm.', de: 'Einen größeren Querschnitt als 80×80 mm verwenden.', pl: 'Użyj przekroju większego niż 80×80 mm.' },

  // ── Roof battens and sheets ───────────────────────────────────────────────────────────
  '{n} rows {sec} mm across the fall line at {g} mm along the slope (sheet max. span {m} mm, {p}), spanning {s} mm between rafters.': {
    uk: '{n} рядів {sec} mm поперек схилу з кроком {g} mm уздовж схилу (макс. проліт листа {m} mm, {p}), проліт {s} mm між кроквами.',
    de: '{n} Reihen {sec} mm quer zur Falllinie im Abstand {g} mm entlang der Neigung (max. Stützweite Blech {m} mm, {p}), Spannweite {s} mm zwischen den Sparren.',
    pl: '{n} rzędów {sec} mm w poprzek spadku co {g} mm wzdłuż spadku (maks. rozpiętość blachy {m} mm, {p}), rozpiętość {s} mm między krokwiami.',
  },
  'Governing {combo}: σ_m,d = {sigma} ≤ f_m,d = {fmd} N/mm² ({p1}), w_fin = {wfin} mm ≤ {wlim} mm.': {
    uk: 'Визначальне {combo}: σ_m,d = {sigma} ≤ f_m,d = {fmd} N/mm² ({p1}), w_fin = {wfin} mm ≤ {wlim} mm.',
    de: 'Maßgebend {combo}: σ_m,d = {sigma} ≤ f_m,d = {fmd} N/mm² ({p1}), w_fin = {wfin} mm ≤ {wlim} mm.',
    pl: 'Miarodajna {combo}: σ_m,d = {sigma} ≤ f_m,d = {fmd} N/mm² ({p1}), w_fin = {wfin} mm ≤ {wlim} mm.',
  },
  'Lay the battens at ≤ {m} mm along the slope.': { uk: 'Кладіть рейки з кроком ≤ {m} mm уздовж схилу.', de: 'Latten im Abstand ≤ {m} mm entlang der Neigung verlegen.', pl: 'Układaj łaty co ≤ {m} mm wzdłuż spadku.' },
  'Use deeper battens or reduce the rafter spacing.': { uk: 'Візьміть вищі рейки або зменште крок крокв.', de: 'Höhere Latten verwenden oder den Sparrenabstand verringern.', pl: 'Użyj wyższych łat albo zmniejsz rozstaw krokwi.' },
  'The level {sec} mm rafters run across the fall line and carry the sheet directly – no battens needed.': {
    uk: 'Горизонтальні крокви {sec} mm лежать поперек схилу й несуть лист безпосередньо – обрешітка не потрібна.',
    de: 'Die waagerechten Sparren {sec} mm liegen quer zur Falllinie und tragen das Blech direkt – keine Lattung nötig.',
    pl: 'Poziome krokwie {sec} mm leżą w poprzek spadku i niosą blachę bezpośrednio – łaty niepotrzebne.',
  },
  'Spacing {s} mm ≤ profile max. span {m} mm ({p}).': { uk: 'Крок {s} mm ≤ макс. проліт профілю {m} mm ({p}).', de: 'Abstand {s} mm ≤ max. Stützweite des Profils {m} mm ({p}).', pl: 'Rozstaw {s} mm ≤ maks. rozpiętość profilu {m} mm ({p}).' },
  'Reduce the rafter spacing to ≤ {m} mm.': { uk: 'Зменште крок крокв до ≤ {m} mm.', de: 'Sparrenabstand auf ≤ {m} mm verringern.', pl: 'Zmniejsz rozstaw krokwi do ≤ {m} mm.' },
  'Roof: {covering} – {n} sheets × {l} mm': { uk: 'Покрівля: {covering} – {n} листів × {l} mm', de: 'Dach: {covering} – {n} Tafeln × {l} mm', pl: 'Dach: {covering} – {n} arkuszy × {l} mm' },
  'Across the fall line': { uk: 'Поперек схилу', de: 'Quer zur Falllinie', pl: 'W poprzek spadku' },
  'Across the fall line, joined over a rafter': { uk: 'Поперек схилу, стик над кроквою', de: 'Quer zur Falllinie, gestoßen über einem Sparren', pl: 'W poprzek spadku, styk nad krokwią' },
  'Upper cut {deg}° against the sloped rail': { uk: 'Верхній зріз {deg}° впритул до похилого ригеля', de: 'Oberer Schnitt {deg}° gegen das geneigte Rähm', pl: 'Górne cięcie {deg}° do ukośnego oczepu' },

  // ── Foundations ───────────────────────────────────────────────────────────────────────
  '{post}: N_d = {n} + 1.35 × footing {size} × {h} mm {g} = {nd} on {a} m²: σ_d = {s} ≤ σ_R,d = {r} kN/m² ({soil}, DIN 1054 Annex A) ({p}).': {
    uk: '{post}: N_d = {n} + 1.35 × фундамент {size} × {h} mm {g} = {nd} на {a} m²: σ_d = {s} ≤ σ_R,d = {r} kN/m² ({soil}, DIN 1054 додаток A) ({p}).',
    de: '{post}: N_d = {n} + 1,35 × Fundament {size} × {h} mm {g} = {nd} auf {a} m²: σ_d = {s} ≤ σ_R,d = {r} kN/m² ({soil}, DIN 1054 Anhang A) ({p}).',
    pl: '{post}: N_d = {n} + 1,35 × stopa {size} × {h} mm {g} = {nd} na {a} m²: σ_d = {s} ≤ σ_R,d = {r} kN/m² ({soil}, DIN 1054 załącznik A) ({p}).',
  },
  'Enlarge the footings to {size} mm (or found deeper).': { uk: 'Збільште фундаменти до {size} mm (або заглибте їх).', de: 'Fundamente auf {size} mm vergrößern (oder tiefer gründen).', pl: 'Powiększ stopy do {size} mm (albo posadów głębiej).' },
  'Use a strip foundation or a slab – a single footing up to 1000 mm is not enough.': { uk: 'Влаштуйте стрічковий фундамент або плиту – окремого фундаменту до 1000 mm недостатньо.', de: 'Streifenfundament oder Bodenplatte verwenden – ein Einzelfundament bis 1000 mm reicht nicht aus.', pl: 'Zastosuj ławę albo płytę – pojedyncza stopa do 1000 mm nie wystarcza.' },

  // ── Parts list: hardware ──────────────────────────────────────────────────────────────
  'H post anchor, cast-in, hot-dip galvanised': { uk: 'H-анкер стовпа, під бетонування, гарячеоцинкований', de: 'H-Pfostenanker zum Einbetonieren, feuerverzinkt', pl: 'Kotwa słupa H do zabetonowania, ocynkowana ogniowo' },
  'H post anchor, reinforced, cast-in, hot-dip galvanised': { uk: 'H-анкер стовпа посилений, під бетонування, гарячеоцинкований', de: 'H-Pfostenanker verstärkt, zum Einbetonieren, feuerverzinkt', pl: 'Kotwa słupa H wzmocniona, do zabetonowania, ocynkowana ogniowo' },
  '{w} mm clear, flat steel {f}': { uk: 'просвіт {w} mm, смуга {f}', de: '{w} mm lichte Weite, Flachstahl {f}', pl: 'prześwit {w} mm, płaskownik {f}' },
  '{a} mm cast into the foundation, post {b} mm above the concrete': { uk: '{a} mm забетоновано у фундамент, стовп на {b} mm над бетоном', de: '{a} mm einbetoniert, Pfosten {b} mm über dem Beton', pl: '{a} mm zabetonowane w fundamencie, słup {b} mm nad betonem' },
  'Hex bolt with nut and 2 washers': { uk: 'Болт із шестигранною головкою, гайкою та 2 шайбами', de: 'Sechskantschraube mit Mutter und 2 Scheiben', pl: 'Śruba z łbem sześciokątnym, nakrętką i 2 podkładkami' },
  'Hex bolt with nut and 2 washers (knee brace)': { uk: 'Болт із гайкою та 2 шайбами (підкіс)', de: 'Sechskantschraube mit Mutter und 2 Scheiben (Kopfband)', pl: 'Śruba z nakrętką i 2 podkładkami (miecz)' },
  '2 per post anchor': { uk: 'по 2 на анкер стовпа', de: '2 je Pfostenanker', pl: '2 na kotwę słupa' },
  '{n} per rafter bearing': { uk: 'по {n} на опору крокви', de: '{n} je Sparrenauflager', pl: '{n} na oparcie krokwi' },
  '12 per anchor': { uk: 'по 12 на анкер', de: '12 je Anker', pl: '12 na łącznik' },
  '20 per bracket': { uk: 'по 20 на кутник', de: '20 je Winkel', pl: '20 na kątownik' },
  '2 per post–purlin joint': { uk: 'по 2 на вузол стовп–прогін', de: '2 je Anschluss Pfosten–Pfette', pl: '2 na połączenie słup–płatew' },
  'Fully threaded screws, purlin → post': { uk: 'Шурупи з повною різьбою, прогін → стовп', de: 'Vollgewindeschrauben Pfette → Pfosten', pl: 'Wkręty z pełnym gwintem, płatew → słup' },
  '2 per post–purlin joint, from the purlin top': { uk: 'по 2 на вузол стовп–прогін, згори крізь прогін', de: '2 je Anschluss Pfosten–Pfette, von der Pfettenoberseite', pl: '2 na połączenie słup–płatew, od góry płatwi' },
  'Perforated steel strap over the purlin': { uk: 'Сталева перфострічка через прогін', de: 'Lochband über die Pfette', pl: 'Stalowa taśma perforowana przez płatew' },
  '40 × 2 mm, galvanised': { uk: '40 × 2 mm, оцинкована', de: '40 × 2 mm, verzinkt', pl: '40 × 2 mm, ocynkowana' },
  '1 per post–purlin joint, nailed to both post faces': { uk: 'по 1 на вузол стовп–прогін, прибита до обох боків стовпа', de: '1 je Anschluss Pfosten–Pfette, an beide Pfostenseiten genagelt', pl: '1 na połączenie słup–płatew, przybita do obu boków słupa' },
  '6 per strap leg': { uk: 'по 6 на гілку стрічки', de: '6 je Bandschenkel', pl: '6 na ramię taśmy' },
  '1 per brace end': { uk: 'по 1 на кінець підкоса', de: '1 je Kopfbandende', pl: '1 na koniec miecza' },
  'Angle bracket holding the stud foot sideways (no tension)': { uk: 'Кутник, що утримує низ стійки збоку (без розтягу)', de: 'Winkel als seitliche Fußhalterung des Ständers (kein Zug)', pl: 'Kątownik trzymający stopę słupka z boku (bez rozciągania)' },
  '70×70×55 mm + concrete screws': { uk: '70×70×55 mm + шурупи по бетону', de: '70×70×55 mm + Betonschrauben', pl: '70×70×55 mm + wkręty do betonu' },
  '1 per stud, studs hang from the rail': { uk: 'по 1 на стійку, стійки підвішені до ригеля', de: '1 je Ständer, Ständer hängen am Rähm', pl: '1 na słupek, słupki zawieszone na oczepie' },
  'Concrete screws (bottom plate → base)': { uk: 'Шурупи по бетону (нижня обв’язка → основа)', de: 'Betonschrauben (Schwelle → Untergrund)', pl: 'Wkręty do betonu (podwalina → podłoże)' },
  'Max. {m} mm apart, {e} mm from plate ends, through {s} mm spacers': { uk: 'Крок макс. {m} mm, {e} mm від кінців обв’язки, крізь підкладки {s} mm', de: 'Max. {m} mm Abstand, {e} mm von den Schwellenenden, durch {s} mm Unterlagen', pl: 'Maks. co {m} mm, {e} mm od końców podwaliny, przez podkładki {s} mm' },
  'Plastic spacer pads under the bottom plate': { uk: 'Пластикові підкладки під нижню обв’язку', de: 'Kunststoff-Unterlegplatten unter der Schwelle', pl: 'Plastikowe podkładki pod podwalinę' },
  '1 at every concrete screw': { uk: 'по 1 біля кожного шурупа по бетону', de: '1 an jeder Betonschraube', pl: '1 przy każdym wkręcie do betonu' },
  'Angle brackets with concrete screws (end stud → base)': { uk: 'Кутники з шурупами по бетону (крайня стійка → основа)', de: 'Winkelverbinder mit Betonschrauben (Endständer → Untergrund)', pl: 'Kątowniki z wkrętami do betonu (słupek skrajny → podłoże)' },
  'Wind bracing strap (Windrispenband), crossed diagonals': { uk: 'Вітрова стрічка (Windrispenband), перехресні діагоналі', de: 'Windrispenband, gekreuzte Diagonalen', pl: 'Taśma wiatrowa (Windrispenband), krzyżowe przekątne' },
  '{n} diagonals + 10 %': { uk: '{n} діагоналей + 10 %', de: '{n} Diagonalen + 10 %', pl: '{n} przekątnych + 10 %' },
  'Strap tensioner': { uk: 'Натягувач стрічки', de: 'Windrispenband-Spanner', pl: 'Napinacz taśmy' },
  'for 40 × 2 mm': { uk: 'для 40 × 2 mm', de: 'für 40 × 2 mm', pl: 'do 40 × 2 mm' },
  '1 per diagonal': { uk: 'по 1 на діагональ', de: '1 je Diagonale', pl: '1 na przekątną' },
  '{n} per strap end + 2 per stud crossing': { uk: 'по {n} на кінець стрічки + 2 на кожне перетинання стійки', de: '{n} je Bandende + 2 je Ständerkreuzung', pl: '{n} na koniec taśmy + 2 na każde skrzyżowanie ze słupkiem' },
  '2 per stud / batten crossing': { uk: 'по 2 на кожне перетинання стійки / рейки', de: '2 je Ständer- / Lattenkreuzung', pl: '2 na każde skrzyżowanie ze słupkiem / łatą' },
  'Roofing screws with timber thread and EPDM washer': { uk: 'Покрівельні шурупи з різьбою по дереву та EPDM-шайбою', de: 'Dachschrauben mit Holzgewinde und EPDM-Dichtscheibe', pl: 'Wkręty dachowe z gwintem do drewna i podkładką EPDM' },
  '{a} per m² in the field, {b} per m² in the edge and corner zones': { uk: '{a} на m² у полі, {b} на m² у крайових і кутових зонах', de: '{a} je m² im Feld, {b} je m² in Rand- und Eckbereichen', pl: '{a} na m² w polu, {b} na m² w strefach brzegowych i narożnych' },
  'Batten screws (batten → rafter)': { uk: 'Шурупи для обрешітки (рейка → кроква)', de: 'Holzbauschrauben Lattung (Latte → Sparren)', pl: 'Wkręty do łat (łata → krokiew)' },
  '1 per batten–rafter crossing': { uk: 'по 1 на перетинання рейки з кроквою', de: '1 je Kreuzung Latte–Sparren', pl: '1 na skrzyżowanie łata–krokiew' },

  // ── Parts list: materials ─────────────────────────────────────────────────────────────
  'Eave trim with drip edge (Tropfkante)': { uk: 'Карнизна планка з крапельником (Tropfkante)', de: 'Traufblech mit Tropfkante', pl: 'Obróbka okapu z kapinosem (Tropfkante)' },
  'Coated steel, 2 m lengths, {n} pcs': { uk: 'Сталь із покриттям, по 2 m, {n} шт', de: 'Beschichteter Stahl, 2-m-Längen, {n} Stk', pl: 'Stal powlekana, odcinki 2 m, {n} szt.' },
  'Low eave, under the sheet ends': { uk: 'Нижній карниз, під кінцями листів', de: 'Traufe, unter den Blechenden', pl: 'Dolny okap, pod końcami blach' },
  'Verge trim': { uk: 'Фронтонна планка', de: 'Ortgangblech', pl: 'Obróbka wiatrownicy' },
  'Both verges, over the first and last sheet run': { uk: 'Обидва фронтони, над першим і останнім рядом листів', de: 'Beide Ortgänge, über der ersten und letzten Blechbahn', pl: 'Oba szczyty, nad pierwszym i ostatnim pasem blach' },
  'Top edge trim (high eave)': { uk: 'Верхня торцева планка (високий карниз)', de: 'Pultabschlussblech (hohe Traufe)', pl: 'Obróbka górnej krawędzi (wysoki okap)' },
  'High eave, over the sheet tops': { uk: 'Високий карниз, над верхом листів', de: 'Hohe Traufe, über den Blechoberkanten', pl: 'Wysoki okap, nad górnymi końcami blach' },
  'Concrete C20/25 (point foundations)': { uk: 'Бетон C20/25 (стовпчасті фундаменти)', de: 'Beton C20/25 (Punktfundamente)', pl: 'Beton C20/25 (stopy fundamentowe)' },
  'Concrete C20/25 (point foundations and wall curb)': { uk: 'Бетон C20/25 (стовпчасті фундаменти та цоколь стін)', de: 'Beton C20/25 (Punktfundamente und Sockel)', pl: 'Beton C20/25 (stopy i cokół ścian)' },
  '{a} + curb {w} × {h} mm, {l} m': { uk: '{a} + цоколь {w} × {h} mm, {l} m', de: '{a} + Sockel {w} × {h} mm, {l} m', pl: '{a} + cokół {w} × {h} mm, {l} m' },
  '= {n} bags of 25 kg ready-mix ({l} l each)': { uk: '= {n} мішків сухої суміші по 25 kg (по {l} l)', de: '= {n} Sack Fertigbeton à 25 kg (je {l} l)', pl: '= {n} worków gotowej mieszanki po 25 kg (po {l} l)' },
  'Bitumen strip R500 under the bottom plates': { uk: 'Бітумна стрічка R500 під нижню обв’язку', de: 'Bitumenbahn R500 unter der Schwelle', pl: 'Pasek papy R500 pod podwaliną' },
  '+{n} % laps': { uk: '+{n} % на нахлести', de: '+{n} % Überlappung', pl: '+{n} % na zakłady' },
  'OSB/3 sheathing of the braced walls': { uk: 'Обшивка OSB/3 жорстких стін', de: 'OSB/3-Beplankung der ausgesteiften Wände', pl: 'Poszycie OSB/3 ścian usztywniających' },
  '{t} mm or thicker, nailed at ≤ 150 mm on every stud and plate': {
    uk: '{t} мм або товщі, цвяхи з кроком ≤ 150 мм на кожній стійці та обв’язці',
    de: '{t} mm oder dicker, Nagelabstand ≤ 150 mm an jedem Ständer und jeder Schwelle',
    pl: '{t} mm lub grubsze, gwoździe co ≤ 150 mm na każdym słupku i podwalinie',
  },
  'Facade membrane behind the cladding': { uk: 'Фасадна мембрана за обшивкою', de: 'Fassadenbahn hinter der Schalung', pl: 'Membrana fasadowa za deskowaniem' },
  'UV-resistant, sd ≤ 0.1 m': { uk: 'стійка до УФ, sd ≤ 0.1 m', de: 'UV-beständig, sd ≤ 0,1 m', pl: 'odporna na UV, sd ≤ 0,1 m' },
  'Ventilation grilles': { uk: 'Вентиляційні решітки', de: 'Lüftungsgitter', pl: 'Kratki wentylacyjne' },
  '≈ 200 × 100 mm, insect mesh': { uk: '≈ 200 × 100 mm, сітка від комах', de: '≈ 200 × 100 mm, Insektenschutzgitter', pl: '≈ 200 × 100 mm, siatka na owady' },
  'Floor build-up: crushed gravel 0/32': { uk: 'Підлога: щебінь 0/32', de: 'Fußbodenaufbau: Schotter 0/32', pl: 'Podłoga: tłuczeń 0/32' },
  '15 cm compacted': { uk: '15 cm, ущільнений', de: '15 cm verdichtet', pl: '15 cm zagęszczony' },
  'Floor build-up: PE film': { uk: 'Підлога: поліетиленова плівка', de: 'Fußbodenaufbau: PE-Folie', pl: 'Podłoga: folia PE' },
  'Floor build-up: bedding grit 0/5': { uk: 'Підлога: відсів 0/5', de: 'Fußbodenaufbau: Splitt 0/5', pl: 'Podłoga: grys 0/5' },
  'Floor build-up: concrete slabs': { uk: 'Підлога: бетонні плити', de: 'Fußbodenaufbau: Betonplatten', pl: 'Podłoga: płyty betonowe' },
  '600 × 400 × 45 mm, {a} m² less {b} m² in stock': { uk: '600 × 400 × 45 mm, {a} m² мінус {b} m² у наявності', de: '600 × 400 × 45 mm, {a} m² abzüglich {b} m² vorhanden', pl: '600 × 400 × 45 mm, {a} m² minus {b} m² na stanie' },
  'Covered by the slabs in stock – none to buy': { uk: 'Покривається наявними плитами – купувати не треба', de: 'Durch vorhandene Platten gedeckt – nichts zu kaufen', pl: 'Pokryte płytami na stanie – nic do kupienia' },
  '+{n} % cutting': { uk: '+{n} % на підрізання', de: '+{n} % Verschnitt', pl: '+{n} % na docinanie' },
  '{label}, spruce': { uk: '{label}, ялина', de: '{label}, Fichte', pl: '{label}, świerk' },
  '{label}, larch': { uk: '{label}, модрина', de: '{label}, Lärche', pl: '{label}, modrzew' },
  'Screen batten – {sides}': { uk: 'Рейка екрана – {sides}', de: 'Traglatte – {sides}', pl: 'Łata ekranu – {sides}' },
  'Screen bottom rail – {sides}': { uk: 'Нижній ригель екрана – {sides}', de: 'Fußriegel – {sides}', pl: 'Dolny rygiel ekranu – {sides}' },
  'Screen rail – {sides}': { uk: 'Ригель екрана – {sides}', de: 'Riegel – {sides}', pl: 'Rygiel ekranu – {sides}' },
  'knee brace at mid {n} purlin': { uk: 'підкосом при середньому прогоні {n}', de: 'dem Kopfband an der Mittelpfette {n}', pl: 'mieczem przy płatwi środkowej {n}' },

  // ── Planning warnings ─────────────────────────────────────────────────────────────────
  'Roof pitch {a}° is below the minimum {m}° + {t}° tolerance for the sheet: raise H1 to {h1} mm (H2 {h2} mm) or lower H2 to {l2} mm (H1 {l1} mm).': {
    uk: 'Ухил даху {a}° менший за мінімум {m}° + {t}° допуску для листа: підніміть H1 до {h1} mm (H2 {h2} mm) або опустіть H2 до {l2} mm (H1 {l1} mm).',
    de: 'Dachneigung {a}° liegt unter dem Minimum {m}° + {t}° Toleranz für das Blech: H1 auf {h1} mm anheben (H2 {h2} mm) oder H2 auf {l2} mm absenken (H1 {l1} mm).',
    pl: 'Spadek dachu {a}° jest poniżej minimum {m}° + {t}° tolerancji dla blachy: podnieś H1 do {h1} mm (H2 {h2} mm) albo obniż H2 do {l2} mm (H1 {l1} mm).',
  },
  'Roof sheet run {r} mm is longer than the longest sheet available ({m} mm) – a cross joint (Querstoß) would be needed; shorten the roof along the slope or order longer sheets.': {
    uk: 'Ряд листів {r} mm довший за найдовший доступний лист ({m} mm) – знадобився б поперечний стик (Querstoß); вкоротіть дах уздовж схилу або замовте довші листи.',
    de: 'Blechbahn {r} mm ist länger als die längste lieferbare Tafel ({m} mm) – ein Querstoß wäre nötig; Dach entlang der Neigung kürzen oder längere Tafeln bestellen.',
    pl: 'Pas blachy {r} mm jest dłuższy niż najdłuższy dostępny arkusz ({m} mm) – potrzebny byłby styk poprzeczny (Querstoß); skróć dach wzdłuż spadku albo zamów dłuższe arkusze.',
  },
  'Gross floor area {a} m² by the post outline, {b} m² by the roof projection – over the {l} m² threshold for procedure-free carports and outbuildings (BbgBO §61).': {
    uk: 'Загальна площа {a} m² за контуром стовпів, {b} m² за проєкцією даху – понад поріг {l} m² для карпортів і господарських будівель без дозволу (BbgBO §61).',
    de: 'Brutto-Grundfläche {a} m² nach Pfostenumriss, {b} m² nach Dachprojektion – über der Grenze von {l} m² für verfahrensfreie überdachte Stellplätze und Nebengebäude (BbgBO §61).',
    pl: 'Powierzchnia zabudowy {a} m² wg obrysu słupów, {b} m² wg rzutu dachu – powyżej progu {l} m² dla wiat i budynków gospodarczych bez pozwolenia (BbgBO §61).',
  },
  'To get under it shorten the {a} m side by {b} mm or the {c} m side by {d} mm ({e} m² now).': {
    uk: 'Щоб опинитися нижче, вкоротіть сторону {a} m на {b} mm або сторону {c} m на {d} mm (зараз {e} m²).',
    de: 'Um darunter zu kommen, die Seite {a} m um {b} mm oder die Seite {c} m um {d} mm kürzen (jetzt {e} m²).',
    pl: 'Aby zejść poniżej, skróć bok {a} m o {b} mm albo bok {c} m o {d} mm (teraz {e} m²).',
  },
  'Dimensions are not changed automatically.': { uk: 'Розміри не змінюються автоматично.', de: 'Die Abmessungen werden nicht automatisch geändert.', pl: 'Wymiary nie są zmieniane automatycznie.' },
  'Concrete screws or frame anchors into loose paving stones give no tension capacity – anchor the bottom plates into a concrete strip or the post foundations, or hang the studs from the rail and hold their feet sideways only (wall base "hung").': {
    uk: 'Шурупи по бетону чи рамні дюбелі в незакріпленій бруківці не тримають на відрив – заанкеруйте обв’язку в бетонну стрічку чи фундаменти стовпів або підвісьте стійки до ригеля й утримуйте низ лише збоку (основа стіни «підвішена»).',
    de: 'Betonschrauben oder Rahmendübel in losem Pflaster tragen keinen Zug – die Schwellen in einen Betonstreifen oder die Pfostenfundamente verankern, oder die Ständer am Rähm aufhängen und den Fuß nur seitlich halten (Wandfuß „hängend“).',
    pl: 'Wkręty do betonu lub kołki ramowe w luźnej kostce nie przenoszą rozciągania – zakotw podwaliny w betonowym pasie lub fundamentach słupów albo zawieś słupki na oczepie i trzymaj ich stopy tylko z boku (podstawa ściany „zawieszona”).',
  },
  'The project name says {named} but the plan is {a} × {b} m – rename it so the documents match.': {
    uk: 'Назва проєкту містить {named}, а план {a} × {b} m – перейменуйте, щоб документи збігалися.',
    de: 'Der Projektname nennt {named}, der Grundriss ist {a} × {b} m – umbenennen, damit die Unterlagen stimmen.',
    pl: 'Nazwa projektu podaje {named}, a rzut ma {a} × {b} m – zmień nazwę, aby dokumenty się zgadzały.',
  },
  '{group} {sec} mm is not a stock section of the timber yard – choose one from the section list.': {
    uk: '{group} {sec} mm – не складський переріз лісобази; оберіть зі списку перерізів.',
    de: '{group} {sec} mm ist kein Lagerquerschnitt des Holzhandels – einen aus der Querschnittsliste wählen.',
    pl: '{group} {sec} mm nie jest przekrojem z magazynu tartaku – wybierz z listy przekrojów.',
  },

  // ── Not checked ───────────────────────────────────────────────────────────────────────
  'Soil bearing on site: table values of DIN 1054 without a soil investigation; settlement and groundwater are not checked.': {
    uk: 'Несуча здатність ґрунту на місці: табличні значення DIN 1054 без вишукувань; осідання й ґрунтові води не перевіряються.',
    de: 'Baugrund vor Ort: Tabellenwerte der DIN 1054 ohne Baugrunduntersuchung; Setzungen und Grundwasser sind nicht nachgewiesen.',
    pl: 'Nośność gruntu na miejscu: wartości tablicowe DIN 1054 bez badań; osiadanie i woda gruntowa nie są sprawdzane.',
  },
  'Connection details not modelled: purlin splices, headers and sills, stud and plate screws, cladding and trim fixings.': {
    uk: 'Не змодельовані деталі з’єднань: стики прогонів, перемички й підвіконня, шурупи стійок і обв’язки, кріплення обшивки й планок.',
    de: 'Nicht modellierte Anschlussdetails: Pfettenstöße, Stürze und Brüstungsriegel, Ständer- und Schwellenschrauben, Befestigung von Schalung und Blechen.',
    pl: 'Niemodelowane szczegóły połączeń: styki płatwi, nadproża i podokienniki, wkręty słupków i podwalin, mocowanie deskowania i obróbek.',
  },
  'Product values from ETAs taken as inputs, not verified: Sparrenpfettenanker R_k = {a} kN, angle bracket R_k = {b} kN.': {
    uk: 'Значення виробів за ETA взято як вихідні дані, не перевірено: анкер кроква–прогін R_k = {a} kN, кутник R_k = {b} kN.',
    de: 'Produktwerte aus ETAs als Eingabe übernommen, nicht nachgewiesen: Sparrenpfettenanker R_k = {a} kN, Winkelverbinder R_k = {b} kN.',
    pl: 'Wartości wyrobów z ETA przyjęte jako dane, niesprawdzone: łącznik krokwiowo-płatwiowy R_k = {a} kN, kątownik R_k = {b} kN.',
  },
  'Product values from ETAs taken as inputs, not verified: Sparrenpfettenanker R_k = {a} kN, angle bracket R_k = {b} kN, adjustable post base and its anchor.': {
    uk: 'Значення виробів за ETA взято як вихідні дані, не перевірено: анкер кроква–прогін R_k = {a} kN, кутник R_k = {b} kN, регульована опора стовпа та її анкер.',
    de: 'Produktwerte aus ETAs als Eingabe übernommen, nicht nachgewiesen: Sparrenpfettenanker R_k = {a} kN, Winkelverbinder R_k = {b} kN, höhenverstellbarer Pfostenträger und sein Anker.',
    pl: 'Wartości wyrobów z ETA przyjęte jako dane, niesprawdzone: łącznik krokwiowo-płatwiowy R_k = {a} kN, kątownik R_k = {b} kN, regulowana podstawa słupa i jej kotwa.',
  },
  'The roof sheet as a diaphragm that shares the wind between the braced lines, and second-order effects.': {
    uk: 'Покрівельний лист як діафрагма, що розподіляє вітер між розкріпленими лініями, і ефекти другого порядку.',
    de: 'Das Dachblech als Scheibe, die den Wind auf die ausgesteiften Linien verteilt, sowie Effekte nach Theorie II. Ordnung.',
    pl: 'Blacha dachowa jako tarcza rozdzielająca wiatr na stężone linie oraz efekty drugiego rzędu.',
  },
  'Fire resistance, snow drifts against higher neighbouring buildings, and accidental impact (vehicles).': {
    uk: 'Вогнестійкість, снігові мішки біля вищих сусідніх будівель і випадкові удари (транспорт).',
    de: 'Feuerwiderstand, Schneeverwehungen an höheren Nachbargebäuden und Anprall (Fahrzeuge).',
    pl: 'Odporność ogniowa, worki śnieżne przy wyższych budynkach sąsiednich i uderzenia (pojazdy).',
  },
  'Hold-down anchors at the ends of braced walls: the tension is given, the anchor into the base is not designed.': {
    uk: 'Анкери на кінцях розкріплених стін: зусилля розтягу вказано, анкер в основу не розраховано.',
    de: 'Zugverankerung an den Enden ausgesteifter Wände: die Zugkraft ist angegeben, der Anker in den Untergrund ist nicht bemessen.',
    pl: 'Kotwy na końcach stężonych ścian: siła rozciągająca jest podana, kotwa w podłożu nie jest zaprojektowana.',
  },
} satisfies Dict;

/** Openings are labelled with their preset name and a number ("Double door 1750×2000 1"). */
const parts: Dict = engineParts;
const numberedPresets: Dict = Object.fromEntries(
  OPENING_PRESETS.flatMap((p) => {
    const e = parts[p.label];
    return e ? [[`${p.label} {n}`, { uk: `${e.uk} {n}`, de: `${e.de} {n}`, pl: `${e.pl} {n}` }]] : [];
  }),
);

export default { ...numberedPresets, ...entries } satisfies Dict;
