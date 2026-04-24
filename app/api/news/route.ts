import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json({ data: [] });
    }

    const API_KEY = process.env.FINNHUB_API_KEY;

    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - 7);

    const toStr = today.toISOString().split("T")[0];
    const fromStr = from.toISOString().split("T")[0];

    const res = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromStr}&to=${toStr}&token=${API_KEY}`
    );

    const data = await res.json();

    return NextResponse.json({
      data: Array.isArray(data) ? data.slice(0, 10) : [],
    });
  } catch (err) {
    console.error("News API error:", err);
    return NextResponse.json({ data: [] });
  }
}