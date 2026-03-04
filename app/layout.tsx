import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TradeBase",
  description: "Simple CRM + quoting for trade contractors",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
