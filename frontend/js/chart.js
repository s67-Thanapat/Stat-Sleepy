let chart;
function renderChart(rows) {
  const ctx = document.getElementById('sleepChart');
  if (chart) chart.destroy();

  // เตรียมข้อมูล scatter
  const dataPoints = rows
    .filter(r => r.sleep_quality != null && r.duration_minutes != null)
    .map(r => ({
      x: Number(r.sleep_quality),
      y: Number(r.duration_minutes) / 60
    }));

  // คำนวณ linear regression (y = a + bx)
  function linearRegression(data) {
    const n = data.length;
    if (n < 2) return null;
    const sumX = data.reduce((s, p) => s + p.x, 0);
    const sumY = data.reduce((s, p) => s + p.y, 0);
    const sumXY = data.reduce((s, p) => s + p.x * p.y, 0);
    const sumXX = data.reduce((s, p) => s + p.x * p.x, 0);
    const meanX = sumX / n;
    const meanY = sumY / n;
    const b = (sumXY - n * meanX * meanY) / (sumXX - n * meanX * meanX);
    const a = meanY - b * meanX;
    return { a, b };
  }

  const lr = linearRegression(dataPoints);

  // สร้างจุดสำหรับเส้น regression
  let regressionLine = [];
  if (lr && dataPoints.length > 1) {
    const minX = Math.min(...dataPoints.map(p => p.x));
    const maxX = Math.max(...dataPoints.map(p => p.x));
    regressionLine = [
      { x: minX, y: lr.a + lr.b * minX },
      { x: maxX, y: lr.a + lr.b * maxX }
    ];
  }

  chart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'แต่ละรายการ',
          data: dataPoints,
          backgroundColor: '#60a5fa'
        },
        ...(regressionLine.length
          ? [{
            label: 'Linear Regression',
            type: 'line',
            data: regressionLine,
            borderColor: '#f43f5e',
            borderWidth: 2,
            fill: false,
            pointRadius: 0,
            tension: 0
          }]
          : [])
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true }
      },
      scales: {
        x: {
          title: { display: true, text: 'คุณภาพการนอน (0-100)' },
          min: 0,
          max: 100
        },
        y: {
          title: { display: true, text: 'ชั่วโมงที่นอน' },
          beginAtZero: true
        }
      }
    }
  });
}

let ageHistChart;
function renderAgeHistogram(rows) {
  const ctx = document.getElementById('ageHistChart');
  if (!ctx) return;
  if (ageHistChart) ageHistChart.destroy();

  // สร้าง bin อายุ (ช่วงละ 5 ปี)
  const bins = {};
  rows.forEach(r => {
    if (r.age_years == null || isNaN(r.age_years)) return;
    const age = Math.floor(Number(r.age_years));
    const bin = `${Math.floor(age / 5) * 5}-${Math.floor(age / 5) * 5 + 4}`;
    if (!bins[bin]) bins[bin] = [];
    bins[bin].push((r.duration_minutes || 0) / 60);
  });

  const labels = Object.keys(bins).sort((a, b) => {
    const aStart = parseInt(a.split('-')[0]);
    const bStart = parseInt(b.split('-')[0]);
    return aStart - bStart;
  });
  const data = labels.map(bin => {
    const arr = bins[bin];
    return arr.length ? (arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
  });

  ageHistChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'ชั่วโมงที่นอน (เฉลี่ย)',
        data,
        backgroundColor: '#38bdf8'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { title: { display: true, text: 'อายุ (ปี)' } },
        y: { title: { display: true, text: 'ชั่วโมงที่นอน' }, beginAtZero: true }
      }
    }
  });
}

let chart2;
function renderGenChart(genData) { }

let timeDistChart;
function renderTimeDistributionChart(rows) {
  const ctx = document.getElementById('timeDistChart');
  if (!ctx) return;
  if (timeDistChart) timeDistChart.destroy();

  // นับจำนวน session ที่เริ่มนอนในแต่ละชั่วโมง (0-23)
  const bins = Array(24).fill(0);
  rows.forEach(r => {
    if (!r.start_time) return;
    const d = new Date(r.start_time);
    const hour = d.getHours();
    bins[hour]++;
  });

  timeDistChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [{
        label: 'จำนวนครั้งที่เริ่มนอน',
        data: bins,
        backgroundColor: '#818cf8'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { title: { display: true, text: 'เวลาเริ่มนอน (ชั่วโมง)' } },
        y: { title: { display: true, text: 'จำนวนครั้ง' }, beginAtZero: true }
      }
    }
  });
}