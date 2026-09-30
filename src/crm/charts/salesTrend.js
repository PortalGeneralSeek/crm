import Chart from 'chart.js/auto';

const textColorFor = (isDark) => (isDark ? '#a1a1aa' : '#71717a');
const gridColorFor = (isDark) => (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)');

const PERIODS = {
  month: {
    labels: ['第1周', '第2周', '第3周', '第4周(当前)', '第5周'],
    actual: [18, 38, 62, 82.5, null],
    target: [20, 45, 75, 100, 100],
    max: 110,
  },
  quarter: {
    labels: ['7月', '8月', '9月 (Q3)'],
    actual: [78, 92, 82.5],
    target: [85, 90, 100],
    max: 120,
  },
  year: {
    labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    actual: [42, 58, 65, 72, 85, 96, 78, 92, 82.5, null, null, null],
    target: [50, 50, 60, 60, 75, 80, 85, 90, 100, 100, 110, 120],
    max: 130,
  },
};

export function createSalesTrendChart(canvas, isDark) {
  const textColor = textColorFor(isDark);
  const gridColor = gridColorFor(isDark);

  const months = [
    '1月',
    '2月',
    '3月',
    '4月',
    '5月',
    '6月',
    '7月',
    '8月',
    '9月(当月)',
    '10月(预测)',
    '11月(预测)',
    '12月(预测)',
  ];
  const actualSales = [42, 58, 65, 72, 85, 96, 78, 92, 82.5, null, null, null];
  const targetSales = [50, 50, 60, 60, 75, 80, 85, 90, 100, 100, 110, 120];

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label: '实际达成销售额 (万元)',
          data: actualSales,
          borderColor: '#006fee',
          backgroundColor: 'rgba(0, 111, 238, 0.08)',
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: '#006fee',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4.5,
        },
        {
          label: '考核目标 (万元)',
          data: targetSales,
          borderColor: isDark ? '#52525b' : '#d4d4d8',
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.2,
          fill: false,
          pointBackgroundColor: isDark ? '#52525b' : '#a1a1aa',
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#18181b' : '#ffffff',
          titleColor: isDark ? '#f4f4f5' : '#18181b',
          bodyColor: isDark ? '#d4d4d8' : '#3f3f46',
          borderColor: isDark ? '#27272a' : '#e4e4e7',
          borderWidth: 1,
          padding: 10,
        },
      },
      scales: {
        x: {
          grid: { color: gridColor, drawBorder: false },
          ticks: { color: textColor, font: { family: 'Inter', size: 11 } },
        },
        y: {
          grid: { color: gridColor, drawBorder: false },
          ticks: {
            color: textColor,
            font: { family: 'JetBrains Mono', size: 11 },
            callback: (value) => '¥' + value + '万',
          },
          min: 0,
          max: 130,
        },
      },
    },
  });
}

// Only axis colours and the target line follow the theme; tooltip and point colours keep
// whatever the chart was created with.
export function applySalesTrendTheme(chart, isDark) {
  const textColor = textColorFor(isDark);
  const gridColor = gridColorFor(isDark);

  chart.options.scales.x.ticks.color = textColor;
  chart.options.scales.x.grid.color = gridColor;
  chart.options.scales.y.ticks.color = textColor;
  chart.options.scales.y.grid.color = gridColor;
  chart.data.datasets[1].borderColor = isDark ? '#52525b' : '#d4d4d8';
  chart.update();
}

export function applySalesTrendPeriod(chart, period) {
  const config = PERIODS[period] || PERIODS.year;
  chart.data.labels = config.labels;
  chart.data.datasets[0].data = config.actual;
  chart.data.datasets[1].data = config.target;
  chart.options.scales.y.max = config.max;
  chart.update();
}
