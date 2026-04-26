import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getRawMarketCacheContext } from "@/lib/marketCache";

type Raw = {
  T: string;
  o: number;
  c: number;
  h: number;
  l: number;
  v: number;
};

function vwap(s: Raw) {
  return (s.h + s.l + s.c) / 3;
}

function compute(s: Raw, prevClose: number) {
  if (!s?.T) return null;

  const open = Number(s.o);
  const close = Number(s.c);
  const high = Number(s.h);
  const low = Number(s.l);
  const volume = Number(s.v);

  const gap = ((open - prevClose) / prevClose) * 100;
  const momentum = ((close - open) / open) * 100;

  const vw = vwap(s);
  const vwapDist = ((close - vw) / vw) * 100;

  const range = ((high - low) / low) * 100;
  const volumeScore = Math.log10(volume || 1) * 5;

  const score =
    Math.min(30, Math.abs(gap) * 3) +
    Math.min(25, Math.abs(momentum) * 3) +
    Math.min(20, volumeScore) +
    Math.min(15, Math.abs(vwapDist) * 3) +
    Math.min(10, range);

  let signal = "👀 WATCH";

  if (score > 70 && gap > 2 && vwapDist > 1) {
    signal = "🚀 BREAKOUT";
  } else if (score > 55 && momentum > 2) {
    signal = "🔥 MOMENTUM";
  } else if (vwapDist < -1 && momentum < -2) {
    signal = "🔻 FADE";
  }

  const entry = close;

  return {
    symbol: s.T,
    price: close,
    open,
    gapPercent: Number(gap.toFixed(2)),
    momentum: Number(momentum.toFixed(2)),
    volume,
    vwap: Number(vw.toFixed(2)),
    vwapDist: Number(vwapDist.toFixed(2)),
    range: Number(range.toFixed(2)),
    score: Number(score.toFixed(2)),
    signal,
    entry,
    stopLoss: signal.includes("BREAKOUT") ? close * 0.97 : close * 1.03,
    takeProfit: signal.includes("BREAKOUT") ? close * 1.06 : close * 0.95,
  };
}

async function getRaw() {
  const { dateStr, slot } = getRawMarketCacheContext();
  const key = `raw:${dateStr}:${slot}`;
  const cached = await redis.get<Raw[]>(key);

  if (cached) {
    return cached;
  }

  const res = await fetch(
    `https://api.massive.com/v2/aggs/grouped/locale/us/market/stocks/${dateStr}?adjusted=true&apiKey=${process.env.MASSIVE_API_KEY}`
  );

  const json = await res.json();
  const raw = (json.results || []) as Raw[];

  await redis.set(key, raw, { ex: 60 * 60 * 24 });

  return raw;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol")?.toUpperCase();
    const topN = Number(searchParams.get("topN") || 10);
    const raw = await getRaw();

    if (!raw.length) {
      return NextResponse.json({ data: [] });
    }

    const prevMap: Record<string, number> = {};
    raw.forEach((s) => {
      prevMap[s.T] = s.c;
    });

    if (symbol) {
      const found = raw.find((s) => s.T === symbol);
      const computed = found ? compute(found, prevMap[symbol]) : null;

      return NextResponse.json({
        data: computed ? [computed] : [],
        mode: "single",
      });
    }

    const result = raw
      .map((s) => compute(s, prevMap[s.T]))
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score);

    return NextResponse.json({
      data: result.slice(0, topN),
      mode: "scan",
    });
  } catch {
    return NextResponse.json(
      { error: "scanner failed", data: [] },
      { status: 500 }
    );
  }
}
