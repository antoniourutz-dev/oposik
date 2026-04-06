/**
 * Importa leyes y bloques del workspace «leyes_generales» desde CSV.
 * Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 *
 * Uso:
 *   node scripts/import-general-laws/import-general-laws.mjs --laws ruta/leyes.csv --blocks ruta/bloques.csv
 *   DRY_RUN=1 …  → solo valida e imprime, no inserta.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCsv, rowsToObjects } from './csv-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

const LAW_STATUSES = new Set(['draft', 'review', 'published', 'archived']);

function parseArgs() {
  const argv = process.argv.slice(2);
  let lawsPath = path.join(__dirname, 'plantilla-leyes.csv');
  let blocksPath = path.join(__dirname, 'plantilla-bloques.csv');
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--laws' && argv[i + 1]) {
      lawsPath = path.resolve(argv[++i]);
    } else if (argv[i] === '--blocks' && argv[i + 1]) {
      blocksPath = path.resolve(argv[++i]);
    }
  }
  return { lawsPath, blocksPath };
}

function numOr(value, fallback) {
  const n = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(n) ? n : fallback;
}

async function main() {
  const { lawsPath, blocksPath } = parseArgs();

  if (!dryRun && (!supabaseUrl || !serviceRoleKey)) {
    console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
    process.exit(1);
  }

  const lawsText = fs.readFileSync(lawsPath, 'utf8');
  const blocksText = fs.readFileSync(blocksPath, 'utf8');
  const lawRows = rowsToObjects(parseCsv(lawsText));
  const blockRows = rowsToObjects(parseCsv(blocksText));

  const lawPayloads = [];
  for (const row of lawRows) {
    const law_key = String(row.law_key ?? '').trim();
    const title = String(row.title ?? '').trim();
    const short_title = String(row.short_title ?? '').trim();
    const legal_reference_label = String(row.legal_reference_label ?? '').trim();
    if (!law_key || !title || !short_title || !legal_reference_label) {
      throw new Error(
        `Fila ley incompleta: law_key, title, short_title y legal_reference_label son obligatorios (${JSON.stringify(row)})`,
      );
    }
    let status = String(row.status ?? 'draft').trim().toLowerCase();
    if (!LAW_STATUSES.has(status)) status = 'draft';
    const sort_order = numOr(row.sort_order, 0);
    const min_questions_to_publish = Math.max(1, numOr(row.min_questions_to_publish, 30));
    const training_intent = String(row.training_intent ?? '').trim() || null;

    lawPayloads.push({
      law_key,
      curriculum_key: 'leyes_generales',
      title,
      short_title,
      legal_reference_label,
      sort_order,
      status,
      min_questions_to_publish,
      training_intent,
    });
  }

  const lawKeys = new Set(lawPayloads.map((l) => l.law_key));
  if (lawKeys.size !== lawPayloads.length) {
    throw new Error('law_key duplicado en el CSV de leyes.');
  }

  const blockPayloadsPrepared = [];
  for (const row of blockRows) {
    const law_key = String(row.law_key ?? '').trim();
    const block_key = String(row.block_key ?? '').trim();
    const title = String(row.title ?? '').trim();
    if (!law_key || !block_key || !title) {
      throw new Error(`Fila bloque incompleta: ${JSON.stringify(row)}`);
    }
    if (!lawKeys.has(law_key)) {
      throw new Error(`Bloque referencia law_key desconocido "${law_key}". Debe existir en el CSV de leyes.`);
    }
    let status = String(row.status ?? 'draft').trim().toLowerCase();
    if (!LAW_STATUSES.has(status)) status = 'draft';
    let depth = numOr(row.depth, 0);
    depth = Math.max(0, Math.min(2, depth));
    const sort_order = numOr(row.sort_order, 0);
    const min_questions_for_training = Math.max(1, numOr(row.min_questions_for_training, 8));
    const parent_block_key = String(row.parent_block_key ?? '').trim() || null;
    const training_focus = String(row.training_focus ?? '').trim() || null;

    blockPayloadsPrepared.push({
      law_key,
      block_key,
      title,
      sort_order,
      depth,
      status,
      min_questions_for_training,
      training_focus,
      parent_block_key,
    });
  }

  for (const lk of lawKeys) {
    const blocks = blockPayloadsPrepared.filter((b) => b.law_key === lk);
    const keys = blocks.map((b) => b.block_key);
    if (new Set(keys).size !== keys.length) {
      throw new Error(`block_key duplicado para law_key=${lk}`);
    }
    for (const b of blocks) {
      if (b.parent_block_key && !keys.includes(b.parent_block_key)) {
        throw new Error(
          `parent_block_key "${b.parent_block_key}" no encontrado entre los bloques de law_key=${lk}`,
        );
      }
    }
  }

  console.log(`Leyes a importar: ${lawPayloads.length}`);
  console.log(`Bloques a importar: ${blockPayloadsPrepared.length}`);
  if (dryRun) {
    console.log('[DRY_RUN] No se escribe en la base. Revise los datos y ejecute sin DRY_RUN.');
    process.exit(0);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: insertedLaws, error: lawsError } = await supabase
    .schema('app')
    .from('general_laws')
    .insert(lawPayloads)
    .select('id, law_key');

  if (lawsError) {
    console.error('Error insertando general_laws:', lawsError.message);
    process.exit(1);
  }

  const lawIdByKey = new Map((insertedLaws ?? []).map((r) => [r.law_key, r.id]));

  const sortedBlocks = [...blockPayloadsPrepared].sort((a, b) => {
    if (a.law_key !== b.law_key) return a.law_key.localeCompare(b.law_key);
    if (a.depth !== b.depth) return a.depth - b.depth;
    return a.sort_order - b.sort_order;
  });

  const blockIdByLawAndKey = new Map();

  for (const b of sortedBlocks) {
    const lawId = lawIdByKey.get(b.law_key);
    if (!lawId) {
      throw new Error(`law_id no resuelto para ${b.law_key}`);
    }
    let parent_block_id = null;
    if (b.parent_block_key) {
      const p = blockIdByLawAndKey.get(`${b.law_key}::${b.parent_block_key}`);
      if (!p) {
        throw new Error(
          `Padre no encontrado para bloque ${b.law_key}/${b.block_key} (parent: ${b.parent_block_key}). Ordena por profundidad o revisa parent_block_key.`,
        );
      }
      parent_block_id = p;
    }

    const insertRow = {
      law_id: lawId,
      parent_block_id,
      block_key: b.block_key,
      title: b.title,
      sort_order: b.sort_order,
      depth: b.depth,
      status: b.status,
      min_questions_for_training: b.min_questions_for_training,
      training_focus: b.training_focus,
    };

    const { data: insBlock, error: blockErr } = await supabase
      .schema('app')
      .from('general_law_blocks')
      .insert(insertRow)
      .select('id')
      .single();

    if (blockErr) {
      console.error('Error insertando general_law_blocks:', blockErr.message, b);
      process.exit(1);
    }
    if (insBlock?.id) {
      blockIdByLawAndKey.set(`${b.law_key}::${b.block_key}`, insBlock.id);
    }
  }

  console.log('Importacion completada.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
