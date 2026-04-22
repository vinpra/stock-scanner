"use client";

import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

export default function StockChart({ symbol }: { symbol: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("CHART SYMBOL CHANGED:", symbol);
    if (!ref.current) return;

    // Create chart using the container's rendered dimensions
    const chart = createChart(ref.current, {
      height: ref.current.clientHeight,
      width: ref.current.clientWidth,
    });

    const series = chart.addCandlestickSeries();

const loadData = async () => {
  try {
    const res = await fetch("/api/candles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol }),
    });

    // 🔥 SAFE CHECK (IMPORTANT)
    const text = await res.text();

    if (!text) {
      console.warn("Empty response from API");
      return;
    }

    const data = JSON.parse(text);

    if (!data.candles) {
      console.warn("No candles returned", data);
      return;
    }

    series.setData(data.candles);
  } catch (err) {
    console.error("Chart load error:", err);
  }
};

    loadData();

    // CLEANUP (VERY IMPORTANT)
    return () => {
      chart.remove();
    };
  }, [symbol]); // 🔥 KEY FIX

  return <div ref={ref} style={{ width: "100%", height: "100%" }} />;
}