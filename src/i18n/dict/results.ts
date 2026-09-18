import type { Dict } from '../core';

/** ResultsPanel (BOM / cut list / hardware / pricing / statics / warnings tabs), PricingPanel, and export.ts texts. */
export default {
  // Tabs
  BOM: { uk: 'Специфікація', de: 'Stückliste' },
  'Cut list': { uk: 'Список розкрою', de: 'Zuschnittliste' },
  Connections: { uk: "З'єднання", de: 'Verbindungen' },
  Pricing: { uk: 'Ціни', de: 'Preise' },
  Statics: { uk: 'Статика', de: 'Statik' },
  Checks: { uk: 'Перевірки', de: 'Prüfungen' },

  // BOM tab
  Category: { uk: 'Категорія', de: 'Kategorie' },
  Pcs: { uk: 'Шт', de: 'Stk' },
  Volume: { uk: "Об'єм", de: 'Volumen' },
  'Total timber': { uk: 'Разом деревини', de: 'Holz gesamt' },
  Mass: { uk: 'Маса', de: 'Masse' },
  'Roof area': { uk: 'Площа даху', de: 'Dachfläche' },
  Rafters: { uk: 'Крокви', de: 'Sparren' },
  'Doors & windows to buy': { uk: 'Двері та вікна до закупівлі', de: 'Türen & Fenster' },
  'Other materials': { uk: 'Інші матеріали', de: 'Sonstige Materialien' },
  'Materials & hardware per opening': { uk: "Матеріали та кріплення для прорізу", de: 'Materialien & Beschläge je Öffnung' },
  Product: { uk: 'Виріб', de: 'Produkt' },
  Wall: { uk: 'Стіна', de: 'Wand' },
  Frame: { uk: 'Рама', de: 'Rahmen' },
  'Rough opening': { uk: 'Проріз у чорновому розмірі', de: 'Rohbaumaß' },

  // Cut list tab
  Piece: { uk: 'Деталь', de: 'Teil' },
  Cuts: { uk: 'Різи', de: 'Schnitte' },
  '{n} positions · {pieces} pieces': { uk: '{n} позицій · {pieces} шт', de: '{n} Positionen · {pieces} Stück' },

  // Hardware tab
  'Mode:': { uk: 'Режим:', de: 'Modus:' },
  'mechanical connectors': { uk: "механічні з'єднувачі", de: 'mechanische Verbinder' },
  'traditional joinery': { uk: "традиційні столярні з'єднання", de: 'traditionelle Zimmermannsverbindungen' },
  '· change under “Loads & connections”.': { uk: '· змініть у розділі «Навантаження та з’єднання».', de: '· ändern unter „Lasten & Verbindungen“.' },
  'Timber joints': { uk: "Дерев'яні з'єднання", de: 'Holzverbindungen' },
  'Hardware & fixings': { uk: 'Кріплення та фурнітура', de: 'Beschläge & Verbindungsmittel' },

  // Statics tab
  'Overall: {status}': { uk: 'Загалом: {status}', de: 'Gesamt: {status}' },
  'Step up sections / add posts until every check passes': { uk: 'Збільшувати перерізи / додавати стовпи, доки всі перевірки не пройдуть', de: 'Querschnitte vergrößern / Pfosten hinzufügen, bis alle Prüfungen bestehen' },
  'Auto-fix all': { uk: 'Виправити все автоматично', de: 'Alles automatisch korrigieren' },
  'Reduce timber sections while keeping every statics check sufficient': { uk: 'Зменшити перерізи деревини, зберігаючи достатність усіх перевірок статики', de: 'Querschnitte reduzieren, solange alle Statiknachweise ausreichend bleiben' },
  'Cost optimization': { uk: 'Оптимізація вартості', de: 'Kostenoptimierung' },
  'Cost optimization: no smaller sections pass all checks.': { uk: 'Оптимізація вартості: менші перерізи не проходять усі перевірки.', de: 'Kostenoptimierung: Keine kleineren Querschnitte bestehen alle Prüfungen.' },
  'Cost optimization applied {n} change – all checks pass.': { uk: 'Оптимізація вартості: застосовано {n} зміну – усі перевірки пройдено.', de: 'Kostenoptimierung: {n} Änderung angewendet – alle Prüfungen bestanden.' },
  'Cost optimization applied {n} changes – all checks pass.': { uk: 'Оптимізація вартості: застосовано {n} зміни(н) – усі перевірки пройдено.', de: 'Kostenoptimierung: {n} Änderungen angewendet – alle Prüfungen bestanden.' },
  'Auto-fix: nothing to change.': { uk: 'Автовиправлення: змінювати нічого.', de: 'Automatische Korrektur: nichts zu ändern.' },
  'Auto-fix applied {n} change – all checks pass.': { uk: 'Автовиправлення: застосовано {n} зміну – усі перевірки пройдено.', de: 'Automatische Korrektur: {n} Änderung angewendet – alle Prüfungen bestanden.' },
  'Auto-fix applied {n} changes – all checks pass.': { uk: 'Автовиправлення: застосовано {n} зміни(н) – усі перевірки пройдено.', de: 'Automatische Korrektur: {n} Änderungen angewendet – alle Prüfungen bestanden.' },
  'Auto-fix applied {n} change – some checks still need attention.': { uk: 'Автовиправлення: застосовано {n} зміну – деякі перевірки ще потребують уваги.', de: 'Automatische Korrektur: {n} Änderung angewendet – einige Prüfungen benötigen noch Aufmerksamkeit.' },
  'Auto-fix applied {n} changes – some checks still need attention.': { uk: 'Автовиправлення: застосовано {n} зміни(н) – деякі перевірки ще потребують уваги.', de: 'Automatische Korrektur: {n} Änderungen angewendet – einige Prüfungen benötigen noch Aufmerksamkeit.' },
  Dismiss: { uk: 'Закрити', de: 'Schließen' },
  'Dismiss statics report': { uk: 'Закрити звіт статики', de: 'Statikbericht schließen' },
  'Still not ok: {list} – reduce spans, openings or loads manually.': { uk: 'Ще не гаразд: {list} – зменшіть прольоти, прорізи або навантаження вручну.', de: 'Noch nicht in Ordnung: {list} – Spannweiten, Öffnungen oder Lasten manuell reduzieren.' },
  'Simplified EN 1995-1-1 pre-design: bending, shear, deflection (w_inst ≤ L/300, w_fin ≤ L/200), post buckling with the actual bracing system, knee braces / boarded walls / sway posts under wind, and roof uplift. k_mod {kmodSnow} (snow) / {kmodWind} (wind), k_def {kdef}, γ_G 1.35 / γ_Q 1.5, ψ₀ snow 0.5 / wind 0.6. Wind q_p {qp} kN/m² (≈ {gust} m/s gust).':
    { uk: 'Спрощений попередній розрахунок EN 1995-1-1: згин, зсув, прогин (w_inst ≤ L/300, w_fin ≤ L/200), стійкість стовпів при поздовжньому вигині з фактичною системою розкосів, підкоси / обшиті стіни / хиткі стовпи під вітром та відрив покрівлі. k_mod {kmodSnow} (сніг) / {kmodWind} (вітер), k_def {kdef}, γ_G 1.35 / γ_Q 1.5, ψ₀ сніг 0.5 / вітер 0.6. Вітровий тиск q_p {qp} кН/м² (≈ {gust} м/с пориву).',
      de: 'Vereinfachte Vorbemessung nach EN 1995-1-1: Biegung, Schub, Durchbiegung (w_inst ≤ L/300, w_fin ≤ L/200), Knicken der Pfosten mit dem tatsächlichen Aussteifungssystem, Kopfbänder / beplankte Wände / Schwenkpfosten unter Wind sowie Dachabhebung. k_mod {kmodSnow} (Schnee) / {kmodWind} (Wind), k_def {kdef}, γ_G 1,35 / γ_Q 1,5, ψ₀ Schnee 0,5 / Wind 0,6. Winddruck q_p {qp} kN/m² (≈ {gust} m/s Böe).' },
  'First failure at ≈ {speed} m/s ({kmh} km/h): {element}.': { uk: 'Перше руйнування при ≈ {speed} м/с ({kmh} км/год): {element}.', de: 'Erstes Versagen bei ≈ {speed} m/s ({kmh} km/h): {element}.' },
  'Gravity checks already exceed 100 % – no wind margin.': { uk: 'Перевірки на власну вагу вже перевищують 100 % – запасу на вітер немає.', de: 'Die Nachweise für ständige Lasten überschreiten bereits 100 % – kein Spielraum für Wind.' },
  'Connections, foundations and fire are not verified – have a structural engineer confirm the design.': { uk: "З'єднання, фундаменти та вогнестійкість не перевірено – проєкт має підтвердити інженер-конструктор.", de: 'Verbindungen, Gründungen und Brandschutz sind nicht nachgewiesen – lassen Sie den Entwurf von einem Statiker bestätigen.' },
  Span: { uk: 'Проліт', de: 'Spannweite' },
  Stress: { uk: 'Напруження', de: 'Spannung' },
  Deflection: { uk: 'Прогин', de: 'Durchbiegung' },

  // Warnings tab
  'No geometry or framing issues detected.': { uk: 'Проблем із геометрією чи каркасом не виявлено.', de: 'Keine Geometrie- oder Rahmenprobleme festgestellt.' },
  Vehicles: { uk: 'Транспортні засоби', de: 'Fahrzeuge' },

  // PricingPanel
  'Matches default price': { uk: 'Відповідає ціні за замовчуванням', de: 'Entspricht dem Standardpreis' },
  'Reset to default price': { uk: 'Скинути до ціни за замовчуванням', de: 'Auf Standardpreis zurücksetzen' },
  'Unit price': { uk: 'Ціна за од.', de: 'Einzelpreis' },
  'Timber, boards & roofing': { uk: 'Деревина, дошки та покрівля', de: 'Holz, Platten & Eindeckung' },
  'Timber subtotal': { uk: 'Проміжна сума: деревина', de: 'Zwischensumme Holz' },
  'No timber yet.': { uk: 'Деревини ще немає.', de: 'Noch kein Holz.' },
  'Other materials subtotal': { uk: 'Проміжна сума: інші матеріали', de: 'Zwischensumme sonstige Materialien' },
  'Doors & windows': { uk: 'Двері та вікна', de: 'Türen & Fenster' },
  'Doors & windows subtotal': { uk: 'Проміжна сума: двері та вікна', de: 'Zwischensumme Türen & Fenster' },
  'Hardware subtotal': { uk: 'Проміжна сума: кріплення', de: 'Zwischensumme Beschläge' },
  'No hardware quantities yet — add posts, rafters or braces to see connector costs here.': { uk: 'Кількостей кріплення ще немає — додайте стовпи, крокви або підкоси, щоб побачити тут вартість з’єднувачів.', de: 'Noch keine Beschlagmengen — fügen Sie Pfosten, Sparren oder Kopfbänder hinzu, um hier die Verbinderkosten zu sehen.' },
  'Grand total': { uk: 'Загальна сума', de: 'Gesamtsumme' },
  'Default unit prices are EUR, Berlin/Potsdam-area estimates — timber is priced per running metre (lfm), boards, roofing and floor decks per m², doors and windows per piece. Edit any price to match your own.':
    { uk: 'Стандартні ціни за одиницю в EUR, орієнтовно для регіону Берлін/Потсдам — деревина оцінюється за погонний метр, дошки, покрівля та настил підлоги за м², двері та вікна за штуку. Змініть будь-яку ціну на свою.',
      de: 'Die voreingestellten Einzelpreise in EUR sind Schätzwerte für den Raum Berlin/Potsdam — Holz wird pro laufendem Meter (lfm) berechnet, Platten, Dacheindeckung und Bodenbeläge pro m², Türen und Fenster pro Stück. Passen Sie jeden Preis nach Bedarf an.' },
  'Materials, doors & windows and hardware only — excludes delivery, cutting waste beyond what the BOM already allows for, concrete for the post foundations, and labour. Traditional joints themselves are technique, not purchased material; only their oak pegs are priced.':
    { uk: 'Лише матеріали, двері й вікна та кріплення — без доставки, відходів розкрою понад закладені у специфікації, бетону для фундаментів стовпів і роботи. Самі традиційні з’єднання є технікою, а не купованим матеріалом; враховано лише вартість дубових шкантів.',
      de: 'Nur Materialien, Türen & Fenster und Beschläge — ohne Lieferung, Verschnitt über das in der Stückliste bereits berücksichtigte Maß hinaus, Beton für die Pfostenfundamente und Arbeitslohn. Traditionelle Verbindungen selbst sind Handwerkstechnik, kein Kaufmaterial; nur die Eichendübel dafür sind bepreist.' },

  // export.ts (CSV / PDF)
  Pos: { uk: 'Поз', de: 'Pos' },
  Group: { uk: 'Група', de: 'Gruppe' },
  'Name (DE)': { uk: 'Назва (нім.)', de: 'Name (DE)' },
  'Width mm': { uk: 'Ширина мм', de: 'Breite mm' },
  'Height mm': { uk: 'Висота мм', de: 'Höhe mm' },
  'Length mm': { uk: 'Довжина мм', de: 'Länge mm' },
  'Cut start °': { uk: 'Різ початок °', de: 'Schnitt Start °' },
  'Cut end °': { uk: 'Різ кінець °', de: 'Schnitt Ende °' },
  '{name} – Cutting list & BOM': { uk: '{name} – Список розкрою та специфікація', de: '{name} – Zuschnittliste & Stückliste' },
  'Structure {length} × {width} mm, H1 {frontHeight} / H2 {rearHeight} mm · {strengthClass} · generated {date}':
    { uk: 'Конструкція {length} × {width} мм, H1 {frontHeight} / H2 {rearHeight} мм · {strengthClass} · створено {date}',
      de: 'Konstruktion {length} × {width} mm, H1 {frontHeight} / H2 {rearHeight} mm · {strengthClass} · erstellt am {date}' },
  'Bill of materials': { uk: 'Специфікація матеріалів', de: 'Stückliste' },
  Pieces: { uk: 'Штук', de: 'Stück' },
  Area: { uk: 'Площа', de: 'Fläche' },
  Note: { uk: 'Примітка', de: 'Notiz' },
  'Statics check (simplified EC5) – overall: {status}': { uk: 'Перевірка статики (спрощено, EC5) – загалом: {status}', de: 'Statiknachweis (vereinfacht, EC5) – gesamt: {status}' },
  Element: { uk: 'Елемент', de: 'Element' },
  'Util.': { uk: 'Викор.', de: 'Ausn.' },
  Status: { uk: 'Статус', de: 'Status' },
  'Connections ({mode})': { uk: "З'єднання ({mode})", de: 'Verbindungen ({mode})' },
  joint: { uk: "з'єднання", de: 'Verbindung' },
} satisfies Dict;
