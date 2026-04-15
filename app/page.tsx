"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [stocks, setStocks] = useState<any[]>([]);
  const [sortKey, setSortKey] = useState("score");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    fetch("/api/scan")
      .then((res) => res.json())
      .then(setStocks);
  }, []);

  const sorted = [...stocks].sort((a, b) => {
    if (a[sortKey] < b[sortKey]) return sortAsc ? -1 : 1;
    if (a[sortKey] > b[sortKey]) return sortAsc ? 1 : -1;
    return 0;
  });

  const changeSort = (key: string) => {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const tickerLink = (symbol: string) =>
    `https://www.google.com/finance/quote/${symbol}:NASDAQ`;

  return (
    <div style={{ display: "flex", gap: 20, padding: 20 }}>
      
      {/* LEFT: TABLE */}
      <div style={{ flex: 3 }}>
        <h1 style={{ marginBottom: 10 }}>📊 Live Scanner</h1>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "Arial",
            fontSize: 14,
          }}
        >
          <thead>
            <tr style={{ background: "#111", color: "white" }}>
              {[
                ["symbol", "Ticker"],
                ["price", "Price"],
                ["changePercent", "% Change"],
                ["volume", "Volume"],
                ["score", "Score"],
                ["signal", "Signal"],
              ].map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => changeSort(key)}
                  style={{
                    padding: 10,
                    cursor: "pointer",
                    border: "1px solid #333",
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sorted.map((s) => (
              <tr
                key={s.symbol}
                style={{
                  borderBottom: "1px solid #ddd",
                  background: s.isBreakout ? "#e8fff0" : "white",
                }}
              >
                <td style={{ padding: 10, border: "1px solid #eee" }}>
                  <a
                    href={tickerLink(s.symbol)}
                    target="_blank"
                    style={{ color: "#2563eb", fontWeight: 600 }}
                  >
                    {s.symbol}
                  </a>
                </td>

                <td style={{ padding: 10 }}>${s.price}</td>

                <td
                  style={{
                    padding: 10,
                    color: s.changePercent > 0 ? "green" : "red",
                  }}
                >
                  {s.changePercent}%
                </td>

                <td style={{ padding: 10 }}>{s.volume}</td>

                <td style={{ padding: 10, fontWeight: "bold" }}>
                  {s.score}
                </td>

                <td style={{ padding: 10 }}>{s.signal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* RIGHT PANEL */}
      <div
        style={{
          flex: 1,
          border: "1px solid #ddd",
          padding: 15,
          borderRadius: 10,
          height: "fit-content",
        }}
      >
        <h2>🧠 Trade Panel</h2>

        <p><b>Rules:</b></p>
        <ul>
          <li>Only trade top 3 signals</li>
          <li>Ignore weak momentum</li>
          <li>Focus breakout stocks</li>
        </ul>

        <hr />

        <p><b>Signal Guide:</b></p>
        <p>🚀 Breakout = price breaking resistance</p>
        <p>🔥 Momentum = strong move</p>
        <p>👀 Watch = no action</p>
      </div>
    </div>
  );
}