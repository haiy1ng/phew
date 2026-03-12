import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Phew | Clean-up Co-Pilot",
  description:
    "Upload a messy space photo, see an AI tidy preview, and complete manageable cleanup tasks with momentum."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
