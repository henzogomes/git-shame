"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClientSideParameterCleaner() {
  const router = useRouter();

  useEffect(() => {
    // Remove the secret parameter from URL without causing a navigation
    const url = new URL(window.location.href);
    if (url.searchParams.has("s")) {
      url.searchParams.delete("s");
      window.history.replaceState({}, "", url.toString());
    }
  }, [router]);

  return null; // This component doesn't render anything
}
