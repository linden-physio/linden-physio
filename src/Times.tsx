import { TimeList } from "./TimeList";
import { TryAgain } from "./TryAgain";
import type { FreeTimes } from "../server/schemas.ts";

// The day's free times, made on the server once the clinic's server has answered. Until then, the
// Suspense boundary around it shows its fallback in its place.
export async function Times({ date, free }: { date: string; free: Promise<FreeTimes | null> }) {
  const answer = await free;
  if (answer === null) {
    return (
      <div role="alert" className="flex items-center gap-4 rounded-md bg-invalid-100 px-4 py-3 text-danger-600">
        We couldn't load the free times.
        <TryAgain />
      </div>
    );
  }
  return <TimeList date={date} times={answer.times} closed={answer.closed} nearest={answer.nearest} />;
}
