import type { Dict } from '../core';

export default {
  'Roof {n} mm': { uk: 'Дах {n} мм', de: 'Dach {n} mm', pl: 'Dach {n} mm' },
  'front {n} mm': { uk: 'спереду {n} мм', de: 'vorne {n} mm', pl: 'z przodu {n} mm' },
  'rear {n} mm': { uk: 'ззаду {n} мм', de: 'hinten {n} mm', pl: 'z tyłu {n} mm' },
  'left {n} mm': { uk: 'зліва {n} мм', de: 'links {n} mm', pl: 'z lewej {n} mm' },
  'right {n} mm': { uk: 'справа {n} мм', de: 'rechts {n} mm', pl: 'z prawej {n} mm' },
  'cuts {a}° / {b}°': { uk: 'зрізи {a}° / {b}°', de: 'Schnitte {a}° / {b}°', pl: 'cięcia {a}° / {b}°' },
  post: { uk: 'стовп', de: 'Pfosten', pl: 'słup' },
  stud: { uk: 'стійка', de: 'Ständer', pl: 'słupek' },
  'Click to set the length (mm); the second point moves along the line': {
    uk: 'Натисніть, щоб задати довжину (мм); друга точка переміститься вздовж лінії',
    de: 'Klicken, um die Länge (mm) festzulegen; der zweite Punkt verschiebt sich entlang der Linie',
    pl: 'Kliknij, aby ustawić długość (mm); drugi punkt przesuwa się wzdłuż linii',
  },
  'Set {axis} (mm)': { uk: 'Задати {axis} (мм)', de: '{axis} festlegen (mm)', pl: 'Ustaw {axis} (mm)' },
  'Remove this measurement': { uk: 'Видалити цей вимір', de: 'Diese Messung entfernen', pl: 'Usuń ten pomiar' },
  '{n} corners': { uk: '{n} кутів', de: '{n} Ecken', pl: '{n} narożników' },
  '{n} stones': { uk: '{n} каменів', de: '{n} Steine', pl: '{n} kamieni' },
} satisfies Dict;
