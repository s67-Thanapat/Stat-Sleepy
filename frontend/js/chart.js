let chart;
function renderChart(labels, hours) {
  const ctx = document.getElementById('sleepChart');
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label:'ชั่วโมงการนอน', data: hours, tension:0.3 }] },
    options: { responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true } } }
  });
}
