/**
 * Importa preguntas para curriculum «leyes_generales» desde CSV.
 * Resuelve law_key + block_key contra app.general_laws / app.general_law_blocks (deben existir).
 *
 * Uso:
 *   node scripts/import-general-laws/import-general-law-questions.mjs --questions ruta/preguntas.csv
 *   DRY_RUN=1  → valida y resuelve FKs; no inserta (requiere SUPABASE_* para comprobar leyes/bloques).
 */

import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCsv, rowsToObjects } from './csv-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

const SCOPE_KEYS = new Set(['common', 'specific', 'mixed']);

function parseQuestionsPath() {
  const argv = process.argv.slice(2);
  let questionsPath = path.join(__dirname, 'plantilla-preguntas.csv');
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--questions' && argv[i + 1]) {
      questionsPath = path.resolve(argv[++i]);
    }
  }
  return questionsPath;
}

function normalizeCorrect(raw) {
  const t = String(raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (['a', 'b', 'c', 'd'].includes(t)) return t;
  const n = Number.parseInt(t, 10);
  if (n >= 1 && n <= 4) return ['a', 'b', 'c', 'd'][n - 1];
  throw new Error(`respuesta_correcta invalida: "${raw}" (use a-d o 1-4)`);
}

function numOrNull(v) {
  const n = Number.parseInt(String(v ?? '').trim(), 10);
  return Number.isFinite(n) ? n : null;
}

async function loadLawAndBlockMaps(supabase) {
  const { data: laws, error: e1 } = await supabase
    .schema('app')
    .from('general_laws')
    .select('id, law_key, legal_reference_label')
    .eq('curriculum_key', 'leyes_generales');

  if (e1) throw e1;

  const { data: blocks, error: e2 } = await supabase
    .schema('app')
    .from('general_law_blocks')
    .select('id, law_id, block_key');

  if (e2) throw e2;

  const lawByKey = new Map((laws ?? []).map((l) => [l.law_key, l]));
  const blockByLawAndKey = new Map();
  for (const b of blocks ?? []) {
    blockByLawAndKey.set(`${b.law_id}::${b.block_key}`, b.id);
  }

  function resolveBlockId(lawKey, blockKey) {
    const law = lawByKey.get(lawKey);
    if (!law) return { error: `Ley no encontrada: ${lawKey}` };
    const bid = blockByLawAndKey.get(`${law.id}::${blockKey}`);
    if (!bid) return { error: `Bloque no encontrado: ${lawKey} / ${blockKey}` };
    return { law, blockId: bid };
  }

  return { lawByKey, resolveBlockId };
}

async function main() {
  const questionsPath = parseQuestionsPath();
  const text = fs.readFileSync(questionsPath, 'utf8');
  const rows = rowsToObjects(parseCsv(text));

  if (rows.length === 0) {
    console.error('No hay filas de datos en el CSV (solo cabecera o archivo vacio).');
    process.exit(1);
  }

  const payloads = [];
  for (const row of rows) {
    const law_key = String(row.law_key ?? '').trim();
    const block_key = String(row.block_key ?? '').trim();
    const question_scope_key = String(row.question_scope_key ?? '').trim().toLowerCase();
    const enunciado = String(row.enunciado ?? '').trim();
    const oa = String(row.opcion_a ?? '').trim();
    const ob = String(row.opcion_b ?? '').trim();
    const oc = String(row.opcion_c ?? '').trim();
    const od = String(row.opcion_d ?? '').trim();

    if (!law_key || !block_key || !enunciado || !oa || !ob || !oc || !od) {
      throw new Error(`Fila incompleta (law_key, block_key, enunciado, opcion_a-d obligatorios): ${JSON.stringify(row)}`);
    }
    if (!SCOPE_KEYS.has(question_scope_key)) {
      throw new Error(`question_scope_key debe ser common, specific o mixed. Fila: ${law_key}/${block_key}`);
    }

    let ley_referencia = String(row.ley_referencia ?? '').trim();
    const correct = normalizeCorrect(row.respuesta_correcta);
    const idRaw = String(row.id ?? '').trim();
    const id = idRaw && /^[0-9a-f-]{36}$/i.test(idRaw) ? idRaw : randomUUID();

    payloads.push({
      id,
      law_key,
      block_key,
      question_scope_key,
      ley_referencia,
      pregunta: enunciado,
      opcion_a: oa,
      opcion_b: ob,
      opcion_c: oc,
      opcion_d: od,
      respuesta_correcta: correct,
      numero: numOrNull(row.numero),
      categoria: String(row.categoria ?? '').trim() || null,
      temario_pregunta: String(row.temario_pregunta ?? '').trim() || null,
      explicacion: String(row.explicacion ?? '').trim() || null,
      explicacion_editorial: String(row.explicacion_editorial ?? '').trim() || null,
    });
  }

  console.log(`Preguntas en CSV: ${payloads.length}`);

  if (dryRun && (!supabaseUrl || !serviceRoleKey)) {
    console.log(
      '[DRY_RUN] Sin SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY: solo estructura CSV validada. Anada credenciales para validar leyes/bloques en la base.',
    );
    process.exit(0);
  }

  if (!dryRun && (!supabaseUrl || !serviceRoleKey)) {
    console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { resolveBlockId, lawByKey } = await loadLawAndBlockMaps(supabase);

  const insertRows = [];
  for (const p of payloads) {
    const resolved = resolveBlockId(p.law_key, p.block_key);
    if (resolved.error) {
      throw new Error(resolved.error);
    }
    const { law, blockId } = resolved;
    const leyRef = p.ley_referencia || law.legal_reference_label?.trim();
    if (!leyRef) {
      throw new Error(
        `ley_referencia vacia y la ley ${p.law_key} no tiene legal_reference_label en la base. Rellene la columna en el CSV.`,
      );
    }

    insertRows.push({
      id: p.id,
      curriculum_key: 'leyes_generales',
      general_law_id: law.id,
      general_law_block_id: blockId,
      question_scope_key: p.question_scope_key,
      ley_referencia: leyRef,
      pregunta: p.pregunta,
      opcion_a: p.opcion_a,
      opcion_b: p.opcion_b,
      opcion_c: p.opcion_c,
      opcion_d: p.opcion_d,
      respuesta_correcta: p.respuesta_correcta,
      numero: p.numero,
      categoria: p.categoria,
      temario_pregunta: p.temario_pregunta,
      explicacion: p.explicacion,
      explicacion_editorial: p.explicacion_editorial,
    });
  }

  if (dryRun) {
    console.log('[DRY_RUN] Validacion OK. No se insertan filas.');
    process.exit(0);
  }

  const chunkSize = 40;
  for (let i = 0; i < insertRows.length; i += chunkSize) {
    const chunk = insertRows.slice(i, i + chunkSize);
    const { error } = await supabase.from('preguntas').insert(chunk);
    if (error) {
      console.error(`Error insertando lote ${i}-${i + chunk.length}:`, error.message);
      process.exit(1);
    }
    console.log(`Insertadas ${chunk.length} filas (${i + chunk.length}/${insertRows.length})`);
  }

  console.log('Importacion de preguntas completada.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
