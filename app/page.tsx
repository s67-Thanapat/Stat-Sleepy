'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getMySleepSessions } from '@/lib/sleep';
import StatsCards from '@/components/StatsCards';
import SleepChart from '@/components/SleepChart';

type Row = {
  id: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  sleep_quality: number | null;
  note: string | null;
  source: string | null;
};

type RangeKey = '7d' | '30d' | '90d' | 'all';

export default function Dashboard() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>('30d');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/signin'); return; }
        const data = await getMySleepSessions();
        if (!mounted) return;
        setRows(data as Row[]);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
      } finally {
        if (mounted) setReady(true);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) router.push('/signin');
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [router]);

  const filteredRows = useMemo(() => {
    if (range === 'all') return rows;
    const now = new Date();
    const start = new Date(now);
    if (range === '7d')  start.setDate(start.getDate() - 7);
    if (range === '30d') start.setDate(start.getDate() - 30);
    if (range === '90d') start.setDate(start.getDate() - 90);
    return rows.filter(r => new Date(r.start_time) >= start);
  }, [rows, range]);

  const chartData = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short' });
    return [...filteredRows]
      .sort((a,b)=> new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .map(r => ({ date: fmt.format(new Date(r.start_time)), hours: r.duration_minutes/60 }));
  }, [filteredRows]);

  const avgDuration = useMemo(() => {
    if (!filteredRows.length) return 0;
    const total = filteredRows.reduce((s, r) => s + r.duration_minutes, 0);
    return total / filteredRows.length;
  }, [filteredRows]);

  const avgQuality = useMemo(() => {
    const arr = filteredRows.map(r => r.sleep_quality)
      .filter((v): v is number => v !== null && !Number.isNaN(v));
    if (!arr.length) return null;
    return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
  }, [filteredRows]);

  if (!ready) return <div className="animate-pulse text-slate-500">กำลังโหลดข้อมูล…</div>;
  if (err) return (
    <div className="space-y-3">
      <div className="text-rose-600 font-semibold">เกิดข้อผิดพลาด: {err}</div>
      <button onClick={() => location.reload()} className="px-3 py-2 rounded bg-black text-white">ลองใหม่</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 justify-between">
        <h1 className="text-3xl font-bold">สถิติการนอนของฉัน</h1>
        <Link href="/upload" className="px-3 py-2 rounded bg-black text-white">
          อัปโหลด/นำเข้าข้อมูล
        </Link>
      </div>

      <div className="flex gap-2 text-sm">
        {(['7d','30d','90d','all'] as RangeKey[]).map(k => (
          <button
            key={k}
            onClick={() => setRange(k)}
            className={[
              'px-3 py-1 rounded border',
              range === k ? 'bg-black text-white border-black' : 'bg-white text-slate-800 border-slate-300'
            ].join(' ')}
          >
            {k === '7d' ? '7 วัน' : k === '30d' ? '30 วัน' : k === '90d' ? '90 วัน' : 'ทั้งหมด'}
          </button>
        ))}
      </div>

      <StatsCards avgDuration={avgDuration} avgQuality={avgQuality} />
      <SleepChart data={chartData} />

      {!filteredRows.length && (
        <div className="text-slate-500 text-sm">
          ยังไม่มีข้อมูลในช่วงเวลาที่เลือก — ไปที่ <Link href="/upload" className="underline">อัปโหลด/นำเข้าข้อมูล</Link>
        </div>
      )}
    </div>
  );
}
