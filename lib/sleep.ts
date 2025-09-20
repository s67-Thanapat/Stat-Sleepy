import { supabase } from './supabaseClient';

export type SleepRow = {
  id: number;
  user_id: string | null;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  sleep_quality: number | null;
  source: string | null;
  note: string | null;
};

export async function getMySleepSessions() {
  // ตอนนี้ “ทุกคนเห็นกองเดียวกัน” → เลือกทั้งหมด (จะใส่ limit เพื่อความเร็ว)
  const { data, error } = await supabase
    .from('sleep_sessions')
    .select('*')
    .order('start_time', { ascending: false })
    .limit(500);
  if (error) throw error;
  return data as SleepRow[];
}

export async function addSleepSession(input: {
  start_time: string; end_time: string; sleep_quality?: number; note?: string;
}) {
  const { error } = await supabase.from('sleep_sessions').insert({
    user_id: null,                 // ไม่ใช้ผู้ใช้แล้ว
    start_time: input.start_time,
    end_time: input.end_time,
    sleep_quality: input.sleep_quality ?? null,
    note: input.note ?? null,
    source: 'manual'
  });
  if (error) throw error;
}
