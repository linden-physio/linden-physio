import type { Metadata } from "next";
import "../index.css";

export const metadata: Metadata = {
  title: "Linden Physio",
};

// What every page shares: the html and body, and the clinic's styles.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
