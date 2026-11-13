import { Suspense } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { SignedInAs } from "../../staff/SignedInAs";

// The staff's pages: the clinic's name and the menu on the left, the page on the right.
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex flex-col gap-6 border-b border-line-200 bg-paper-50 p-4 md:w-60 md:border-r md:border-b-0">
        <div className="flex flex-col gap-1">
          <p className="font-semibold">Linden Physio</p>
          <Suspense fallback={null}>
            <SignedInAs />
          </Suspense>
        </div>
        <nav aria-label="Staff">
          <Link href="/staff" className="flex items-center gap-2 rounded-md bg-surface px-3 py-2 font-medium">
            <CalendarDays className="size-4" /> Day
          </Link>
        </nav>
      </aside>
      <main className="flex-1 bg-surface p-4 md:p-8">{children}</main>
    </div>
  );
}
