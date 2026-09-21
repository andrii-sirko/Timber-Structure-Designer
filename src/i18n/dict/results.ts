import type { Dict } from '../core';

/** ResultsPanel (BOM / cut list / hardware / pricing / statics / warnings tabs), PricingPanel, and export.ts texts. */
export default {
  // Tabs
  BOM: { uk: 'Специфікація', de: 'Stückliste', pl: 'Zestawienie' },
  'Cut list': { uk: 'Список розкрою', de: 'Zuschnittliste', pl: 'Lista cięć' },
  Connections: { uk: "З'єднання", de: 'Verbindungen', pl: 'Połączenia' },
  Pricing: { uk: 'Ціни', de: 'Preise', pl: 'Ceny' },
  Statics: { uk: 'Статика', de: 'Statik', pl: 'Statyka' },
  Checks: { uk: 'Перевірки', de: 'Prüfungen', pl: 'Kontrole' },

  // BOM tab
  Category: { uk: 'Категорія', de: 'Kategorie', pl: 'Kategoria' },
  Pcs: { uk: 'Шт', de: 'Stk', pl: 'Szt.' },
  Volume: { uk: "Об'єм", de: 'Volumen', pl: 'Objętość' },
  'Total timber': { uk: 'Разом деревини', de: 'Holz gesamt', pl: 'Drewno łącznie' },
  Mass: { uk: 'Маса', de: 'Masse', pl: 'Masa' },
  'Roof area': { uk: 'Площа даху', de: 'Dachfläche', pl: 'Powierzchnia dachu' },
  Rafters: { uk: 'Крокви', de: 'Sparren', pl: 'Krokwie' },
  'Doors & windows to buy': { uk: 'Двері та вікна до закупівлі', de: 'Türen & Fenster', pl: 'Drzwi i okna do kupienia' },
  'Other materials': { uk: 'Інші матеріали', de: 'Sonstige Materialien', pl: 'Inne materiały' },
  'Materials & hardware per opening': { uk: "Матеріали та кріплення для прорізу", de: 'Materialien & Beschläge je Öffnung', pl: 'Materiały i okucia na otwór' },
  Product: { uk: 'Виріб', de: 'Produkt', pl: 'Produkt' },
  Wall: { uk: 'Стіна', de: 'Wand', pl: 'Ściana' },
  Frame: { uk: 'Рама', de: 'Rahmen', pl: 'Rama' },
  'Rough opening': { uk: 'Проріз у чорновому розмірі', de: 'Rohbaumaß', pl: 'Otwór surowy' },

  // Cut list tab
  Piece: { uk: 'Деталь', de: 'Teil', pl: 'Element' },
  Cuts: { uk: 'Різи', de: 'Schnitte', pl: 'Cięcia' },
  '{n} positions · {pieces} pieces': { uk: '{n} позицій · {pieces} шт', de: '{n} Positionen · {pieces} Stück', pl: '{n} pozycji · {pieces} elementów' },

  // Hardware tab
  'Mode:': { uk: 'Режим:', de: 'Modus:', pl: 'Tryb:' },
  'mechanical connectors': { uk: "механічні з'єднувачі", de: 'mechanische Verbinder', pl: 'łączniki mechaniczne' },
  'traditional joinery': { uk: "традиційні столярні з'єднання", de: 'traditionelle Zimmermannsverbindungen', pl: 'tradycyjne złącza ciesielskie' },
  '· change under “Loads & connections”.': { uk: '· змініть у розділі «Навантаження та з’єднання».', de: '· ändern unter „Lasten & Verbindungen“.', pl: '· zmień w „Obciążenia i połączenia”.' },
  'Timber joints': { uk: "Дерев'яні з'єднання", de: 'Holzverbindungen', pl: 'Złącza ciesielskie' },
  'Hardware & fixings': { uk: 'Кріплення та фурнітура', de: 'Beschläge & Verbindungsmittel', pl: 'Okucia i łączniki' },

  // Statics tab
  'Overall: {status}': { uk: 'Загалом: {status}', de: 'Gesamt: {status}', pl: 'Ogółem: {status}' },
  'Step up sections / add posts until every check passes': { uk: 'Збільшувати перерізи / додавати стовпи, доки всі перевірки не пройдуть', de: 'Querschnitte vergrößern / Pfosten hinzufügen, bis alle Prüfungen bestehen', pl: 'Zwiększaj przekroje / dodawaj słupy, aż wszystkie kontrole przejdą' },
  'Auto-fix all': { uk: 'Виправити все автоматично', de: 'Alles automatisch korrigieren', pl: 'Popraw wszystko automatycznie' },
  'Reduce timber sections while keeping every statics check sufficient': { uk: 'Зменшити перерізи деревини, зберігаючи достатність усіх перевірок статики', de: 'Querschnitte reduzieren, solange alle Statiknachweise ausreichend bleiben', pl: 'Zmniejsz przekroje drewna, zachowując wystarczające wszystkie sprawdzenia statyczne' },
  'Cost optimization': { uk: 'Оптимізація вартості', de: 'Kostenoptimierung', pl: 'Optymalizacja kosztów' },
  'Cost optimization: no smaller sections pass all checks.': { uk: 'Оптимізація вартості: менші перерізи не проходять усі перевірки.', de: 'Kostenoptimierung: Keine kleineren Querschnitte bestehen alle Prüfungen.', pl: 'Optymalizacja kosztów: żadne mniejsze przekroje nie przechodzą wszystkich kontroli.' },
  'Cost optimization applied {n} change – all checks pass.': { uk: 'Оптимізація вартості: застосовано {n} зміну – усі перевірки пройдено.', de: 'Kostenoptimierung: {n} Änderung angewendet – alle Prüfungen bestanden.', pl: 'Optymalizacja kosztów wprowadziła {n} zmianę – wszystkie kontrole przechodzą.' },
  'Cost optimization applied {n} changes – all checks pass.': { uk: 'Оптимізація вартості: застосовано {n} зміни(н) – усі перевірки пройдено.', de: 'Kostenoptimierung: {n} Änderungen angewendet – alle Prüfungen bestanden.', pl: 'Optymalizacja kosztów wprowadziła {n} zmian – wszystkie kontrole przechodzą.' },
  'Auto-fix: nothing to change.': { uk: 'Автовиправлення: змінювати нічого.', de: 'Automatische Korrektur: nichts zu ändern.', pl: 'Automatyczna poprawa: nic do zmiany.' },
  'Auto-fix applied {n} change – all checks pass.': { uk: 'Автовиправлення: застосовано {n} зміну – усі перевірки пройдено.', de: 'Automatische Korrektur: {n} Änderung angewendet – alle Prüfungen bestanden.', pl: 'Automatyczna poprawa wprowadziła {n} zmianę – wszystkie kontrole przechodzą.' },
  'Auto-fix applied {n} changes – all checks pass.': { uk: 'Автовиправлення: застосовано {n} зміни(н) – усі перевірки пройдено.', de: 'Automatische Korrektur: {n} Änderungen angewendet – alle Prüfungen bestanden.', pl: 'Automatyczna poprawa wprowadziła {n} zmian – wszystkie kontrole przechodzą.' },
  'Auto-fix applied {n} change – some checks still need attention.': { uk: 'Автовиправлення: застосовано {n} зміну – деякі перевірки ще потребують уваги.', de: 'Automatische Korrektur: {n} Änderung angewendet – einige Prüfungen benötigen noch Aufmerksamkeit.', pl: 'Automatyczna poprawa wprowadziła {n} zmianę – niektóre kontrole nadal wymagają uwagi.' },
  'Auto-fix applied {n} changes – some checks still need attention.': { uk: 'Автовиправлення: застосовано {n} зміни(н) – деякі перевірки ще потребують уваги.', de: 'Automatische Korrektur: {n} Änderungen angewendet – einige Prüfungen benötigen noch Aufmerksamkeit.', pl: 'Automatyczna poprawa wprowadziła {n} zmian – niektóre kontrole nadal wymagają uwagi.' },
  Dismiss: { uk: 'Закрити', de: 'Schließen', pl: 'Zamknij' },
  'Dismiss statics report': { uk: 'Закрити звіт статики', de: 'Statikbericht schließen', pl: 'Zamknij raport statyki' },
  'Still not ok: {list} – reduce spans, openings or loads manually.': { uk: 'Ще не гаразд: {list} – зменшіть прольоти, прорізи або навантаження вручну.', de: 'Noch nicht in Ordnung: {list} – Spannweiten, Öffnungen oder Lasten manuell reduzieren.', pl: 'Nadal niezgodne: {list} – ręcznie zmniejsz rozpiętości, otwory lub obciążenia.' },
  'Simplified EN 1995-1-1 pre-design: bending, shear, deflection (w_inst ≤ L/300, w_fin ≤ L/200), post buckling with the actual bracing system, knee braces / boarded walls / sway posts under wind, and roof uplift. k_mod {kmodSnow} (snow) / {kmodWind} (wind), k_def {kdef}, γ_G 1.35 / γ_Q 1.5, ψ₀ snow 0.5 / wind 0.6. Wind q_p {qp} kN/m² (≈ {gust} m/s gust).':
    { uk: 'Спрощений попередній розрахунок EN 1995-1-1: згин, зсув, прогин (w_inst ≤ L/300, w_fin ≤ L/200), стійкість стовпів при поздовжньому вигині з фактичною системою розкосів, підкоси / обшиті стіни / хиткі стовпи під вітром та відрив покрівлі. k_mod {kmodSnow} (сніг) / {kmodWind} (вітер), k_def {kdef}, γ_G 1.35 / γ_Q 1.5, ψ₀ сніг 0.5 / вітер 0.6. Вітровий тиск q_p {qp} кН/м² (≈ {gust} м/с пориву).',
      de: 'Vereinfachte Vorbemessung nach EN 1995-1-1: Biegung, Schub, Durchbiegung (w_inst ≤ L/300, w_fin ≤ L/200), Knicken der Pfosten mit dem tatsächlichen Aussteifungssystem, Kopfbänder / beplankte Wände / Schwenkpfosten unter Wind sowie Dachabhebung. k_mod {kmodSnow} (Schnee) / {kmodWind} (Wind), k_def {kdef}, γ_G 1,35 / γ_Q 1,5, ψ₀ Schnee 0,5 / Wind 0,6. Winddruck q_p {qp} kN/m² (≈ {gust} m/s Böe).', pl: 'Uproszczone wstępne wymiarowanie wg EN 1995-1-1: zginanie, ścinanie, ugięcie (w_inst ≤ L/300, w_fin ≤ L/200), wyboczenie słupów z rzeczywistym systemem stężeń, miecze / ściany poszyte / słupy wahliwe pod wiatrem oraz odrywanie dachu. k_mod {kmodSnow} (śnieg) / {kmodWind} (wiatr), k_def {kdef}, γ_G 1,35 / γ_Q 1,5, ψ₀ śnieg 0,5 / wiatr 0,6. Wiatr q_p {qp} kN/m² (≈ poryw {gust} m/s).' },
  'First failure at ≈ {speed} m/s ({kmh} km/h): {element}.': { uk: 'Перше руйнування при ≈ {speed} м/с ({kmh} км/год): {element}.', de: 'Erstes Versagen bei ≈ {speed} m/s ({kmh} km/h): {element}.', pl: 'Pierwsze zniszczenie przy ≈ {speed} m/s ({kmh} km/h): {element}.' },
  'Gravity checks already exceed 100 % – no wind margin.': { uk: 'Перевірки на власну вагу вже перевищують 100 % – запасу на вітер немає.', de: 'Die Nachweise für ständige Lasten überschreiten bereits 100 % – kein Spielraum für Wind.', pl: 'Sprawdzenia grawitacyjne już przekraczają 100 % – brak zapasu na wiatr.' },
  'Connections, foundations and fire are not verified – have a structural engineer confirm the design.': { uk: "З'єднання, фундаменти та вогнестійкість не перевірено – проєкт має підтвердити інженер-конструктор.", de: 'Verbindungen, Gründungen und Brandschutz sind nicht nachgewiesen – lassen Sie den Entwurf von einem Statiker bestätigen.', pl: 'Połączenia, fundamenty i ochrona przeciwpożarowa nie są sprawdzane – projekt musi potwierdzić konstruktor.' },
  Span: { uk: 'Проліт', de: 'Spannweite', pl: 'Rozpiętość' },
  Stress: { uk: 'Напруження', de: 'Spannung', pl: 'Naprężenie' },
  Deflection: { uk: 'Прогин', de: 'Durchbiegung', pl: 'Ugięcie' },

  // Warnings tab
  'No geometry or framing issues detected.': { uk: 'Проблем із геометрією чи каркасом не виявлено.', de: 'Keine Geometrie- oder Rahmenprobleme festgestellt.', pl: 'Nie wykryto problemów z geometrią ani konstrukcją.' },
  Vehicles: { uk: 'Транспортні засоби', de: 'Fahrzeuge', pl: 'Pojazdy' },

  // PricingPanel
  'Matches default price': { uk: 'Відповідає ціні за замовчуванням', de: 'Entspricht dem Standardpreis', pl: 'Zgodna z ceną domyślną' },
  'Reset to default price': { uk: 'Скинути до ціни за замовчуванням', de: 'Auf Standardpreis zurücksetzen', pl: 'Przywróć cenę domyślną' },
  'Unit price': { uk: 'Ціна за од.', de: 'Einzelpreis', pl: 'Cena jednostkowa' },
  'Timber, boards & roofing': { uk: 'Деревина, дошки та покрівля', de: 'Holz, Platten & Eindeckung', pl: 'Drewno, płyty i pokrycie dachu' },
  'Timber subtotal': { uk: 'Проміжна сума: деревина', de: 'Zwischensumme Holz', pl: 'Suma częściowa – drewno' },
  'No timber yet.': { uk: 'Деревини ще немає.', de: 'Noch kein Holz.', pl: 'Brak drewna.' },
  'Other materials subtotal': { uk: 'Проміжна сума: інші матеріали', de: 'Zwischensumme sonstige Materialien', pl: 'Suma częściowa – inne materiały' },
  'Doors & windows': { uk: 'Двері та вікна', de: 'Türen & Fenster', pl: 'Drzwi i okna' },
  'Doors & windows subtotal': { uk: 'Проміжна сума: двері та вікна', de: 'Zwischensumme Türen & Fenster', pl: 'Suma częściowa – drzwi i okna' },
  'Hardware subtotal': { uk: 'Проміжна сума: кріплення', de: 'Zwischensumme Beschläge', pl: 'Suma częściowa – okucia' },
  'No hardware quantities yet — add posts, rafters or braces to see connector costs here.': { uk: 'Кількостей кріплення ще немає — додайте стовпи, крокви або підкоси, щоб побачити тут вартість з’єднувачів.', de: 'Noch keine Beschlagmengen — fügen Sie Pfosten, Sparren oder Kopfbänder hinzu, um hier die Verbinderkosten zu sehen.', pl: 'Brak ilości okuć — dodaj słupy, krokwie lub miecze, aby zobaczyć tu koszt łączników.' },
  'Grand total': { uk: 'Загальна сума', de: 'Gesamtsumme', pl: 'Suma całkowita' },
  'Default unit prices are EUR, Berlin/Potsdam-area estimates — timber is priced per running metre (lfm), boards, roofing and floor decks per m², doors and windows per piece. Edit any price to match your own.':
    { uk: 'Стандартні ціни за одиницю в EUR, орієнтовно для регіону Берлін/Потсдам — деревина оцінюється за погонний метр, дошки, покрівля та настил підлоги за м², двері та вікна за штуку. Змініть будь-яку ціну на свою.',
      de: 'Die voreingestellten Einzelpreise in EUR sind Schätzwerte für den Raum Berlin/Potsdam — Holz wird pro laufendem Meter (lfm) berechnet, Platten, Dacheindeckung und Bodenbeläge pro m², Türen und Fenster pro Stück. Passen Sie jeden Preis nach Bedarf an.', pl: 'Domyślne ceny jednostkowe w EUR to szacunki dla rejonu Berlina/Poczdamu — drewno liczone za metr bieżący (mb), płyty, pokrycie dachu i poszycie podłogi za m², drzwi i okna za sztukę. Każdą cenę możesz dopasować do własnych.' },
  'Materials, doors & windows and hardware only — excludes delivery, cutting waste beyond what the BOM already allows for, concrete for the post foundations, and labour. Traditional joints themselves are technique, not purchased material; only their oak pegs are priced.':
    { uk: 'Лише матеріали, двері й вікна та кріплення — без доставки, відходів розкрою понад закладені у специфікації, бетону для фундаментів стовпів і роботи. Самі традиційні з’єднання є технікою, а не купованим матеріалом; враховано лише вартість дубових шкантів.',
      de: 'Nur Materialien, Türen & Fenster und Beschläge — ohne Lieferung, Verschnitt über das in der Stückliste bereits berücksichtigte Maß hinaus, Beton für die Pfostenfundamente und Arbeitslohn. Traditionelle Verbindungen selbst sind Handwerkstechnik, kein Kaufmaterial; nur die Eichendübel dafür sind bepreist.', pl: 'Tylko materiały, drzwi i okna oraz okucia — bez dostawy, odpadu z cięcia ponad to, co już uwzględnia zestawienie, betonu na fundamenty słupów i robocizny. Same złącza tradycyjne to technika, a nie kupowany materiał; wyceniane są tylko ich dębowe kołki.' },

  // export.ts (CSV / PDF)
  Pos: { uk: 'Поз', de: 'Pos', pl: 'Poz.' },
  Group: { uk: 'Група', de: 'Gruppe', pl: 'Grupa' },
  'Name (DE)': { uk: 'Назва (нім.)', de: 'Name (DE)', pl: 'Nazwa (DE)' },
  'Width mm': { uk: 'Ширина мм', de: 'Breite mm', pl: 'Szerokość mm' },
  'Height mm': { uk: 'Висота мм', de: 'Höhe mm', pl: 'Wysokość mm' },
  'Length mm': { uk: 'Довжина мм', de: 'Länge mm', pl: 'Długość mm' },
  'Cut start °': { uk: 'Різ початок °', de: 'Schnitt Start °', pl: 'Cięcie początek °' },
  'Cut end °': { uk: 'Різ кінець °', de: 'Schnitt Ende °', pl: 'Cięcie koniec °' },
  '{name} – Cutting list & BOM': { uk: '{name} – Список розкрою та специфікація', de: '{name} – Zuschnittliste & Stückliste', pl: '{name} – Lista cięć i zestawienie materiałów' },
  'Structure {length} × {width} mm, H1 {frontHeight} / H2 {rearHeight} mm · {strengthClass} · generated {date}':
    { uk: 'Конструкція {length} × {width} мм, H1 {frontHeight} / H2 {rearHeight} мм · {strengthClass} · створено {date}',
      de: 'Konstruktion {length} × {width} mm, H1 {frontHeight} / H2 {rearHeight} mm · {strengthClass} · erstellt am {date}', pl: 'Konstrukcja {length} × {width} mm, H1 {frontHeight} / H2 {rearHeight} mm · {strengthClass} · wygenerowano {date}' },
  'Bill of materials': { uk: 'Специфікація матеріалів', de: 'Stückliste', pl: 'Zestawienie materiałów' },
  Pieces: { uk: 'Штук', de: 'Stück', pl: 'Sztuki' },
  Area: { uk: 'Площа', de: 'Fläche', pl: 'Powierzchnia' },
  Note: { uk: 'Примітка', de: 'Notiz', pl: 'Uwaga' },
  'Statics check (simplified EC5) – overall: {status}': { uk: 'Перевірка статики (спрощено, EC5) – загалом: {status}', de: 'Statiknachweis (vereinfacht, EC5) – gesamt: {status}', pl: 'Sprawdzenie statyczne (uproszczone EC5) – ogółem: {status}' },
  Element: { uk: 'Елемент', de: 'Element', pl: 'Element' },
  'Util.': { uk: 'Викор.', de: 'Ausn.', pl: 'Wyk.' },
  Status: { uk: 'Статус', de: 'Status', pl: 'Status' },
  'Connections ({mode})': { uk: "З'єднання ({mode})", de: 'Verbindungen ({mode})', pl: 'Połączenia ({mode})' },
  joint: { uk: "з'єднання", de: 'Verbindung', pl: 'złącze' },
} satisfies Dict;
