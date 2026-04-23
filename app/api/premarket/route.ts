import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

async function getQuote(symbol: string) {
  const res = await fetch(
    `${FINNHUB_BASE}/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`
  );

  return res.json();
}

export async function GET() {
  try {
    // 🧠 get yesterday cache key
    const today = new Date();
    today.setDate(today.getDate() - 1);
    const dateStr = today.toISOString().split("T")[0];

    const cacheKey = `scanner:${dateStr}`;

    const cached: any = await redis.get(cacheKey);

    if (!cached) {
      return NextResponse.json(
        {
          error: "No cached scanner data found. Run POST /api/scanner first.",
          data: [],
        },
        { status: 202 }
      );
    }

    // 🔥 limit to avoid API spam
    const watchlist = cached.slice(0, 15);

    const enriched = await Promise.all(
      watchlist.map(async (stock: any) => {
        const q = await getQuote(stock.symbol);

        if (!q || !q.c) return null;

        const currentPrice = q.c;   // current
        const prevClose = q.pc;     // previous close
        const open = q.o;           // today open
        const high = q.h;
        const low = q.l;

        const gapPercent =
          prevClose > 0
            ? ((currentPrice - prevClose) / prevClose) * 100
            : 0;

        const intradayRange =
          low > 0 ? ((high - low) / low) * 100 : 0;

        let intradaySignal = "👀 WAIT";

        if (gapPercent > 2 && currentPrice > open) {
          intradaySignal = "🚀 STRONG GAP UP";
        } else if (gapPercent > 2) {
          intradaySignal = "⚠️ GAP BUT WEAK";
        } else if (gapPercent < -2) {
          intradaySignal = "🔻 GAP DOWN";
        } else if (intradayRange > 2) {
          intradaySignal = "🔥 VOLATILE";
        }

        return {
          ...stock,
          currentPrice,
          gapPercent: Number(gapPercent.toFixed(2)),
          intradayRange: Number(intradayRange.toFixed(2)),
          intradaySignal,
        };
      })
    );

    return NextResponse.json({
      data: enriched.filter(Boolean),
    });

  } catch (err) {
    console.error("Premarket GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch premarket data", data: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return NextResponse.json(
    {
      error: "Use GET /api/premarket to fetch premarket data",
      data: [],
    },
    { status: 405 }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Allow": "GET, OPTIONS",
    },
  });
}