"use client";

import { useEffect, useRef } from "react";

export function TradingViewGoldChart() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "OANDA:XAUUSD",
      interval: "60",
      timezone: "Europe/Paris",
      theme: "dark",
      style: "1",
      locale: "en",
      withdateranges: true,
      allow_symbol_change: false,
      hide_top_toolbar: false,
      hide_side_toolbar: false,
      details: false,
      hotlist: false,
      calendar: false,
      save_image: false,
      hide_volume: true,
      studies: [],
      support_host: "https://www.tradingview.com",
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  return (
    <div className="tv-chart-shell">
      <div className="tradingview-widget-container tv-chart-widget" ref={containerRef} />
    </div>
  );
}
