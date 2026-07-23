import type { Metadata, Viewport } from "next";
import { PwaRegistration } from "@/components/PwaRegistration";
import "./globals.css";

export const metadata: Metadata = {
  title: "CutFlow — Booking and business tools for barbers",
  description: "Online booking, client profiles, direct Stripe payments, product pickup and organized business reporting for independent barbers.",
  manifest: "/manifest.webmanifest",
  applicationName: "CutFlow",
  appleWebApp: {
    capable: true,
    title: "CutFlow",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/cutflow-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/cutflow-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111318",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><PwaRegistration />{children}</body>
    </html>
  );
}
