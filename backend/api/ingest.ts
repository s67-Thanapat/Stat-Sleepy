import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(url, key);

type CsvRow = Record<string, string | undefined>;
type IngestBody =
  | { mode: 'csv'; text: string }
  | { mode: 'url'; url: string };

type SleepInsert = {
  user_id: string | null;
  start_time: string;
  end_time: string;
  sleep_quality: number | null;
  note: string | null;
  source: 'dataset';
};

function parseCSV(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];
  const header = lines[0].split(',').map(s => s.trim().toLowerCase());
  return lines.slice(1).map(l => {
    const cols = l.split(',').map(s => s.trim());
    const rec: CsvRow = {};
    header.forEach((h,i) => { rec[h] = cols[i] ?? undefined; });
    return rec;
  });
}

function setCORS(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOW_ORIGIN ?? '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'method not allowed' });

  try {
    const body = req.body as IngestBody;

    let rows: CsvRow[] = [];
    if (body.mode === 'csv') {
      rows = parseCSV(body.text);
    } else if (body.mode === 'url') {
      const r = await fetch(body.url);
      const txt = await r.text();
      rows = parseCSV(txt);
    } else {
      return res.status(400).json({ ok:false, error:'unknown mode' });
    }

    const toInsert: SleepInsert[] = rows.map(r => {
      const startStr = r.start_time ?? (r.date ? `${r.date} ${r.sleep_start ?? '22:30'}` : '');
      const endStr   = r.end_time   ?? (r.date ? `${r.date} ${r.sleep_end   ?? '06:30'}` : '');
      const q = r.sleep_quality ?? r.quality;
      const quality = q !== undefined && q !== '' ? Number(q) : null;

      return {
        user_id: null,
        start_time: new Date(startStr).toISOString(),
        end_time: new Date(endStr).toISOString(),
        sleep_quality: Number.isFinite(quality ?? NaN) ? (quality as number) : null,
        note: (r.note ?? null) as string | null,
        source: 'dataset',
      };
    });

    const chunk = 500;
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += chunk) {
      const { error } = await supabase.from('sleep_sessions').insert(toInsert.slice(i, i+chunk));
      if (error) throw error;
      inserted += Math.min(chunk, toInsert.length - i);
    }

    await supabase.from('dataset_imports').insert({
      user_id: null,
      source_name: 'Generic CSV',
      import_type: 'url' in (body as any) ? 'url_fetch' : 'csv_upload',
      file_url: 'url' in (body as any) ? (body as any).url : null,
      status: 'done',
      rows_inserted: inserted,
    });

    res.status(200).json({ ok:true, inserted });
  } catch (e) {
    res.status(500).json({ ok:false, error: e instanceof Error ? e.message : 'unknown error' });
  }
}
