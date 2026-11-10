export function TimeChip({ time, picked, onPick }: { time: string; picked: boolean; onPick: () => void }) {
  return (
    <div
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
