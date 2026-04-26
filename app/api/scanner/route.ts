import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

type RawStock = {
  T: string;
  o: number;
  c: number;
  h: number;
  l: number;
  v: number;
  prevClose: number;
};

type IntradayBar = {
  o: number;
  c: number;
  h: number;
  l: number;
  v: number;
};

const TOP_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'BABA', 'ORCL',
  'CRM', 'AMD', 'INTC', 'UBER', 'SPOT', 'PYPL', 'SQ', 'SHOP', 'ZM', 'DOCU',
  'COIN', 'PLTR', 'SNOW', 'CRWD', 'ZS', 'NET', 'OKTA', 'DDOG', 'MDB', 'TWLO',
  'FSLY', 'PINS', 'FUBO', 'ETSY', 'SE', 'BIDU', 'JD', 'NTES', 'IQ', 'TME',
  'BILI', 'VIPS', 'WB', 'YY'
];

function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function getTradingDate(baseDate = new Date()) {
  const tradingDate = new Date(baseDate);

  while (tradingDate.getDay() === 0 || tradingDate.getDay() === 6) {
    tradingDate.setDate(tradingDate.getDate() - 1);
  }

  return tradingDate;
}

function getPreviousTradingDate(baseDate: Date) {
  const previousTradingDate = new Date(baseDate);
  previousTradingDate.setDate(previousTradingDate.getDate() - 1);

  while (
    previousTradingDate.getDay() === 0 ||
    previousTradingDate.getDay() === 6
  ) {
    previousTradingDate.setDate(previousTradingDate.getDate() - 1);
  }

  return previousTradingDate;
}

function compute(s: RawStock) {
  const open = Number(s.o);
  const close = Number(s.c);
  const high = Number(s.h);
  const low = Number(s.l);
  const volume = Number(s.v);

  if (!s.T || !open || !close) return null;

  const gapPercent = ((open - s.prevClose) / s.prevClose) * 100;
  const momentum = ((close - open) / open) * 100;
  const vwap = (high + low + close + close) / 4; // simple approximation for daily VWAP
  const vwapDist = ((close - vwap) / vwap) * 100;

  const score =
    Math.abs(gapPercent) * 2 +
    Math.abs(momentum) * 2 +
    Math.log10(volume || 1);

  let signal = "👀 WATCH";

  if (gapPercent > 2 && momentum > 1 && volume > 500000) {
    signal = "🚀 BREAKOUT";
  } else if (momentum > 2) {
    signal = "🔥 MOMENTUM";
  } else if (momentum < -2) {
    signal = "🔻 FADE";
  }

  // 🛑 ALWAYS SET LEVELS
  let stopLoss = close * 0.97;
  let takeProfit = close * 1.05;

  if (signal.includes("FADE")) {
    stopLoss = close * 1.03;
    takeProfit = close * 0.95;
  }

  return {
    symbol: s.T,
    price: close,
    open,
    gapPercent: Number(gapPercent.toFixed(2)),
    momentum: Number(momentum.toFixed(2)),
    volume,
    vwap: Number(vwap.toFixed(2)),
    vwapDist: Number(vwapDist.toFixed(2)),
    score: Number(score.toFixed(2)),
    signal,
    entry: Number(close.toFixed(2)),
    stopLoss: Number(stopLoss.toFixed(2)),
    takeProfit: Number(takeProfit.toFixed(2)),
  };
}

async function getRaw() {
  const tradingDate = getTradingDate();
  const today = formatDate(tradingDate);
  const cacheKey = `premarket:${today}`;
  const cacheTTL = Number(process.env.PREMARKET_CACHE_TTL || 60); // seconds, default 1 minute

  // Check cache first
  const cached = await redis.get<RawStock[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch fresh data
  const previousTradingDate = getPreviousTradingDate(tradingDate);
  const yesterday = formatDate(previousTradingDate);
  const results: RawStock[] = [];

  for (const ticker of TOP_TICKERS) {
    try {
      // Fetch previous day daily for prevClose
      const prevRes = await fetch(
        `https://api.massive.com/v2/aggs/ticker/${ticker}/range/1/day/${yesterday}/${yesterday}?adjusted=true&apiKey=${process.env.MASSIVE_API_KEY}`
      );
      const prevData = await prevRes.json();
      const prevClose = prevData.results?.[0]?.c || 0;

      // Fetch today's intraday minute bars
      const intraRes = await fetch(
        `https://api.massive.com/v2/aggs/ticker/${ticker}/range/1/minute/${today}/${today}?adjusted=true&apiKey=${process.env.MASSIVE_API_KEY}`
      );
      const intraData = await intraRes.json();

      if (intraData.results && intraData.results.length > 0) {
        const bars = intraData.results as IntradayBar[];
        const open = bars[0].o;
        const close = bars[bars.length - 1].c;
        const high = Math.max(...bars.map((b) => b.h));
        const low = Math.min(...bars.map((b) => b.l));
        const volume = bars.reduce((sum, b) => sum + b.v, 0);

        results.push({
          T: ticker,
          o: open,
          c: close,
          h: high,
          l: low,
          v: volume,
          prevClose
        });
      }
    } catch (error) {
      console.error(`Error fetching data for ${ticker}:`, error);
    }
  }

  // Avoid overwriting the last valid trading-day cache with an empty weekend response.
  if (results.length > 0) {
    await redis.set(cacheKey, results, { ex: cacheTTL });
  }

  return results;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const symbol = searchParams.get("symbol")?.toUpperCase();
  const topN = Number(searchParams.get("topN") || 10);

  const raw = await getRaw();

  if (!raw.length) {
    return NextResponse.json({ data: [] });
  }

  // 🔍 SINGLE TICKER MODE
  if (symbol) {
    const tradingDate = getTradingDate();
    const today = formatDate(tradingDate);
    const yesterday = formatDate(getPreviousTradingDate(tradingDate));

    try {
      // Fetch previous day daily for prevClose
      const prevRes = await fetch(
        `https://api.massive.com/v2/aggs/ticker/${symbol}/range/1/day/${yesterday}/${yesterday}?adjusted=true&apiKey=${process.env.MASSIVE_API_KEY}`
      );
      const prevData = await prevRes.json();
      const prevClose = prevData.results?.[0]?.c || 0;

      // Fetch today's intraday
      const intraRes = await fetch(
        `https://api.massive.com/v2/aggs/ticker/${symbol}/range/1/minute/${today}/${today}?adjusted=true&apiKey=${process.env.MASSIVE_API_KEY}`
      );
      const intraData = await intraRes.json();

      if (intraData.results && intraData.results.length > 0) {
        const bars = intraData.results as IntradayBar[];
        const open = bars[0].o;
        const close = bars[bars.length - 1].c;
        const high = Math.max(...bars.map((b) => b.h));
        const low = Math.min(...bars.map((b) => b.l));
        const volume = bars.reduce((sum, b) => sum + b.v, 0);

        const rawStock: RawStock = {
          T: symbol,
          o: open,
          c: close,
          h: high,
          l: low,
          v: volume,
          prevClose
        };

        const computed = compute(rawStock);

        return NextResponse.json({
          data: computed ? [computed] : [],
          mode: "single",
        });
      }
    } catch (error) {
      console.error(`Error fetching single ticker ${symbol}:`, error);
    }

    return NextResponse.json({ data: [] });
  }

  // 📊 TOP SCAN MODE
  const result = raw
    .map((s) => compute(s))
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score)
    .filter((item) => item!.price >= 5);

  return NextResponse.json({
    data: result.slice(0, topN),
    mode: "scan",
  });
}
