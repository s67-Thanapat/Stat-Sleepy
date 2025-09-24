(function () {
  const fmt = new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short' });

  const btns = Array.from(document.querySelectorAll('.controls button'));
  const avgHoursEl = document.getElementById('avgHours');
  const avgQualityEl = document.getElementById('avgQuality');
  const emptyMsgAge = document.getElementById('emptyMsgAge');
  const emptyMsgSleep = document.getElementById('emptyMsgSleep');
  const emptyMsgTime = document.getElementById('emptyMsgTime');
  let gen = 'all';

  let rows = [];

  function getGen(age) {
    if (age == null) return 'ไม่ระบุ';
    if (age < 10) return "Gen Alpha"
    if (age >= 10 && age <= 27) return 'Gen Z';
    if (age >= 28 && age <= 43) return 'Gen Y';
    if (age >= 44 && age <= 59) return 'Gen X';
    if (age >= 60 && age <= 80) return 'Baby Boomer';
    return 'อื่นๆ';
  }

  function filterByGen(items) {
    if (gen === 'all') return items;
    return items.filter(r => getGen(r.age_years) === gen);
  }

  function updateGenChart(filtered) {
    // ...เหมือนเดิม...
    const genMap = {};
    filtered.forEach(r => {
      const g = getGen(r.age_years);
      if (!genMap[g]) genMap[g] = [];
      genMap[g].push((r.duration_minutes || 0) / 60);
    });

    const genData = {};
    Object.keys(genMap).forEach(g => {
      const arr = genMap[g];
      genData[g] = {
        avgHours: arr.length ? (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2) : 0
      };
    });

    renderGenChart(genData);
  }

  function updateUI() {
    const filtered = filterByGen(rows);
    if (!filtered.length) {
      emptyMsg.style.display = '';
      avgHoursEl.textContent = '-';
      avgQualityEl.textContent = '-';
      renderChart([], []);
      renderGenChart({});
      renderAgeHistogram([]);
      return;
    }
    emptyMsgSleep.style.display = 'none';
    emptyMsgAge.style.display = 'none';
    emptyMsgTime.style.display = 'none';

    const byOldest = [...filtered].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    const dailyMap = {};
    byOldest.forEach(r => {
      const d = new Date(r.start_time);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!dailyMap[key]) dailyMap[key] = [];
      dailyMap[key].push((r.duration_minutes || 0) / 60);
    });

    const labels = Object.keys(dailyMap).sort().map(d => {
      return fmt.format(new Date(d));
    });
    const hours = Object.keys(dailyMap).sort().map(d => {
      const arr = dailyMap[d];
      return arr.reduce((s, v) => s + v, 0) / arr.length;  // ค่าเฉลี่ยของวันนั้น
    });

    const avgDur = byOldest.reduce((s, r) => s + (r.duration_minutes || 0), 0) / byOldest.length;
    const qArr = byOldest.map(r => r.sleep_quality).filter(v => v != null && !Number.isNaN(v));
    const avgQ = qArr.length ? Math.round(qArr.reduce((s, v) => s + v, 0) / qArr.length) : '-';

    avgHoursEl.textContent = (avgDur / 60).toFixed(2);
    avgQualityEl.textContent = avgQ;

    renderChart(filtered);
    updateGenChart(filtered);
    renderAgeHistogram(filtered);
    renderTimeDistributionChart(filtered);
  }

  async function init() {
    try { rows = await fetchAllSessions(500); }
    catch (e) { console.error(e); alert('โหลดข้อมูลไม่สำเร็จ: ' + (e?.message || e)); rows = []; }
    updateUI();
  }

  btns.forEach(b => {
    b.addEventListener('click', () => {
      btns.forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      gen = b.getAttribute('data-gen');
      updateUI();
    });
  });

  init();
})();