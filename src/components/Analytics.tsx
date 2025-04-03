/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect } from "react";
import Script from "next/script";

type AnalyticsProps = {
  gaId: string;
};

export default function Analytics({ gaId }: AnalyticsProps) {
  useEffect(() => {
    if (!gaId) {
      console.error("Google Analytics ID is missing.");
      return;
    }

    const onGtagLoad = () => {
      if (typeof window !== "undefined") {
        window.dataLayer = window.dataLayer || [];
        function gtag(...args: any[]) {
          window.dataLayer.push(args);
        }
        window.gtag = gtag;

        gtag("js", new Date());
        gtag("config", gaId);
      }
    };

    // Attach the event listener for when the script loads
    if (typeof window !== "undefined" && window.gtag !== undefined) {
      onGtagLoad();
    } else {
      window.addEventListener("gtagLoaded", onGtagLoad);
    }

    return () => {
      window.removeEventListener("gtagLoaded", onGtagLoad);
    };
  }, [gaId]);

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        onLoad={() => {
          console.log("Google Analytics script loaded.");
          const event = new Event("gtagLoaded");
          window.dispatchEvent(event); // Notify that gtag is ready
        }}
      />
    </>
  );
}
