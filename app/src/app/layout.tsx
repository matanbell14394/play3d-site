import type { Metadata } from "next";
import { Orbitron, Noto_Sans_Hebrew } from "next/font/google";
import "@/styles/globals.css";
import { ThemeProvider } from "./theme-provider";
import { Providers } from "./providers";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const notoSansHebrew = Noto_Sans_Hebrew({
  variable: "--font-noto-hebrew",
  subsets: ["hebrew"],
  weight: ["400", "500", "700"],
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
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
