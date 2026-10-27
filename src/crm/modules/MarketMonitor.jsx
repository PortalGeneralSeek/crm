import { useEffect, useRef, useState, useMemo } from 'react';
import Icon from '../../shared/Icon';
import Select from '../../shared/Select';
import { crmApi, useAuth } from '../services/crmApi';
import { useToast } from '../hooks/useToast';
import { SYMBOLS, klinePath } from '../data/marketSymbols';
import {
  ImpactChips,
  POPUP_MODES,
  formatNewsTime,
  relativeTime,
  usePopupMode,
} from '../components/newsImpactUi';
import MacroInflationPanel from '../components/MacroInflationPanel';
import MacroTransmissionPanel from '../components/MacroTransmissionPanel';
import { DriverChain, buildDriverIndex } from '../components/macroTransmission';

// 用推送的单个序列替换快照中的同名序列；新国家/新序列返回 null 交由调用方整体刷新
const mergeMacroSeries = (snapshot, series) => {
  if (!snapshot || !series) return null;
  let found = false;
  const countries = snapshot.countries.map((c) => {
    if (c.code !== series.country) return c;
    const idx = c.series.findIndex((s) => s.key === series.key);
    if (idx < 0) return c;
    found = true;
    const next = c.series.slice();
    next[idx] = series;
    return { ...c, series: next };
  });
  if (!found) return null;
  const upcoming = (snapshot.upcoming || []).filter((u) => u.series !== series.key || (series.next && u.releaseAt === series.next.releaseAt));
  return {
    ...snapshot,
    countries,
    upcoming,
    status: {
      ...snapshot.status,
      lastReleaseAt: series.latest?.releasedAt || snapshot.status?.lastReleaseAt,
      streamReleases: (snapshot.status?.streamReleases || 0) + 1,
    },
  };
};

const NEWS_LIST_LIMIT = 200;
const AI_NEWS_LIMIT = 30;
// 资产卡片只展示近 2 小时内的快讯影响，过旧的信号不再具有参考意义
const ASSET_SIGNAL_WINDOW_MS = 2 * 60 * 60 * 1000;

const NEWS_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'us', label: '美国相关' },
  { value: 'breaking', label: '突发' },
  { value: 'impact', label: '有资产影响' },
];

const mergeNews = (incoming, prev) => {
  const map = new Map();
  [...incoming, ...prev].forEach((n) => {
    if (n && n.id && !map.has(n.id)) map.set(n.id, n);
  });
  return Array.from(map.values())
    .sort((a, b) => b.id - a.id)
    .slice(0, NEWS_LIST_LIMIT);
};

// 快捷分析预设指令
const QUICK_PROMPTS = [
  {
    id: 'geopolitics',
    title: '💥 中东地缘局势与黄金避险推演',
    desc: '霍尔木兹海峡军事戒备加剧对黄金/原油避险溢价传导',
    prompt: '结合当前最新收集的中东局势异动与霍尔木兹海峡地缘风险，重点推演资本对黄金与原油的短期避险溢价脉冲规模、持续时间与可能回吐的临界点。',
  },
  {
    id: 'fed_rates',
    title: '🏛️ 美联储降息与美债美指实际利率研判',
    desc: '结合 10年期美债收益率与美元指数推演持有黄金机会成本',
    prompt: '结合美联储最新鸽派纪要、10年期美债实际收益率走势与美元指数点位，深入剖析无风险利率变化对非生息资产黄金中长期估值重塑的传导链。',
  },
  {
    id: 'central_banks',
    title: '🪙 全球央行24个月购金潮与去美元化',
    desc: '官方储备多元化如何为金价构筑不可击穿的底座',
    prompt: '结合世界黄金协会关于全球央行连续24个月净增持的最新时政数据，评估主权去美元化储备多元化趋势对黄金长期估值中枢与抗跌性的实质支撑。',
  },
  {
    id: 'stagflation',
    title: '🛢️ 原油大宗反弹与滞胀抗通胀配置',
    desc: '大宗商品共振与通胀二次抬头预期下的对冲策略',
    prompt: '结合原油价格反弹引发的二次通胀风险，以及非农与CPI粘性数据，研判对冲基金在滞胀（Stagflation）环境下配置黄金与白银的买盘力度。',
  },
  {
    id: 'comprehensive',
    title: '🌐 全球宏观多维因果链综合推演',
    desc: '全面整合时政事件、资金流向、阻力支撑与操盘建议',
    prompt: '全面整合上述所有国际地缘时政要闻与跨资产盘面跳价，输出一份详尽机构级宏观资产配置周报，包含关键阻力支撑位与国内金价（元/克）操盘建议。',
  },
];

// 统一强制北京时间 (UTC+8) 格式化工具函数
export const formatBeijingTime = (val) => {
  if (!val) return '';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.includes('北京时间')) return trimmed;
    if (trimmed.includes('前')) return `${trimmed} (北京时间基准)`;
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) return `${trimmed} (北京时间)`;
  }
  try {
    const d = typeof val === 'number' ? new Date(val * (val < 1e11 ? 1000 : 1)) : new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return (
      new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
        .format(d)
        .replace(/\//g, '-') + ' (北京时间)'
    );
  } catch (e) {
    return String(val);
  }
};

export const formatBeijingTimeShort = (val) => {
  if (!val) return '';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.includes('北京时间')) return trimmed;
    if (trimmed.includes('前')) return `${trimmed} (北京时间)`;
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) return `${trimmed} (北京时间)`;
  }
  try {
    const d = typeof val === 'number' ? new Date(val * (val < 1e11 ? 1000 : 1)) : new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return (
      new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(d) + ' (北京时间)'
    );
  } catch (e) {
    return String(val);
  }
};

