import type { jsPDF } from 'jspdf';
import regularUrl from 'dejavu-fonts-ttf/ttf/DejaVuSans.ttf?url';
import boldUrl from 'dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf?url';

export const UNICODE_FONT = 'DejaVuSans';

async function toBase64(url: string): Promise<string> {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/**
 * jsPDF's built-in fonts only cover Latin-1, so Cyrillic text needs an embedded TTF.
 * Loaded on demand (only for PDF exports that need it) and registered as normal + bold.
 */
export async function embedUnicodeFont(doc: jsPDF): Promise<void> {
  const [regular, bold] = await Promise.all([toBase64(regularUrl), toBase64(boldUrl)]);
  doc.addFileToVFS('DejaVuSans.ttf', regular);
  doc.addFont('DejaVuSans.ttf', UNICODE_FONT, 'normal');
  doc.addFileToVFS('DejaVuSans-Bold.ttf', bold);
  doc.addFont('DejaVuSans-Bold.ttf', UNICODE_FONT, 'bold');
  doc.setFont(UNICODE_FONT, 'normal');
}
