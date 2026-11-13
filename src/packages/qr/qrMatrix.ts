// packages/qr/qrMatrix.ts
// Gera a matriz de módulos de um QR code (sem depender do navegador).
import qrcode from 'qrcode-generator';

export type QrEcc = 'L' | 'M' | 'Q' | 'H';

/** Linhas de '0'/'1' (1 = módulo escuro). Texto vazio gera um QR do espaço. */
export function qrMatrix(text: string, ecc: QrEcc = 'M'): string[] {
  const qr = qrcode(0, ecc);
  qr.addData(text || ' ', 'Byte');
  qr.make();
  const n = qr.getModuleCount();
  const rows: string[] = [];
  for (let r = 0; r < n; r += 1) {
    let row = '';
    for (let c = 0; c < n; c += 1) row += qr.isDark(r, c) ? '1' : '0';
    rows.push(row);
  }
  return rows;
}

/** SVG de uma matriz (`margin` = módulos de borda clara ao redor). */
export function matrixSvg(matrix: string[], fg: string, bg: string, margin: number): string {
  const n = matrix.length;
  const size = n + margin * 2;
  let path = '';
  matrix.forEach((row, y) => {
    let x = 0;
    while (x < n) {
      if (row[x] !== '1') {
        x += 1;
        continue;
      }
      let end = x;
      while (end < n && row[end] === '1') end += 1;
      path += `M${x + margin} ${y + margin}h${end - x}v1h-${end - x}z`;
      x = end;
    }
  });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="100%" height="100%" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="${bg}"/><path d="${path}" fill="${fg}"/></svg>`
  );
}

export function qrSvg(text: string, fg: string, bg: string, margin: number, ecc: QrEcc): string {
  return matrixSvg(qrMatrix(text, ecc), fg, bg, margin);
}
