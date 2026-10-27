import Chart from '../../shared/chartSetup';

export function createIndustryChart(canvas, isDark) {
  const textColor = isDark ? '#a1a1aa' : '#71717a';

  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: [
        '智能安防 (35%)',
        '金融科技 (25%)',
        '智能物流 (20%)',
        '新能源座舱 (12%)',
        '泛互企业 (8%)',
      ],
      datasets: [
        {
          data: [35, 25, 20, 12, 8],
          backgroundColor: ['#006fee', '#7828c8', '#58a8ff', '#17c964', '#f5a524'],
          borderWidth: 2,
          borderColor: isDark ? '#18181b' : '#ffffff',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: textColor, font: { family: 'Inter', size: 11 } },
        },
      },
      cutout: '65%',
    },
  });
}

export function createCycleChart(canvas, isDark) {
  const textColor = isDark ? '#a1a1aa' : '#71717a';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';

  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['初步接触', '方案答辩验证', '商务价格谈判', '法务终审用印', '首期打款确认'],
      datasets: [
        {
          label: '平均流转周期 (天)',
          data: [4.5, 9.2, 13.8, 4.1, 3.2],
          backgroundColor: '#006fee',
          borderRadius: 8,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, callback: (val) => val + '天' },
        },
        y: {
          grid: { display: false },
          ticks: { color: textColor },
        },
      },
    },
  });
}
