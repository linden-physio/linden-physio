export function TimeChip({ time, picked, onPick }: { time: string; picked: boolean; onPick: () => void }) {
  return (
    // The design draws the time as a pill, so it is a div that looks like one.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
    <div
      role="button"
      className={
        "flex h-10 cursor-pointer items-center rounded-full border px-4 " +
        (picked ? "border-brand-600 bg-brand-600 text-white" : "border-line-200 bg-surface")
      }
      onClick={onPick}
    >
      {time}
    </div>
  );
}
