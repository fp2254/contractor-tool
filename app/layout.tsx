import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trade Base – Lifetime Invoicing",
  description: "Pay once. Own it forever.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
