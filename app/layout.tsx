import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LoadingProvider } from '@/lib/contexts/LoadingContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { NavigationProgress } from '@/components/NavigationProgress';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "Contactify - Connect and Share",
  description: "A modern social media platform for connecting with friends and sharing your thoughts.",
  keywords: ["social media", "networking", "friends", "sharing", "posts", "comments"],
  authors: [{ name: "Contactify Team" }],
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.json",
  themeColor: "#000000",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <LoadingProvider>
          <NavigationProgress />
          <LoadingSpinner />
          {children}
        </LoadingProvider>
      </body>
    </html>
  );
}
