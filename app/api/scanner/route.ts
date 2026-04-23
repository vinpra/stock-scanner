import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

function scoreStock(s: any) {
  const open = s.o;
  const close = s.c;
  const volume = s.v;

  const changePercent =
    open > 0 ? ((close - open) / open) * 100 : 0;

  const range = s.h && s.l ? ((s.h - s.l) / s.l) * 100 : 0;

  const score =
    Math.abs(changePercent) * 2 +
    Math.log10(volume || 1) +
    range;

  let signal = "👀 WATCH";

  if (changePercent > 5 && volume > 1_000_000) {
    signal = "🚀 BREAKOUT";
  } else if (changePercent > 2) {
    signal = "🔥 MOMENTUM";
  } else if (changePercent < -3) {
    signal = "🔻 FADE";
  }

  return {
    symbol: s.T,
    price: close,
    volume,
    changePercent: Number(changePercent.toFixed(2)),
    score: Number(score.toFixed(2)),
    signal,
  };
}

async function performScan() {
  const today = new Date();
  today.setDate(today.getDate() - 1);
  const dateStr = today.toISOString().split("T")[0];
  const cacheKey = `scanner:${dateStr}`;

  console.log("🔄 Running scan for", dateStr);

  const API_KEY = process.env.MASSIVE_API_KEY;

  const res = await fetch(
    `https://api.massive.com/v2/aggs/grouped/locale/us/market/stocks/${dateStr}?adjusted=true&apiKey=${API_KEY}`
  );

  const json = await res.json();
  const results = json.results || [];

  const scored = results
    .map(scoreStock)
    .filter((s: any) => s.symbol && s.volume > 0)
    .sort((a: any, b: any) => b.score - a.score);

  // 💾 STORE IN REDIS (TTL 24 HOURS)
  await redis.set(cacheKey, scored, { ex: 60 * 60 * 24 });

  return scored;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const topN = parseInt(searchParams.get("topN") || "10");

    const today = new Date();
    today.setDate(today.getDate() - 1);

    const dateStr = today.toISOString().split("T")[0];

    const cacheKey = `scanner:${dateStr}`;

    // ✅ CHECK REDIS CACHE
    let cached: any = await redis.get(cacheKey);

    if (!cached) {
      console.log("❌ CACHE MISS → AUTO-GENERATING SCAN");
      try {
        cached = await performScan();
      } catch (scanErr) {
        console.error("Auto-scan failed:", scanErr);
        return NextResponse.json(
          {
            error: "Failed to generate scan. Try POST /api/scanner with manual trigger.",
            data: [],
          },
          { status: 503 }
        );
      }
    } else {
      console.log("✅ CACHE HIT (GET)");
    }

    return NextResponse.json({
      data: (cached as any[]).slice(0, topN),
      cached: !!cached,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Scanner GET error:", err);
    return NextResponse.json(
      { error: "Server error", data: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { topN = 10 } = body;

    console.log("📊 POST scan triggered");

    const scored = await performScan();

    return NextResponse.json({
      data: scored.slice(0, topN),
      total: scored.length,
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Scanner POST error:", err);
    return NextResponse.json(
      { error: "Failed to scan stocks", data: [] },
      { status: 500 }
    );
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Allow": "GET, POST, OPTIONS",
    },
  });
}