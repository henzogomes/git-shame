/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect } from "react";
import Script from "next/script";

type AnalyticsProps = {
  gaId: string;
};

export default function Analytics({ gaId }: AnalyticsProps) {
  useEffect(() => {
    // Initialize GA when the component mounts
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer.push(args);
    }
    gtag("js", new Date());
    gtag("config", gaId);
  }, [gaId]);

  return (
    <>
      {/* Load Google Analytics script */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
    </>
  );
}
