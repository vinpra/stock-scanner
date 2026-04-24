import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

type RawStock = {
  T: string;
  o: number;
  c: number;
  h: number;
  l: number;
  v: number;
};

function compute(s: RawStock, prevClose: number) {
  const open = Number(s.o);
  const close = Number(s.c);
  const high = Number(s.h);
  const low = Number(s.l);
  const volume = Number(s.v);

  if (!s.T || !open || !close) return null;

  const gapPercent = ((open - prevClose) / prevClose) * 100;
  const momentum = ((close - open) / open) * 100;

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
    score: Number(score.toFixed(2)),
    signal,
    entry: Number(close.toFixed(2)),
    stopLoss: Number(stopLoss.toFixed(2)),
    takeProfit: Number(takeProfit.toFixed(2)),
  };
}

async function getRaw() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const key = `raw:${date.toISOString().split("T")[0]}`;

  let raw = await redis.get(key);

  if (!raw) {
    const res = await fetch(
      `https://api.massive.com/v2/aggs/grouped/locale/us/market/stocks/${
        key.split(":")[1]
      }?adjusted=true&apiKey=${process.env.MASSIVE_API_KEY}`
    );

    const json = await res.json();
    raw = json.results || [];

    await redis.set(key, raw, { ex: 86400 });
  }

  return raw as RawStock[];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const symbol = searchParams.get("symbol")?.toUpperCase();
  const topN = Number(searchParams.get("topN") || 10);

  const raw = await getRaw();

  if (!raw.length) {
    return NextResponse.json({ data: [] });
  }

  const prevCloseMap: Record<string, number> = {};
  raw.forEach((s) => (prevCloseMap[s.T] = s.c));

  // 🔍 SINGLE TICKER MODE
  if (symbol) {
    const found = raw.find((s) => s.T === symbol);

    if (!found) {
      return NextResponse.json({ data: [] });
    }

    const computed = compute(found, prevCloseMap[symbol]);

    return NextResponse.json({
      data: computed ? [computed] : [],
      mode: "single",
    });
  }

  // 📊 TOP SCAN MODE
  const result = raw
    .map((s) => compute(s, prevCloseMap[s.T]))
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score);

  return NextResponse.json({
    data: result.slice(0, topN),
    mode: "scan",
  });
}