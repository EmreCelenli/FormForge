import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FormForge",
  description: "See the corrected high-plank movement in the same view as your own.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
