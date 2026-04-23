import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { symbol } = await req.json();

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol is required", candles: [] },
        { status: 400 }
      );
    }

    const apiKey = process.env.MASSIVE_API_KEY;

    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);

    const format = (d: Date) => d.toISOString().split("T")[0];

    const url = `https://api.massive.com/v2/aggs/ticker/${symbol}/range/1/day/${format(
      from
    )}/${format(to)}?adjusted=true&sort=asc&limit=120&apiKey=${apiKey}`;

    const res = await fetch(url);
    const data = await res.json();

    const results = data?.results || [];

    const candles = results.map((c: any) => ({
      // ⚠️ convert timestamp correctly
      time: Math.floor(c.t / 1000), // Trading libraries prefer UNIX seconds

      open: c.o,
      high: c.h,
      low: c.l,
      close: c.c,
    }));

    return NextResponse.json({ candles });
  } catch (err) {
    console.error("Candles fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch candles", candles: [] },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return NextResponse.json(
    {
      error: "Use POST with { symbol: 'AAPL' } to fetch candles",
      candles: [],
    },
    { status: 405 }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Allow": "POST, OPTIONS",
    },
  });
}