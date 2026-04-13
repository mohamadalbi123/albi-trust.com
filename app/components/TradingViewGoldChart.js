"use client";

import { useEffect, useRef } from "react";

export function TradingViewGoldChart() {
  const widgetRef = useRef(null);

  useEffect(() => {
    if (!widgetRef.current) return;

    const container = widgetRef.current.parentElement;
    if (!container) return;

    container.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    const widget = container.querySelector(".tradingview-widget-container__widget");
    if (!widget) return;
    widgetRef.current = widget;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      width: "100%",
      height: 520,
      symbol: "OANDA:XAUUSD",
      interval: "60",
      timezone: "Europe/Paris",
      theme: "light",
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
      studies: [],
      support_host: "https://www.tradingview.com",
    });

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
      }
    };
  }, []);

  return (
    <div className="tv-chart-shell">
      <div className="tradingview-widget-container tv-chart-widget">
        <div className="tradingview-widget-container__widget" ref={widgetRef} />
      </div>
    </div>
  );
}
