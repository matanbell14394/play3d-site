import type { Metadata } from "next";
import { Orbitron, Noto_Sans_Hebrew } from "next/font/google";
import "@/styles/globals.css";
import { ThemeProvider } from "./theme-provider";
import { Providers } from "./providers";
import LiveVisitors from "@/components/LiveVisitors";
import CookieConsent from "@/components/CookieConsent";
import AccessibilityWidget from "@/components/AccessibilityWidget";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["700", "900"],
  display: "swap",
  preload: true,
});

const notoSansHebrew = Noto_Sans_Hebrew({
  variable: "--font-noto-hebrew",
  subsets: ["hebrew"],
  weight: ["400", "700"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "PLAY3D | הדפסות תלת מימד",
  description: "שירות הדפסות תלת מימד מקצועי - פילמנט, שרף ועוד",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className={`${orbitron.variable} ${notoSansHebrew.variable}`} style={{ fontSize: '17px' }}>
        <a href="#main-content" className="skip-link">דלג לתוכן הראשי</a>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <Providers>
            {children}
            <LiveVisitors />
            <AccessibilityWidget />
            <CookieConsent />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
