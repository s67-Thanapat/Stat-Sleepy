export default function StatsCards({ avgDuration, avgQuality }:{
  avgDuration:number, avgQuality:number|null
}) {
  return (
    <div className="grid grid-cols-2 gap-4 my-4">
      <div className="rounded-xl bg-white p-4 shadow">
        <div className="text-sm text-slate-500">เวลานอนเฉลี่ย</div>
        <div className="text-2xl font-bold">{(avgDuration/60).toFixed(2)} ชม.</div>
      </div>
      <div className="rounded-xl bg-white p-4 shadow">
        <div className="text-sm text-slate-500">คุณภาพการนอนเฉลี่ย</div>
        <div className="text-2xl font-bold">{avgQuality ?? '-'} / 100</div>
      </div>
    </div>
  );
}
