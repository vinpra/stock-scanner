"use client";

import { useState } from "react";
import StockChart from "./StockChart";

export default function ChartCard({ symbol }: { symbol: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* MINI CHART CARD */}
      <div
        className="h-full"
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: 12,
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
            alignItems: "center",
          }}
        >
          <h3 style={{ fontSize: 14, color: "#374151" }}>
            📈 {symbol} Chart
          </h3>

          <button
            onClick={() => setOpen(true)}
            style={{
              fontSize: 12,
              color: "#2563eb",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            Expand ⛶
          </button>
        </div>

        {/* MINI CHART */}
      <div className="w-full h-full">
          <StockChart symbol={symbol} />
        </div>
      </div>

      {/* MODAL (EXPANDED CHART) */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "90%",
              height: "85%",
              background: "#ffffff",
              borderRadius: 12,
              padding: 12,
              border: "1px solid #e2e8f0",
              position: "relative",
            }}
          >
            {/* CLOSE BUTTON */}
            <button
              onClick={() => setOpen(false)}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                background: "#e2e8f0",
                border: "none",
                color: "#374151",
                padding: "6px 10px",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              ✖
            </button>

            <h2 style={{ marginBottom: 10, color: "#374151" }}>
              {symbol} Full Chart
            </h2>

            <div style={{ height: "90%" }}>
              <StockChart symbol={symbol} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}