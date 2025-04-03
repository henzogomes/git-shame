import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Analytics from "@/components/Analytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GitHub Shamer - Get Your GitHub Profile Roasted",
  description: "Get your GitHub profile playfully mocked and roasted by AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get GA ID from environment variable
  const gaId = process.env.NEXT_PUBLIC_GA_ID || "";

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        {/* Only render Analytics component if GA ID is available */}
        {gaId && <Analytics gaId={gaId} />}
      </body>
    </html>
  );
}
