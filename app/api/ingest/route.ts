import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

type CsvRow = Record<string, string | undefined>;
type IngestBody =
  | { mode: 'csv'; text: string }
  | { mode: 'url'; url: string };

type SleepInsert = {
  user_id: string;
  start_time: string;
  end_time: string;
  sleep_quality: number | null;
  note: string | null;
  source: 'dataset';
};

function parseCSV(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];
  const header = lines[0].split(',').map((s) => s.trim().toLowerCase());
  return lines.slice(1).map((l) => {
    const cols = l.split(',').map((s) => s.trim());
    const rec: CsvRow = {};
    header.forEach((h, i) => {
      rec[h] = cols[i] ?? undefined;
    });
    return rec;
  });
}

async function ensureUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('not signed in');
  return user.id;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as IngestBody;
    const uid = await ensureUserId();

    let records: CsvRow[] = [];
    if (body.mode === 'csv') {
      records = parseCSV(body.text);
    } else if (body.mode === 'url') {
      const res = await fetch(body.url);
      const text = await res.text();
      records = parseCSV(text);
    } else {
      throw new Error('unknown mode');
    }

    const toInsert: SleepInsert[] = records.map((r) => {
      const startStr =
        r.start_time ?? (r.date ? `${r.date} ${r.sleep_start ?? '22:30'}` : '');
      const endStr =
        r.end_time ?? (r.date ? `${r.date} ${r.sleep_end ?? '06:30'}` : '');

      const q = r.sleep_quality ?? r.quality;
      const quality =
        q !== undefined && q !== null && q !== '' ? Number(q) : null;

      return {
        user_id: uid,
        start_time: new Date(startStr).toISOString(),
        end_time: new Date(endStr).toISOString(),
        sleep_quality: Number.isFinite(quality ?? NaN) ? (quality as number) : null,
        note: (r.note ?? null) as string | null,
        source: 'dataset',
      };
    });

    // ใส่ทีละก้อนกัน payload ใหญ่
    const chunkSize = 500;
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);
      const { error } = await supabase.from('sleep_sessions').insert(chunk);
      if (error) throw error;
      inserted += chunk.length;
    }

    await supabase.from('dataset_imports').insert({
      user_id: uid,
      source_name: 'Generic CSV',
      import_type: body.mode === 'url' ? 'url_fetch' : 'csv_upload',
      file_url: body.mode === 'url' ? body.url : null,
      status: 'done',
      rows_inserted: inserted,
    });

    return NextResponse.json({ ok: true, inserted });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
