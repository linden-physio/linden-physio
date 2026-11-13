import { clockTime } from "./clockTime";

// A free time, with the first names of the physiotherapists free then: "09:00 · Karin, Oskar". The dot
// is only for the eye; a screen reader says "09:00 with Karin, Oskar". The time is an instant, like
// "2026-11-10T08:00:00.000Z". The chip sits outside the booking form, so form="details" makes it one
// of the form's fields.
export function TimeChip({
  time,
  names,
  picked,
  onPick,
}: {
  time: string;
  names: string[];
  picked: boolean;
  onPick: () => void;
}) {
  return (
    <label className="flex h-10 cursor-pointer items-center rounded-full border border-line-200 bg-surface px-4 has-checked:border-brand-600 has-checked:bg-brand-600 has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-700">
      <input
        type="radio"
        name="time"
        form="details"
        value={time}
        checked={picked}
        onChange={onPick}
        className="sr-only"
      />
      {clockTime(time)}
      <span aria-hidden="true">&nbsp;·&nbsp;</span>
      <span className="sr-only"> with </span>
      {names.join(", ")}
    </label>
  );
}
