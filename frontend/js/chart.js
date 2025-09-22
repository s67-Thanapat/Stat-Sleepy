let chart;
function renderChart(labels, hours) {
  const ctx = document.getElementById('sleepChart');
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'ชั่วโมงการนอน', data: hours, tension: 0.3 }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
  });
}

let genChart;
function renderGenChart(genData) {
  const ctx = document.getElementById('genChart');
  if (genChart) genChart.destroy();

  const labels = Object.keys(genData);
  const data = labels.map(gen => genData[gen].avgHours);

  genChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'ชั่วโมงการนอนเฉลี่ย',
        data,
        backgroundColor: ['#60a5fa', '#fbbf24', '#34d399', '#f472b6'],
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } }
    }
  });
}
