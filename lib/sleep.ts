import { supabase } from './supabaseClient';

export type SleepRow = {
  id: number;
  user_id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  sleep_quality: number | null;
  source: string | null;
  note: string | null;
};

export async function getMySleepSessions() {
  const { data, error } = await supabase
    .from('sleep_sessions')
    .select('*')
    .order('start_time', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data as SleepRow[];
}

export async function addSleepSession(input: {
  start_time: string; end_time: string; sleep_quality?: number; note?: string;
}) {
  const { data: user } = await supabase.auth.getUser();
  const uid = user.user?.id;
  if (!uid) throw new Error('not signed in');
  const { error } = await supabase.from('sleep_sessions').insert({
    user_id: uid,
    start_time: input.start_time,
    end_time: input.end_time,
    sleep_quality: input.sleep_quality ?? null,
    note: input.note ?? null,
    source: 'manual'
  });
  if (error) throw error;
}
