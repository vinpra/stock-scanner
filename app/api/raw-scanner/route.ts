import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getRawMarketCacheContext } from "@/lib/marketCache";

async function fetchFromMassive(dateStr: string) {
  const apiKey = process.env.MASSIVE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing MASSIVE_API_KEY");
  }

  console.log("Fetching from Massive API for:", dateStr);

  const res = await fetch(
    `https://api.massive.com/v2/aggs/grouped/locale/us/market/stocks/${dateStr}?adjusted=true&apiKey=${apiKey}`
  );

  const json = await res.json();

  if (json.status !== "OK") {
    console.error("Massive API error:", json);
    throw new Error(json.message || "Massive API failed");
  }

  return json.results || [];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("force") === "true";
    const { dateStr, slot, refreshWindows } = getRawMarketCacheContext();
    const key = `raw:${dateStr}:${slot}`;

    if (!forceRefresh) {
      const cached = await redis.get(key);

      if (cached) {
        console.log("Raw cache hit:", key);

        return NextResponse.json({
          data: cached,
          cached: true,
          date: dateStr,
          slot,
          refreshWindows: refreshWindows.map((window) => window.label),
        });
      }
    }

    const raw = await fetchFromMassive(dateStr);

    await redis.set(key, raw, {
      ex: 60 * 60 * 24,
    });

    console.log("Raw data cached:", key);

    return NextResponse.json({
      data: raw,
      cached: false,
      date: dateStr,
      slot,
      refreshWindows: refreshWindows.map((window) => window.label),
    });
  } catch (err) {
    console.error("Raw scanner error:", err);

    return NextResponse.json(
      {
        error: "Failed to fetch raw data",
        data: [],
      },
      { status: 500 }
    );
  }
}
