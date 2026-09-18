import type { Dict } from '../core';

export default {
  'Roof {n} mm': { uk: 'Дах {n} мм', de: 'Dach {n} mm' },
  'front {n} mm': { uk: 'спереду {n} мм', de: 'vorne {n} mm' },
  'rear {n} mm': { uk: 'ззаду {n} мм', de: 'hinten {n} mm' },
  'left {n} mm': { uk: 'зліва {n} мм', de: 'links {n} mm' },
  'right {n} mm': { uk: 'справа {n} мм', de: 'rechts {n} mm' },
  post: { uk: 'стовп', de: 'Pfosten' },
  stud: { uk: 'стійка', de: 'Ständer' },
  'Click to set the length (mm); the second point moves along the line': {
    uk: 'Натисніть, щоб задати довжину (мм); друга точка переміститься вздовж лінії',
    de: 'Klicken, um die Länge (mm) festzulegen; der zweite Punkt verschiebt sich entlang der Linie',
  },
  'Set {axis} (mm)': { uk: 'Задати {axis} (мм)', de: '{axis} festlegen (mm)' },
  'Remove this measurement': { uk: 'Видалити цей вимір', de: 'Diese Messung entfernen' },
  '{n} corners': { uk: '{n} кутів', de: '{n} Ecken' },
  '{n} stones': { uk: '{n} каменів', de: '{n} Steine' },
} satisfies Dict;
