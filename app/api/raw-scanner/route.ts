import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

async function fetchFromMassive(dateStr: string) {
  const API_KEY = process.env.MASSIVE_API_KEY;

  if (!API_KEY) {
    throw new Error("Missing MASSIVE_API_KEY");
  }

  console.log("📡 Fetching from Massive API for:", dateStr);

  const res = await fetch(
    `https://api.massive.com/v2/aggs/grouped/locale/us/market/stocks/${dateStr}?adjusted=true&apiKey=${API_KEY}`
  );

  const json = await res.json();

  if (json.status !== "OK") {
    console.error("❌ Massive API Error:", json);
    throw new Error(json.message || "Massive API failed");
  }

  return json.results || [];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const forceRefresh = searchParams.get("force") === "true";

    // 📅 Always use previous trading day
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const dateStr = date.toISOString().split("T")[0];

    const key = `raw:${dateStr}`;

    // 🔒 CHECK CACHE FIRST
    if (!forceRefresh) {
      const cached = await redis.get(key);

      if (cached) {
        console.log("✅ RAW CACHE HIT:", key);

        return NextResponse.json({
          data: cached,
          cached: true,
          date: dateStr,
        });
      }
    }

    // 🚀 FETCH FROM API (ONLY IF NEEDED)
    const raw = await fetchFromMassive(dateStr);

    // 💾 STORE IN REDIS (24 HOURS)
    await redis.set(key, raw, {
      ex: 60 * 60 * 24,
    });

    console.log("💾 RAW DATA CACHED:", key);

    return NextResponse.json({
      data: raw,
      cached: false,
      date: dateStr,
    });
  } catch (err) {
    console.error("🔥 RAW SCANNER ERROR:", err);

    return NextResponse.json(
      {
        error: "Failed to fetch raw data",
        data: [],
      },
      { status: 500 }
    );
  }
}