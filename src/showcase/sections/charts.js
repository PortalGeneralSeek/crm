import Chart from 'chart.js/auto';

export function createRevenueChart(canvas, isDark) {
  const textColor = isDark ? '#a1a1aa' : '#71717a';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  const gradient = canvas.getContext('2d').createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, 'rgba(0, 111, 238, 0.35)');
  gradient.addColorStop(1, 'rgba(0, 111, 238, 0.0)');

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: ['4月', '5月', '6月', '7月', '8月', '9月'],
      datasets: [
        {
          label: '实际收益 (Actual)',
          data: [185000, 210000, 245000, 230000, 275000, 284930],
          borderColor: '#006fee',
          backgroundColor: gradient,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#006fee',
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: '预期目标 (Target)',
          data: [170000, 195000, 220000, 240000, 260000, 280000],
          borderColor: isDark ? '#52525b' : '#d4d4d8',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#27272a' : '#ffffff',
          titleColor: isDark ? '#f4f4f5' : '#18181b',
          bodyColor: isDark ? '#d4d4d8' : '#52525b',
          borderColor: isDark ? '#3f3f46' : '#e4e4e7',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 10,
        },
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'Inter', size: 11 } },
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: 'Inter', size: 11 },
            callback: (val) => '¥' + val / 1000 + 'k',
          },
        },
      },
    },
  });
}

export function createTrafficChart(canvas, isDark) {
  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['自然搜索', '直接访问', '社交引流', '付费广告'],
      datasets: [
        {
          data: [45, 25, 20, 10],
          backgroundColor: ['#006fee', '#7828c8', '#17c964', '#f5a524'],
          borderWidth: 2,
          borderColor: isDark ? '#16171a' : '#ffffff',
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: { cornerRadius: 8, padding: 8 },
      },
    },
  });
}
