import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mirror",
  description: "See what changed. See why it matters to you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
