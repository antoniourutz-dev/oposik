/**
 * CSV UTF-8: comas, comillas dobles, \r\n. Cabeceras en la primera fila (sin case sensitive al convertir a objetos).
 */

export function parseCsv(text) {
  const rows = [];
  const s = text.replace(/^\uFEFF/, '');
  let row = [];
  let field = '';
  let i = 0;
  let inQ = false;
  while (i < s.length) {
    const c = s[i];
    if (inQ) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQ = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQ = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((x) => String(x).trim() !== '')) {
        rows.push(row.map((x) => String(x).trim()));
      }
      row = [];
      i++;
      continue;
    }
    field += c;
    i++;
  }
  row.push(field);
  if (row.some((x) => String(x).trim() !== '')) {
    rows.push(row.map((x) => String(x).trim()));
  }
  return rows;
}

export function rowsToObjects(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const line = rows[r];
    if (!line.some((c) => c !== '')) continue;
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = line[c] ?? '';
    }
    out.push(obj);
  }
  return out;
}

export function readCsvObjects(filePath, fs) {
  const text = fs.readFileSync(filePath, 'utf8');
  return rowsToObjects(parseCsv(text));
}
