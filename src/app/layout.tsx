import "../index.css";

// What every page of every business shares: the html and body, and the clinic's styles.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
