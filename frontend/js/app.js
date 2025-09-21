(function () {
  const fmt = new Intl.DateTimeFormat('th-TH', { timeZone:'Asia/Bangkok', day:'2-digit', month:'short' });

  const btns = Array.from(document.querySelectorAll('.controls button'));
  const avgHoursEl = document.getElementById('avgHours');
  const avgQualityEl = document.getElementById('avgQuality');
  const emptyMsg = document.getElementById('emptyMsg');

  let range = '30d';
  let rows = [];

  function filterByRange(items) {
    if (range === 'all') return items;
    const start = new Date();
    if (range === '7d')  start.setDate(start.getDate() - 7);
    if (range === '30d') start.setDate(start.getDate() - 30);
    if (range === '90d') start.setDate(start.getDate() - 90);
    return items.filter(r => new Date(r.start_time) >= start);
  }

  function updateUI() {
    const filtered = filterByRange(rows);
    if (!filtered.length) {
      emptyMsg.style.display = '';
      avgHoursEl.textContent = '-';
      avgQualityEl.textContent = '-';
      renderChart([], []);
      return;
    }
    emptyMsg.style.display = 'none';

    const byOldest = [...filtered].sort((a,b)=> new Date(a.start_time)-new Date(b.start_time));
    const labels = byOldest.map(r => fmt.format(new Date(r.start_time)));
    const hours  = byOldest.map(r => (r.duration_minutes || 0) / 60);

    const avgDur = byOldest.reduce((s,r)=> s+(r.duration_minutes||0), 0) / byOldest.length;
    const qArr = byOldest.map(r=>r.sleep_quality).filter(v=> v!=null && !Number.isNaN(v));
    const avgQ = qArr.length ? Math.round(qArr.reduce((s,v)=>s+v,0)/qArr.length) : '-';

    avgHoursEl.textContent = (avgDur/60).toFixed(2);
    avgQualityEl.textContent = avgQ;

    renderChart(labels, hours);
  }

  async function init() {
    try { rows = await fetchAllSessions(500); }
    catch (e) { console.error(e); alert('โหลดข้อมูลไม่สำเร็จ: ' + (e?.message||e)); rows = []; }
    updateUI();
  }

  btns.forEach(b=>{
    b.addEventListener('click', ()=>{
      btns.forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      range = b.getAttribute('data-range');
      updateUI();
    });
  });

  init();
})();
