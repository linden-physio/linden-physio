import { clockTime } from "./clockTime";

// A free time. The time is an instant, like "2026-11-10T08:00:00.000Z".
export function TimeChip({ time, picked, onPick }: { time: string; picked: boolean; onPick: () => void }) {
  return (
    <label className="flex h-10 cursor-pointer items-center rounded-full border border-line-200 bg-surface px-4 has-checked:border-brand-600 has-checked:bg-brand-600 has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-700">
      <input type="radio" name="time" value={time} checked={picked} onChange={onPick} className="sr-only" />
      {clockTime(time)}
    </label>
  );
}
