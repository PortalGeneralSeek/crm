// 监控标的配置清单 (须与后端 marketSymbols 白名单保持一致)
export const SYMBOLS = [
  { symbol: 'TVC:GOLD', name: '现货黄金 (Gold)', category: '贵金属', unit: 'USD/oz', dec: 3 },
  { symbol: 'TVC:SILVER', name: '现货白银 (Silver)', category: '贵金属', unit: 'USD/oz', dec: 3 },
  { symbol: 'TVC:USOIL', name: 'WTI 原油 (Crude Oil)', category: '大宗能源', unit: 'USD/bbl', dec: 2 },
  { symbol: 'TVC:UKOIL', name: '布伦特原油 (Brent)', category: '大宗能源', unit: 'USD/bbl', dec: 2 },
  { symbol: 'COMEX:HG1!', name: 'COMEX 铜 (Copper)', category: '大宗工业', unit: 'USD/lb', dec: 3 },
  { symbol: 'TVC:DXY', name: '美元指数 (DXY)', category: '汇率利差', unit: '点', dec: 2 },
  { symbol: 'TVC:US10Y', name: '美债10年期收益率', category: '汇率利差', unit: '%', dec: 3 },
  { symbol: 'FX_IDC:USDCNH', name: '美元 / 离岸人民币', category: '汇率利差', unit: 'CNY', dec: 4 },
  { symbol: 'TVC:VIX', name: '恐慌指数 (VIX)', category: '风险与股市', unit: '点', dec: 2 },
  { symbol: 'TVC:SPX', name: '标普500指数 (S&P 500)', category: '风险与股市', unit: '点', dec: 2 },
  { symbol: 'BINANCE:BTCUSDT', name: '比特币 (BTC/USDT)', category: '风险与股市', unit: 'USDT', dec: 1 },
];

export const klinePath = (symbol) => `/market-monitor/kline/${encodeURIComponent(symbol)}`;
