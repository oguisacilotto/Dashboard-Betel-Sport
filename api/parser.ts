import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import xml2js from 'xml2js';

export async function parseFile(buffer: Buffer, filename: string, mimetype: string): Promise<{ text: string; base64?: string }> {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (ext === 'pdf' || mimetype === 'application/pdf') {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    return { text: data.text };
  }

  if (['xlsx','xls','xlsm'].includes(ext)) {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    let text = '';
    wb.SheetNames.forEach(name => {
      text += `\n[Planilha: ${name}]\n${XLSX.utils.sheet_to_csv(wb.Sheets[name])}`;
    });
    return { text };
  }

  if (ext === 'csv' || mimetype === 'text/csv') {
    const result = Papa.parse(buffer.toString('utf-8'), { header: true });
    return { text: JSON.stringify(result.data, null, 2).slice(0, 80000) };
  }

  if (ext === 'xml') {
    const parsed = await xml2js.parseStringPromise(buffer.toString('utf-8'), { mergeAttrs: true });
    return { text: JSON.stringify(parsed, null, 2).slice(0, 80000) };
  }

  if (['jpg','jpeg','png','webp','gif'].includes(ext) || mimetype.startsWith('image/')) {
    const base64 = buffer.toString('base64');
    return {
      text: `[Imagem: ${filename}] Analise os dados visíveis nesta imagem.`,
      base64: `data:${mimetype};base64,${base64}`,
    };
  }

  // audio/video/text fallback
  return { text: buffer.toString('utf-8').slice(0, 80000) };
}
