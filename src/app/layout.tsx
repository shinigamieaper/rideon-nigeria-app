import type { Metadata } from "next";
import type { Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "react-loading-skeleton/dist/skeleton.css";
import Providers from "./providers";
import HeaderSwitcher from "./header-switcher";
import FooterSwitcher from "./footer-switcher";
import BannerSwitcher from "./banner-switcher";
import DotGridWrapper from "./dotgrid-wrapper";
import { ThemeScript } from "./theme-script";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: "RideOn Nigeria | Safe, Reliable, Professional Mobility",
  description:
    "Premium chauffeur services, drive-my-car solutions, and full-time driver placement across Nigeria. Safe, reliable transportation for individuals and businesses.",
  icons: {
    icon: [
      {
        url: "/RIDEONNIGERIA%20LOGO.png",
        type: "image/png",
        sizes: "1024x1024",
      },
    ],
    shortcut: [{ url: "/RIDEONNIGERIA%20LOGO.png", type: "image/png" }],
    apple: [
      { url: "/RIDEONNIGERIA%20LOGO.png", type: "image/png", sizes: "180x180" },
    ],
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <link
          rel="icon"
          type="image/png"
          href="/RIDEONNIGERIA%20LOGO.png"
          sizes="1024x1024"
        />
        <link
          rel="shortcut icon"
          type="image/png"
          href="/RIDEONNIGERIA%20LOGO.png"
        />
        <link rel="apple-touch-icon" href="/RIDEONNIGERIA%20LOGO.png" />
        {/* No global manifest here; manifests are injected per-portal from Providers */}
      </head>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${jetBrainsMono.variable} antialiased transition-colors duration-300`}
      >
        <Providers>
          <DotGridWrapper>
            <HeaderSwitcher />
            <BannerSwitcher />
            {children}
            <FooterSwitcher />
          </DotGridWrapper>
        </Providers>
      </body>
    </html>
  );
}
