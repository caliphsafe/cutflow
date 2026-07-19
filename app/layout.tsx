import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CutFlow — The operating system for independent barbers",
  description: "Smart booking, client memory, direct payments, products and tax-ready reporting for barbers.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
