import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Linden Physio",
};

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