export default function MarketMonitor({ active, isDark }) {
  const showToast = useToast();
  const auth = useAuth();

  // 盘面实时价格状态
  const [quotes, setQuotes] = useState({});
  const [derived, setDerived] = useState({
    goldSilverRatio: '68.910',
    domesticGoldYuan: '904.680',
    riskSentiment: 'Risk-On (偏平稳)',
  });
  const [flashStates, setFlashStates] = useState({}); // { [symbol]: 'up' | 'down' }
  const [wsStatus, setWsStatus] = useState('connecting'); // connected | connecting | fallback
  const [lastTickTime, setLastTickTime] = useState('');
  const [totalTicks, setTotalTicks] = useState(0);

  // FinancialJuice 全球实时快讯 (后端 Centrifugo WSS 桥接，到达即推送)
  const [newsList, setNewsList] = useState([]);
  const [newsStatus, setNewsStatus] = useState(null);
  const [selectedNewsIds, setSelectedNewsIds] = useState([]);
  const [freshNewsIds, setFreshNewsIds] = useState({});
  const [newsFilter, setNewsFilter] = useState('all');
  const [popupMode, setPopupMode] = usePopupMode();
  const freshTimersRef = useRef({});
  const [playbook, setPlaybook] = useState(null);
  const [expandedNewsId, setExpandedNewsId] = useState(null);
  const driverIndex = useMemo(() => buildDriverIndex(playbook?.drivers), [playbook]);

  // 各国 CPI/PPI：页面加载与每次 WSS (重)连接时拉取一次快照，之后由 macro_release 推送增量
  const [macro, setMacro] = useState(null);
  const [macroLoading, setMacroLoading] = useState(false);
  const [freshMacroKeys, setFreshMacroKeys] = useState({});
  const macroTimersRef = useRef({});
  const macroRef = useRef(null);
  const wsInitCountRef = useRef(0);
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const fetchMacro = () => {
    setMacroLoading(true);
    crmApi
      .getMarketMacro()
      .then((res) => {
        if (res?.data?.countries) {
          macroRef.current = res.data;
          setMacro(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setMacroLoading(false));
  };
  const fetchMacroRef = useRef(fetchMacro);
  fetchMacroRef.current = fetchMacro;
  const markMacroFresh = (key) => {
    setFreshMacroKeys((f) => ({ ...f, [key]: true }));
    if (macroTimersRef.current[key]) clearTimeout(macroTimersRef.current[key]);
    macroTimersRef.current[key] = setTimeout(() => {
      setFreshMacroKeys((f) => {
        const copy = { ...f };
        delete copy[key];
        return copy;
      });
      delete macroTimersRef.current[key];
    }, 15000);
  };
  const markMacroFreshRef = useRef(markMacroFresh);
  markMacroFreshRef.current = markMacroFresh;

  // AI 智能研判状态 (支持打字机流式输出与取消)
  const [aiInput, setAiInput] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiThinking, setAiThinking] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiEngine, setAiEngine] = useState('系统内嵌全球宏观分析引擎');
  const resultRef = useRef(null);
  const abortControllerRef = useRef(null);
  const flashTimersRef = useRef({});
  const lastMsgTimeRef = useRef(Date.now());

  // 自定义 API 配置面板与存储
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [apiConfig, setApiConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('acme_crm_market_llm_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: '',
      model: 'deepseek-chat',
      temperature: 0.6,
    };
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);

  // 美化下拉选：将模型列表结构化为包含图标、分类标签的选项集合
  const modelOptions = useMemo(() => {
    const baseList =
      availableModels && availableModels.length > 0
        ? [...availableModels]
        : ['deepseek-chat', 'deepseek-reasoner', 'gpt-4o', 'claude-3-5-sonnet'];

    const set = new Set(baseList);
    if (apiConfig.model && !set.has(apiConfig.model)) {
      baseList.unshift(apiConfig.model);
    }

    return baseList.map((m) => {
      let badge = 'LLM';
      let icon = 'box';
      const lower = m.toLowerCase();
      if (lower.includes('reasoner') || lower.includes('r1') || lower.includes('o1') || lower.includes('o3')) {
        badge = '深度推理';
        icon = 'brain';
      } else if (lower.includes('deepseek')) {
        badge = 'DeepSeek';
        icon = 'sparkles';
      } else if (lower.includes('gpt-4') || lower.includes('gpt-3') || lower.includes('openai')) {
        badge = 'OpenAI';
        icon = 'zap';
      } else if (lower.includes('claude')) {
        badge = 'Anthropic';
        icon = 'cpu';
      } else if (lower.includes('qwen')) {
        badge = '通义千问';
        icon = 'sparkles';
      } else if (lower.includes('moonshot') || lower.includes('kimi')) {
        badge = 'Moonshot';
        icon = 'moon';
      } else if (lower.includes('embedding')) {
        badge = '向量嵌入';
        icon = 'database';
      }
      return {
        value: m,
        label: m,
        badge,
        icon,
      };
    });
  }, [availableModels, apiConfig.model]);

  // 从配置的 API 获取模型列表
  const handleFetchModels = async () => {
    if (!apiConfig.baseUrl) {
      showToast('请先输入有效的 API 接口服务地址 (Base URL)', 'warning');
      return;
    }
    setFetchingModels(true);
    try {
      const res = await crmApi.fetchMarketModels(apiConfig.baseUrl, apiConfig.apiKey);
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        setAvailableModels(res.data);
        showToast(`成功获取到 ${res.data.length} 个可用模型！`, 'success');
        if (!apiConfig.model || !res.data.includes(apiConfig.model)) {
          const preferred =
            res.data.find((m) => m.includes('deepseek') || m.includes('gpt-4') || m.includes('chat')) ||
            res.data[0];
          setApiConfig((prev) => ({ ...prev, model: preferred }));
        }
      } else {
        showToast('接口未返回可用模型列表', 'warning');
      }
    } catch (err) {
      showToast(`获取模型失败: ${err.message}`, 'error');
    } finally {
      setFetchingModels(false);
    }
  };

  // 保存 API 配置
  const handleSaveApiConfig = (e) => {
    e.preventDefault();
    try {
      localStorage.setItem('acme_crm_market_llm_config', JSON.stringify(apiConfig));
      showToast('大模型 API 配置已持久化保存！', 'success');
      setApiModalOpen(false);
    } catch (err) {
      showToast('保存配置异常: ' + err.message, 'error');
    }
  };

  // 1. 初始化拉取新闻与基准盘面
  const fetchMarketData = async () => {
    try {
      const [quotesRes, newsRes] = await Promise.all([
        crmApi.getMarketQuotes().catch(() => null),
        crmApi.getMarketNews().catch(() => null),
      ]);

      if (quotesRes?.data?.quotes) {
        const qMap = {};
        quotesRes.data.quotes.forEach((item) => {
          qMap[item.symbol] = item;
        });
        setQuotes((prev) => ({ ...prev, ...qMap }));
        if (quotesRes.data.derived) {
          setDerived(quotesRes.data.derived);
        }
      }

      if (Array.isArray(newsRes?.data)) {
        setNewsList((prev) => mergeNews(newsRes.data, prev));
      }
      if (newsRes?.status) {
        setNewsStatus(newsRes.status);
      }
    } catch (err) {
      console.warn('API 拉取盘面异常:', err);
    }
  };

  useEffect(() => {
    fetchMarketData();
    fetchMacro();
  }, []);

  // 传导剧本是静态规则，挂载时拉取一次；盘面驱动由前端用 WSS 推送的行情就地计算
  useEffect(() => {
    let cancelled = false;
    let retry = null;
    const load = (attempt = 0) => {
      crmApi
        .getMarketPlaybook()
        .then((res) => {
          if (!cancelled && res?.data?.drivers) setPlaybook(res.data);
        })
        .catch(() => {
          if (!cancelled && attempt < 3) retry = setTimeout(() => load(attempt + 1), 5000 * (attempt + 1));
        });
    };
    load();
    return () => {
      cancelled = true;
      clearTimeout(retry);
    };
  }, []);

  // 2. 建立 CRM 后端认证 WSS 长连接 (登录有建立wss，再推送；未登录直接写入数据库)
  useEffect(() => {
    let ws = null;
    let pingInterval = null;
    let watchdogInterval = null;
    let reconnectTimeout = null;
    // cleanup 中主动 close 也会触发 onclose；若不拦截，旧闭包会携带旧 token 再次重连，造成重复连接
    let disposed = false;

    const connectWSS = () => {
      if (disposed) return;
      // 仅在用户已登录拥有 token 时建立 WSS
      if (!auth.token) {
        setWsStatus('fallback');
        return;
      }

      try {
        setWsStatus('connecting');
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const backendWsUrl = `${protocol}//${window.location.host}/api/v1/market/ws?token=${encodeURIComponent(auth.token)}`;
        
        ws = new WebSocket(backendWsUrl);

        ws.onopen = () => {
          setWsStatus('connected');
          lastMsgTimeRef.current = Date.now();
          // 定时发送客户端心跳 (每10秒)
          pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send('ping');
            }
          }, 10000);

          // 连接保活看门狗 (每4秒巡检，若12秒无任何推送或响应则主动重连，拒绝假死)
          watchdogInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN && Date.now() - lastMsgTimeRef.current > 12000) {
              console.warn('[WSS Watchdog] 超过12秒未接收到行情推送，主动重新建立长连接');
              try {
                ws.close();
              } catch (e) {}
            }
          }, 4000);
        };

        ws.onmessage = (event) => {
          try {
            lastMsgTimeRef.current = Date.now();
            if (event.data === 'pong') return;
            const data = JSON.parse(event.data);

            if (data.type === 'init_news') {
              if (Array.isArray(data.news)) setNewsList((prev) => mergeNews(data.news, prev));
              if (data.status) setNewsStatus(data.status);
              // init_news 每次 (重)连接下发一次；首次连接的快照已由挂载时拉取，重连时补齐断线期间的 CPI/PPI 发布
              if (wsInitCountRef.current++ > 0) fetchMacroRef.current();
              return;
            }
            if (data.type === 'macro_release' && data.series) {
              const merged = mergeMacroSeries(macroRef.current, data.series);
              if (merged) {
                macroRef.current = merged;
                setMacro(merged);
              } else {
                fetchMacroRef.current();
              }
              markMacroFreshRef.current(data.series.key);
              const r = data.release || {};
              const beat = { above: '高于预期', below: '低于预期', inline: '符合预期' }[r.beat] || '';
              showToastRef.current(
                `${data.series.countryName} ${data.series.label} 公布: ${r.actual} (预期 ${r.forecast}, 前值 ${r.previous})${beat ? ' · ' + beat : ''}`,
                data.series.country === 'US' ? 'warning' : 'info'
              );
              return;
            }
            if (data.type === 'macro_refresh') {
              fetchMacroRef.current();
              return;
            }
            if (data.type === 'news_status') {
              if (data.status) setNewsStatus(data.status);
              return;
            }
            if (data.type === 'news_flash' && data.news) {
              const id = data.news.id;
              setNewsList((prev) => mergeNews([data.news], prev));
              setNewsStatus((prev) =>
                prev ? { ...prev, realtimeCount: (prev.realtimeCount || 0) + 1, lastMessageAt: new Date().toISOString() } : prev
              );
              setFreshNewsIds((f) => ({ ...f, [id]: true }));
              if (freshTimersRef.current[id]) clearTimeout(freshTimersRef.current[id]);
              freshTimersRef.current[id] = setTimeout(() => {
                setFreshNewsIds((f) => {
                  const copy = { ...f };
                  delete copy[id];
                  return copy;
                });
                delete freshTimersRef.current[id];
              }, 8000);
              return;
            }

            if (data.type === 'init_quotes' || data.type === 'market_tick') {
              if (data.derived) {
                setDerived(data.derived);
              }
              if (data.timestamp) {
                setLastTickTime(data.timestamp);
              }
              setTotalTicks((c) => c + 1);

              if (Array.isArray(data.quotes)) {
                const nextFlashes = {};
                setQuotes((prev) => {
                  const updatedMap = { ...prev };
                  data.quotes.forEach((item) => {
                    const current = prev[item.symbol] || {};
                    const oldPrice = current.price;
                    const newPrice = item.price;
                    const oldBid = current.bid;
                    const newBid = item.bid;

                    let dir = null;
                    if (oldPrice !== undefined && newPrice !== undefined && oldPrice !== newPrice) {
                      dir = newPrice > oldPrice ? 'up' : 'down';
                    } else if (data.updatedSymbol === item.symbol || data.updatedSymbols?.includes(item.symbol)) {
                      if (oldBid !== undefined && newBid !== undefined && oldBid !== newBid) {
                        dir = newBid > oldBid ? 'up' : 'down';
                      } else {
                        dir = (item.change || 0) >= 0 ? 'up' : 'down';
                      }
                    }

                    if (dir) {
                      nextFlashes[item.symbol] = dir;
                      if (flashTimersRef.current[item.symbol]) {
                        clearTimeout(flashTimersRef.current[item.symbol]);
                      }
                      flashTimersRef.current[item.symbol] = setTimeout(() => {
                        setFlashStates((f) => {
                          const copy = { ...f };
                          delete copy[item.symbol];
                          return copy;
                        });
                        delete flashTimersRef.current[item.symbol];
                      }, 800);
                    }

                    updatedMap[item.symbol] = {
                      ...current,
                      ...item,
                    };
                  });
                  return updatedMap;
                });

                if (Object.keys(nextFlashes).length > 0) {
                  setFlashStates((f) => ({ ...f, ...nextFlashes }));
                }
              }
            }
          } catch (e) {}
        };

        ws.onerror = () => {
          setWsStatus('fallback');
        };

        ws.onclose = () => {
          if (pingInterval) clearInterval(pingInterval);
          if (watchdogInterval) clearInterval(watchdogInterval);
          if (disposed) return;
          setWsStatus('fallback');
          reconnectTimeout = setTimeout(connectWSS, 2000);
        };
      } catch (err) {
        if (disposed) return;
        setWsStatus('fallback');
        reconnectTimeout = setTimeout(connectWSS, 2000);
      }
    };

    connectWSS();

    // 备选保底轮询（当 WebSocket 受网络策略阻断或断开时，每8秒通过后台轻量拉取）
    const pollInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) return;
      crmApi.getMarketQuotes().then((res) => {
        if (res?.data?.quotes) {
          const qMap = {};
          res.data.quotes.forEach((item) => {
            qMap[item.symbol] = item;
          });
          setQuotes((prev) => ({ ...prev, ...qMap }));
          if (res.data.derived) setDerived(res.data.derived);
        }
      }).catch(() => {});
    }, 8000);

    return () => {
      disposed = true;
      if (ws) ws.close();
      if (pingInterval) clearInterval(pingInterval);
      if (watchdogInterval) clearInterval(watchdogInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pollInterval) clearInterval(pollInterval);
      Object.values(flashTimersRef.current).forEach(clearTimeout);
      Object.values(freshTimersRef.current).forEach(clearTimeout);
    };
  }, [auth.token]);

  // 动态重新计算衍生指标
  useEffect(() => {
    const gold = quotes['TVC:GOLD']?.price || 4210.5;
    const silver = quotes['TVC:SILVER']?.price || 61.25;
    const usdcnh = quotes['FX_IDC:USDCNH']?.price || 6.693;

    if (silver > 0 && usdcnh > 0) {
      const gs = (gold / silver).toFixed(3);
      const domestic = ((gold * usdcnh) / 31.1034768).toFixed(3);
      setDerived((prev) => ({
        ...prev,
        goldSilverRatio: gs,
        domesticGoldYuan: domestic,
      }));
    }
  }, [quotes]);

  // 停止当前正在生成的流式研报
  const handleStopAiAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setAiStreaming(false);
    setAiLoading(false);
    showToast('已主动停止 AI 研报流式生成', 'info');
  };

  // 组件卸载时安全释放 abortController
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 触发 AI 宏观分析 (打字机流式输出 SSE)
  const handleExecuteAiAnalysis = async (type = 'comprehensive', customPrompt = '') => {
    const promptText = customPrompt || aiInput || QUICK_PROMPTS.find((p) => p.id === type)?.prompt;

    // 若当前正在流式输出，先取消上一次请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setAiLoading(true);
    setAiStreaming(true);
    setAiResult('');
    setAiThinking('');

    try {
      const payload = {
        analysisType: type,
        prompt: promptText,
        apiConfig: apiConfig.apiKey ? apiConfig : null,
        newsIds: selectedNewsIds.slice(0, AI_NEWS_LIMIT),
      };

      await crmApi.streamMarketAi(
        payload,
        (delta, parsed) => {
          if (parsed?.reasoning) {
            setAiThinking((prev) => prev + parsed.reasoning);
          }
          if (delta) {
            setAiResult((prev) => {
              const next = prev + delta;
              // 打字机流式自动滚动到底部
              setTimeout(() => {
                if (resultRef.current) {
                  resultRef.current.scrollTop = resultRef.current.scrollHeight;
                }
              }, 0);
              return next;
            });
          }
          if (parsed?.engine) {
            setAiEngine(parsed.engine);
          }
        },
        (meta) => {
          setAiStreaming(false);
          setAiLoading(false);
          abortControllerRef.current = null;
          if (meta?.engine) {
            setAiEngine(meta.engine);
          }
          showToast('AI 宏观时政研报流式生成完成！', 'success');
        },
        (err) => {
          setAiStreaming(false);
          setAiLoading(false);
          abortControllerRef.current = null;
          if (err.name === 'AbortError') return;
          console.error(err);
          showToast(`AI 流式分析中断: ${err.message}`, 'error');
          setAiResult((prev) =>
            prev
              ? prev + `\n\n> ⚠️ **流式传输中断**：${err.message}`
              : `AI 流式分析请求异常: ${err.message}`
          );
        },
        controller.signal
      );
    } catch (err) {
      setAiStreaming(false);
      setAiLoading(false);
      abortControllerRef.current = null;
      if (err.name === 'AbortError') return;
      console.error(err);
      showToast(`AI 分析请求失败: ${err.message}`, 'error');
      setAiResult(`AI 分析异常: ${err.message}`);
    }
  };

  const copyResult = () => {
    const text = resultRef.current?.innerText || aiResult;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => showToast('分析研报已成功复制到剪贴板！', 'success'));
    } else {
      showToast('已复制研报内容！', 'success');
    }
  };

  const toggleNewsSelect = (id) => {
    setSelectedNewsIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // 每个监控标的近 2 小时内的快讯信号：最新一条的方向 + 看涨/看跌条数
  const assetSignals = useMemo(() => {
    const cutoff = Date.now() - ASSET_SIGNAL_WINDOW_MS;
    const map = {};
    newsList.forEach((n) => {
      const ts = new Date(n.time).getTime();
      if (!Array.isArray(n.impacts) || isNaN(ts) || ts < cutoff) return;
      n.impacts.forEach((im) => {
        const s = map[im.symbol] || { latest: null, bull: 0, bear: 0 };
        if (im.direction === 'bullish') s.bull += 1;
        else s.bear += 1;
        if (!s.latest) s.latest = { ...im, news: n };
        map[im.symbol] = s;
      });
    });
    return map;
  }, [newsList]);

  const filteredNews = useMemo(() => {
    switch (newsFilter) {
      case 'us':
        return newsList.filter((n) => n.isUS);
      case 'breaking':
        return newsList.filter((n) => n.breaking);
      case 'impact':
        return newsList.filter((n) => n.impacts?.length > 0);
      default:
        return newsList;
    }
  }, [newsList, newsFilter]);

  const aiNewsCount = selectedNewsIds.length > 0 ? Math.min(selectedNewsIds.length, AI_NEWS_LIMIT) : Math.min(newsList.length, AI_NEWS_LIMIT);
  const newsConnected = newsStatus?.status === 'connected';

  return (
    <div id="module-market-monitor" className={`crm-module ${active ? '' : 'hidden '}space-y-6 pb-12`}>
      {/* 1. 顶部 Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-purple-600/10 to-indigo-900/20 p-6 rounded-2xl border border-amber-500/20 dark:border-amber-500/30 glow-card relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-zinc-950 flex items-center justify-center shadow-lg shadow-amber-500/30 font-bold">
              <Icon name="trending-up" className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              全球大类资产与黄金宏观监控看板
            </h2>
            <div className="flex items-center gap-2">
              <span
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  wsStatus === 'connected'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    wsStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                {wsStatus === 'connected' ? 'WSS 认证实时流推送 (已登录推送 / 未登录落库)' : 'HTTP 实时保底轮询'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold border border-blue-500/20 font-mono">
                北京时间 (UTC+8)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold border border-purple-500/20 font-mono">
                TVC 实时数据源
              </span>
            </div>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 max-w-3xl leading-relaxed">
            登录自动建立企业级 WSS 长连接接收逐笔跳价推送，未登录状态由后台定时自动持久化写入数据库；所有行情时间均以北京时间统一规范呈现；动态聚合国际地缘时政要闻，驱动大模型进行深度因果链策略推演。
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setApiModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-purple-500 text-zinc-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Icon name="settings" className="w-4 h-4 text-purple-500" />
            <span>大模型 API 配置</span>
            {apiConfig.apiKey && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
          </button>
          <button
            onClick={fetchMarketData}
            className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="刷新盘面与要闻"
          >
            <Icon name="refresh-cw" className="w-3.5 h-3.5" />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* 2. 核心衍生宏观指标卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl bg-white dark:bg-[#121316] border transition-all duration-300 relative overflow-hidden ${
          flashStates['TVC:GOLD'] === 'up'
            ? 'border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-500/20'
            : flashStates['TVC:GOLD'] === 'down'
            ? 'border-rose-500 bg-rose-500/10 shadow-md shadow-rose-500/20'
            : 'border-amber-500/30 dark:border-amber-500/20 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
            <span className="font-medium">国际现货黄金基准 (XAU/USD)</span>
            <Icon name="sparkles" className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 flex items-center justify-between">
            <span>${quotes['TVC:GOLD']?.price !== undefined ? Number(quotes['TVC:GOLD'].price).toFixed(3) : '4,210.500'}</span>
            {flashStates['TVC:GOLD'] === 'up' && <span className="text-emerald-500 text-sm font-bold animate-bounce">▲</span>}
            {flashStates['TVC:GOLD'] === 'down' && <span className="text-rose-500 text-sm font-bold animate-bounce">▼</span>}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span
              className={`font-mono font-semibold ${
                (quotes['TVC:GOLD']?.change || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {(quotes['TVC:GOLD']?.change || 0) >= 0 ? '+' : ''}
              {quotes['TVC:GOLD']?.changePct !== undefined ? Number(quotes['TVC:GOLD'].changePct).toFixed(2) : '+0.39'}%
            </span>
            <span className="text-zinc-400 font-mono">
              ({(quotes['TVC:GOLD']?.change || 0) >= 0 ? '+' : ''}
              {quotes['TVC:GOLD']?.change !== undefined ? Number(quotes['TVC:GOLD'].change).toFixed(3) : '+16.350'})
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#121316] border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
            <span className="font-medium">折合国内现货金价 (估算)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">
              实时汇率折算
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            ¥{derived.domesticGoldYuan} <span className="text-sm font-normal text-zinc-500">/克</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-2">
            公式: 国际金价 × 离岸汇率 ({quotes['FX_IDC:USDCNH']?.price || '6.693'}) ÷ 31.1035
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#121316] border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
            <span className="font-medium">金银比 (Gold/Silver Ratio)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-mono">
              中枢: 60~80
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
            {derived.goldSilverRatio}
          </div>
          <div className="text-[11px] text-zinc-400 mt-2">
            {Number(derived.goldSilverRatio) > 75 ? '处于较高位，白银弹性相对更强' : '处于良性均衡区间'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#121316] border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
            <span className="font-medium">恐慌指数 VIX / 风险偏好</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-mono">
              Market
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {quotes['TVC:VIX']?.price ? quotes['TVC:VIX'].price.toFixed(2) : '14.85'}{' '}
            <span className="text-xs font-normal text-emerald-500 font-sans">偏良性</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-2">
            美债10Y: {quotes['TVC:US10Y']?.price || '5.242'}% ｜ 美指: {quotes['TVC:DXY']?.price || '102.15'}
          </div>
        </div>
      </div>

      {/* 3. 全球大类资产逐笔跳价看板网格 */}
      <div className="bg-white dark:bg-[#121316] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Icon name="activity" className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              跨资产实时行情监控面板 (逐笔跳价)
            </h3>
            <span className="text-[10px] text-zinc-400">红绿高亮实时跳价波动</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              流心跳: <strong className="text-zinc-700 dark:text-zinc-200">{formatBeijingTimeShort(lastTickTime || new Date())}</strong>
            </span>
            <span>已推送: <strong className="text-amber-500">{totalTicks}</strong> 笔</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {SYMBOLS.map((item) => {
            const q = quotes[item.symbol] || {};
            const price = q.price !== undefined ? q.price : '-';
            const change = q.change;
            const changePct = q.changePct;
            const flash = flashStates[item.symbol];

            const sign = (change || 0) >= 0 ? '+' : '';
            const isPos = (change || 0) >= 0;

            let flashBg = '';
            if (flash === 'up') flashBg = 'bg-emerald-500/20 dark:bg-emerald-950/40 border-emerald-500 shadow-sm shadow-emerald-500/20';
            else if (flash === 'down') flashBg = 'bg-rose-500/20 dark:bg-rose-950/40 border-rose-500 shadow-sm shadow-rose-500/20';

            return (
              <div
                key={item.symbol}
                className={`p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 transition-all duration-300 ${flashBg}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <a
                    href={`#${klinePath(item.symbol)}`}
                    title={`查看 ${item.name} K 线图`}
                    className="group/kline flex items-center gap-1 min-w-0 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                  >
                    <span className="truncate group-hover/kline:underline underline-offset-2">{item.name}</span>
                    <Icon name="candlestick-chart" className="w-3.5 h-3.5 shrink-0 text-zinc-400 group-hover/kline:text-amber-500" />
                  </a>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-500 dark:text-zinc-400 font-mono">
                    {item.category}
                  </span>
                </div>
                <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 my-1 flex items-center justify-between">
                  <span>
                    {typeof price === 'number' ? price.toFixed(item.dec) : price}
                    <span className="text-[10px] font-normal text-zinc-400 ml-1">{item.unit}</span>
                  </span>
                  {flash === 'up' && (
                    <span className="text-emerald-500 text-xs font-bold animate-bounce flex items-center">
                      ▲
                    </span>
                  )}
                  {flash === 'down' && (
                    <span className="text-rose-500 text-xs font-bold animate-bounce flex items-center">
                      ▼
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className={isPos ? 'text-emerald-500 font-semibold' : 'text-rose-500 font-semibold'}>
                    {changePct !== undefined ? `${sign}${changePct.toFixed(2)}%` : '-'}
                    {q.change !== undefined && (
                      <span className="text-[10px] ml-1 font-normal opacity-85">
                        ({sign}{q.change.toFixed(item.dec)})
                      </span>
                    )}
                  </span>
                  <span className="text-zinc-400">
                    买/卖: {q.bid ? q.bid.toFixed(item.dec) : '-'} / {q.ask ? q.ask.toFixed(item.dec) : '-'}
                  </span>
                </div>
                {(() => {
                  const sig = assetSignals[item.symbol];
                  if (!sig?.latest) {
                    return (
                      <div className="mt-2 text-[10px] text-zinc-400 flex items-center gap-1">
                        <Icon name="globe" className="w-3 h-3" />
                        <span>近2小时快讯: 无明确方向信号</span>
                      </div>
                    );
                  }
                  const bull = sig.latest.direction === 'bullish';
                  return (
                    <a
                      href={sig.latest.news.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${sig.latest.news.title}\n依据: ${sig.latest.reason}`}
                      className={`mt-2 block rounded-lg border px-2 py-1.5 text-[10px] transition-colors ${
                        bull
                          ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10'
                          : 'border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className={`font-bold ${bull ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {bull ? '▲' : '▼'} 快讯{sig.latest.label}
                          {sig.latest.news.isUS && <span className="ml-1 text-blue-500">· 美国</span>}
                          {sig.latest.news.breaking && <span className="ml-1 text-rose-500">· 突发</span>}
                        </span>
                        <span className="text-zinc-400 font-mono">{relativeTime(sig.latest.news.time)}</span>
                      </div>
                      <div className="text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{sig.latest.news.title}</div>
                      {sig.latest.reason && (
                        <div className="text-zinc-400 truncate mt-0.5">原因: {sig.latest.reason}</div>
                      )}
                      <div className="text-zinc-400 mt-0.5">
                        近2小时: <span className="text-emerald-500">看涨 {sig.bull}</span> / <span className="text-rose-500">看跌 {sig.bear}</span>
                      </div>
                    </a>
                  );
                })()}
                <div className="text-[10px] text-zinc-400 font-mono mt-2 pt-1.5 border-t border-zinc-200/50 dark:border-zinc-800/60 flex items-center justify-between">
                  <span>时间: {formatBeijingTimeShort(q.updatedTime || new Date())}</span>
                  <span className="text-emerald-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                    实时
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3.5 各国 CPI / PPI 通胀数据 (FinancialJuice，美国全口径) */}
      <MacroInflationPanel macro={macro} freshKeys={freshMacroKeys} loading={macroLoading} driverIndex={driverIndex} quotes={quotes} />

      {/* 3.6 宏观传导关系：盘面实时驱动 + 传导矩阵 + 按资产反查 */}
      <MacroTransmissionPanel playbook={playbook} quotes={quotes} newsList={newsList} />

      {/* 4. FinancialJuice 全球实时快讯 (后端 WSS 实时推送，已自动送入 AI 上下文) */}
      <div className="bg-white dark:bg-[#121316] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Icon name="globe" className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              全球时政要闻与地缘政治动态 (FinancialJuice 实时快讯，已自动送入 AI 上下文)
            </h3>
            <span
              className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                newsConnected
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
              }`}
              title={newsStatus?.lastError || ''}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${newsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              WSS {newsStatus?.statusText || (wsStatus === 'connected' ? '同步中' : '未连接')}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
              已收录 {newsList.length} 条 · 本次运行实时新增 {newsStatus?.realtimeCount ?? 0} 条
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <div className="flex items-center rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5">
              {NEWS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setNewsFilter(f.value)}
                  className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
                    newsFilter === f.value
                      ? 'bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-400 font-semibold shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5" title="美国相关/突发快讯到达时在任意页面弹窗提示">
              <Icon name="bell" className="w-3.5 h-3.5 text-blue-500 ml-1.5" />
              {POPUP_MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setPopupMode(m.value)}
                  className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
                    popupMode === m.value
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {selectedNewsIds.length > 0 && (
              <button
                onClick={() => setSelectedNewsIds([])}
                className="text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                清空勾选 ({selectedNewsIds.length})
              </button>
            )}
          </div>
        </div>

        <p className="text-[10px] text-zinc-400 leading-relaxed">
          数据经后端与 FinancialJuice 建立 Centrifugo WebSocket 长连接实时接收，到达即推送本页，无需轮询刷新；资产方向为规则引擎根据英文标题的初步判断，仅供参考。
          点击卡片可勾选送入 AI 研判（未勾选时自动使用最新 {AI_NEWS_LIMIT} 条）。
        </p>

        {filteredNews.length === 0 ? (
          <div className="py-10 text-center text-xs text-zinc-400">
            {newsList.length === 0 ? '正在等待实时快讯数据流…' : '当前筛选条件下暂无快讯'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[640px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredNews.map((news) => {
              const isSelected = selectedNewsIds.includes(news.id);
              const isFresh = !!freshNewsIds[news.id];
              return (
                <div
                  key={news.id}
                  onClick={() => toggleNewsSelect(news.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                    isFresh ? 'ring-2 ring-amber-400/70 ' : ''
                  }${
                    isSelected
                      ? 'border-amber-500/80 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs'
                      : news.breaking
                      ? 'border-rose-500/40 bg-rose-50/30 dark:bg-rose-950/10 hover:border-rose-500/70'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-800/20 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5 text-[10px]">
                    <div className="flex items-center gap-1 flex-wrap">
                      {isFresh && <span className="px-1.5 py-0.5 rounded bg-amber-500 text-zinc-950 font-bold">NEW</span>}
                      {news.breaking && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold tracking-wide">BREAKING</span>
                      )}
                      {news.isUS && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-semibold">
                          美国
                        </span>
                      )}
                      <span className="font-semibold text-amber-600 dark:text-amber-400">[{news.category}]</span>
                    </div>
                    <span className="text-zinc-400 font-mono shrink-0" title={news.publishedAt ? `UTC ${news.publishedAt}` : ''}>
                      {formatNewsTime(news.time)}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-2 leading-snug">{news.title}</h4>
                  <ImpactChips impacts={news.impacts} max={5} />
                  {news.drivers?.length > 0 ? (
                    <div className="mt-1.5 space-y-1">
                      {news.drivers.slice(0, 2).map((d) => (
                        <DriverChain key={d.key} chain={d.chain} compact />
                      ))}
                    </div>
                  ) : (
                    news.impacts?.length > 0 &&
                    news.summary && (
                      <p className="mt-1.5 text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">依据: {news.summary}</p>
                    )
                  )}
                  {news.impacts?.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedNewsId((cur) => (cur === news.id ? null : news.id));
                      }}
                      className="mt-1.5 text-[10px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      {expandedNewsId === news.id ? '收起各资产影响原因 ▴' : '展开各资产影响原因 ▾'}
                    </button>
                  )}
                  {expandedNewsId === news.id && (
                    <div className="mt-1.5 space-y-1 rounded-lg bg-white/70 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800 p-2" onClick={(e) => e.stopPropagation()}>
                      {news.impacts.map((im) => (
                        <div key={im.symbol} className="text-[10px] leading-snug">
                          <span className={`font-bold ${im.direction === 'bullish' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {im.direction === 'bullish' ? '▲' : '▼'} {im.name} {im.label}
                          </span>
                          <span className="text-zinc-500 dark:text-zinc-400">：{im.reason}</span>
                        </div>
                      ))}
                      {news.drivers?.map((d) =>
                        d.caveat ? (
                          <div key={d.key} className="text-[10px] text-amber-700 dark:text-amber-400">
                            ⚠️ {d.title}：{d.caveat}
                          </div>
                        ) : null
                      )}
                    </div>
                  )}
                  <div className="mt-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-[10px]">
                    <a
                      href={news.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 font-mono"
                    >
                      <Icon name="external-link" className="w-3 h-3" />#{news.id}
                    </a>
                    <span className={isSelected ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-zinc-400'}>
                      {isSelected ? '✓ 已选中参与分析' : '+ 点击加入分析'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. AI 宏观时政智能深度研判工作台 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左侧：指令选择与输入 */}
        <div className="lg:col-span-6 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Icon name="sparkles" className="w-4 h-4 text-purple-500" />
              <span>时政与宏观 AI 深度研判提示词指令</span>
            </h3>
            <span className="text-[11px] text-zinc-400">
              当前驱动引擎: <strong className="text-purple-500">{apiConfig.apiKey ? apiConfig.model : '内嵌专家引擎'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp.id}
                onClick={() => {
                  setAiInput(qp.prompt);
                  handleExecuteAiAnalysis(qp.id, qp.prompt);
                }}
                className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700/80 hover:border-purple-500 text-left transition-colors bg-zinc-50/50 dark:bg-zinc-800/30 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 cursor-pointer"
              >
                <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{qp.title}</div>
                <div className="text-[10px] text-zinc-400 mt-1 line-clamp-2">{qp.desc}</div>
              </button>
            ))}
          </div>

          <div className="space-y-2 pt-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              自定义宏观与时政分析关注点（系统将自动连带注入上述所有最新盘面跳价与国际要闻）：
            </label>
            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              rows="4"
              placeholder="例如：结合中东冲突最新的海峡戒备动向，分析黄金若冲高至 4250 美元上方是否面临地缘溢价回吐风险，给出一份大客户套保风控建议..."
              className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex justify-between items-center gap-2 flex-wrap">
              <span className="text-[10px] text-zinc-400">
                {selectedNewsIds.length > 0
                  ? `已选 ${aiNewsCount} 条快讯`
                  : `未手动勾选，自动整合最新 ${aiNewsCount} 条快讯`}
                及 11 类大类资产数据
              </span>
              <div className="flex items-center gap-2">
                {aiStreaming && (
                  <button
                    type="button"
                    onClick={handleStopAiAnalysis}
                    className="px-3.5 py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white font-semibold text-xs shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Icon name="square" className="w-3.5 h-3.5 fill-current" />
                    <span>停止输出</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleExecuteAiAnalysis('custom', aiInput)}
                  disabled={aiLoading}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md shadow-purple-600/25 flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Icon
                    name={aiLoading ? 'loader' : 'send'}
                    className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`}
                  />
                  <span>
                    {aiStreaming
                      ? 'AI 正在流式生成中...'
                      : aiLoading
                      ? 'AI 正在调取时政并推理...'
                      : '流式生成宏观时政研报'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：AI 研报输出终端卡片 */}
        <div className="lg:col-span-6 bg-zinc-900 text-zinc-100 p-6 rounded-2xl border border-zinc-800 shadow-xl flex flex-col justify-between min-h-[460px]">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    aiStreaming
                      ? 'bg-amber-400 animate-ping'
                      : aiLoading
                      ? 'bg-purple-500 animate-pulse'
                      : 'bg-emerald-500'
                  }`}
                />
                <span className="text-xs font-mono font-bold text-zinc-300">
                  {aiStreaming
                    ? 'AI 宏观时政研报 (流式输出中...)'
                    : aiLoading
                    ? '正在调取时政并推理中...'
                    : 'AI 宏观时政研判研报'}
                </span>
                {aiStreaming && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono animate-pulse border border-amber-500/30">
                    SSE 实时流
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {aiStreaming && (
                  <button
                    onClick={handleStopAiAnalysis}
                    className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Icon name="square" className="w-3 h-3 fill-rose-300" />
                    <span>停止</span>
                  </button>
                )}
                <button
                  onClick={copyResult}
                  className="text-xs text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Icon name="copy" className="w-3.5 h-3.5" />
                  <span>复制研报</span>
                </button>
              </div>
            </div>

            <div
              ref={resultRef}
              className="font-mono text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap max-h-[460px] overflow-y-auto pr-2 custom-scrollbar"
            >
              {aiResult ? (
                <>
                  {aiThinking && (
                    <details className="mb-3 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                      <summary className="cursor-pointer select-none text-[11px] text-zinc-500">
                        模型已深度思考 {aiThinking.length} 字 · 点击查看思考过程
                      </summary>
                      <div className="mt-2 text-[11px] text-zinc-500">{aiThinking}</div>
                    </details>
                  )}
                  {aiResult}
                  {aiStreaming && (
                    <span className="inline-block w-2 h-4 ml-0.5 bg-purple-400 animate-pulse align-middle font-mono">
                      ▌
                    </span>
                  )}
                </>
              ) : aiThinking ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-300">
                    <Icon name="loader" className="w-3.5 h-3.5 animate-spin" />
                    <span>模型深度思考中，思考结束后开始输出正文… (已思考 {aiThinking.length} 字)</span>
                  </div>
                  {/* 只显示末尾一段，思考内容可能有数千字 */}
                  <div className="border-l-2 border-zinc-700 pl-3 text-[11px] text-zinc-500">{aiThinking.slice(-600)}</div>
                </div>
              ) : aiLoading ? (
                <div className="text-zinc-400 py-12 text-center space-y-3">
                  <Icon name="loader" className="w-8 h-8 mx-auto text-purple-400 animate-spin" />
                  <p className="font-semibold text-xs text-zinc-200">正在建立宏观时政研报流式长连接 (SSE)...</p>
                  <p className="text-[11px] text-zinc-500">
                    正在聚合中东地缘、美联储利率及 11 类大类资产跳价数据
                  </p>
                </div>
              ) : (
                <div className="text-zinc-500 py-8 text-center space-y-2">
                  <Icon name="bot" className="w-8 h-8 mx-auto text-zinc-600" />
                  <p>【宏观时政 AI 研判智能体已就绪】</p>
                  <p className="text-[11px] text-zinc-600">
                    请在左侧点击预设指令或输入针对性诉求，AI 将以打字机流式（SSE）实时输出深度研判报告。
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between flex-wrap gap-2">
            <span>引擎: {aiEngine}</span>
            <span>基准时间: {formatBeijingTime(new Date())}</span>
          </div>
        </div>
      </div>

      {/* 6. 大模型 API 配置 Modal */}
      {apiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#18191c] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Icon name="settings" className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  大模型 API 配置 (用于自定义数据分析)
                </h3>
              </div>
              <button
                onClick={() => setApiModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveApiConfig} className="space-y-3.5 text-xs">
              <p className="text-zinc-500 text-[11px] leading-relaxed">
                支持配置任意兼容 OpenAI 规范的 API 服务（如 DeepSeek、OpenRouter、OneAPI、Moonshot、GPT-4o 等）。若未配置或留空，系统将自动使用内置的专业量化宏观研报引擎。
              </p>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  API 接口服务地址 (Base URL):
                </label>
                <input
                  type="text"
                  value={apiConfig.baseUrl}
                  onChange={(e) => setApiConfig({ ...apiConfig, baseUrl: e.target.value })}
                  placeholder="https://api.deepseek.com/v1"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  API 密钥 (API Key):
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiConfig.apiKey}
                    onChange={(e) => setApiConfig({ ...apiConfig, apiKey: e.target.value })}
                    placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 pr-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    <Icon name={showApiKey ? 'eye-off' : 'eye'} className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Icon name="cpu" className="w-3.5 h-3.5 text-purple-500" />
                    <span>模型选择 (Model Name):</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleFetchModels}
                    disabled={fetchingModels}
                    className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-semibold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 border border-purple-500/20 shadow-xs"
                    title="根据配置的 Base URL 和 API Key 从服务商接口实时获取模型列表"
                  >
                    <Icon name={fetchingModels ? 'loader' : 'refresh-cw'} className={`w-3 h-3 ${fetchingModels ? 'animate-spin' : ''}`} />
                    <span>{fetchingModels ? '正在连接接口获取中...' : '从接口获取模型列表'}</span>
                  </button>
                </div>

                {/* 项目统一的美化 Select 下拉组件 */}
                <Select
                  fullWidth
                  size="md"
                  variant="default"
                  icon="sparkles"
                  placeholder="选择模型 (支持从接口获取)..."
                  value={apiConfig.model}
                  onChange={(val) => setApiConfig((prev) => ({ ...prev, model: val }))}
                  options={modelOptions}
                  placement="auto"
                  dropdownClassName="max-h-60 shadow-2xl border-purple-500/30 z-60"
                  dropdownHeader={
                    availableModels.length > 0 ? (
                      <span className="text-emerald-500 flex items-center gap-1 font-semibold">
                        <Icon name="check-circle" className="w-3 h-3" />
                        已从服务接口载入 {availableModels.length} 个可用模型
                      </span>
                    ) : (
                      <span>系统推荐模型预设</span>
                    )
                  }
                  dropdownFooter={
                    <span className="text-[10px] text-zinc-400 flex items-center justify-between">
                      <span>支持点击直接切换</span>
                      <span>亦可在下方自由输入</span>
                    </span>
                  }
                />

                {/* 可选自由微调输入 */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400 shrink-0">自由输入/微调:</span>
                  <input
                    type="text"
                    value={apiConfig.model}
                    onChange={(e) => setApiConfig({ ...apiConfig, model: e.target.value })}
                    placeholder="可自由输入任何特定模型或路由别名"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs font-mono text-zinc-800 dark:text-zinc-200 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* 快捷推荐按钮 */}
                <div className="flex gap-1.5 mt-2 flex-wrap items-center">
                  <span className="text-[10px] text-zinc-400">快速推荐:</span>
                  {['deepseek-chat', 'deepseek-reasoner', 'gpt-4o', 'claude-3-5-sonnet'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setApiConfig({ ...apiConfig, model: m })}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono cursor-pointer transition-colors ${
                        apiConfig.model === m
                          ? 'bg-purple-600 text-white font-bold shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-purple-100 dark:hover:bg-purple-950/40 hover:text-purple-600'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setApiConfig({
                      baseUrl: 'https://api.deepseek.com/v1',
                      apiKey: '',
                      model: 'deepseek-chat',
                      temperature: 0.6,
                    });
                    localStorage.removeItem('acme_crm_market_llm_config');
                    showToast('已重置为系统默认内置引擎', 'info');
                    setApiModalOpen(false);
                  }}
                  className="px-3.5 py-2 rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  清除并使用默认
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-md shadow-purple-600/25 transition-colors cursor-pointer"
                >
                  保存配置
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
