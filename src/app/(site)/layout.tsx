import { Suspense } from "react";
import "../../index.css";
import { about, here } from "../../business";

// What every page of every business shares: the html and body, and the clinic's styles.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <Colours />
        </Suspense>
        {children}
      </body>
    </html>
  );
}

// The business's own colours, from its row, in place of the green in index.css.
async function Colours() {
  const colours = (await about(await here())).colours;
  // Only colours like #2f7d5b go into the style sheet: nothing else written in the row can.
  if (colours.length !== 3 || !colours.every((colour) => /^#[0-9a-f]{6}$/i.test(colour))) return null;
  const [dark, main, light] = colours;
  return (
    <style>{`:root { --color-brand-700: ${dark}; --color-brand-600: ${main}; --color-brand-50: ${light}; }`}</style>
  );
}
