import type { Metadata } from "next";
import "../index.css";

export const metadata: Metadata = {
  title: "Linden Physio",
};

// What every page shares: the html and body, the clinic's styles, and the email link at the bottom.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto max-w-5xl px-6 py-12">
          <div id="app">{children}</div>
          <p className="mt-12">
            <a className="text-brand-700 underline" href="mailto:hello@lindenphysio.com">
              Email us
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
