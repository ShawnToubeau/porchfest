import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import clsx from "clsx";
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

import "@maptiler/sdk/dist/maptiler-sdk.css";
import { ThemeProvider } from "./theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: `Porchfest.io`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-dvh">
      <body className={clsx(inter.className, "h-full")}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark" // TODO update to system
          enableSystem
          disableTransitionOnChange
        >
          {children}
          {/* <SpeedInsights /> */}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
