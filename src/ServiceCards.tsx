import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const services = [
  { length: 60, title: "First visit", line: "A full assessment and a plan for your treatment." },
  { length: 30, title: "Follow-up", line: "We check your progress and adjust your exercises." },
  { length: 45, title: "Sports massage", line: "Deep work on tight or overworked muscles." },
].map((s) => ({ ...s, name: s.title + ", " + s.length + " minutes" }));

export function ServiceCards({ length, onChange }: { length: number; onChange: (length: number) => void }) {
  return (
    <RadioGroup
      aria-label="Service"
      value={length}
      onValueChange={(value) => onChange(Number(value))}
      className="grid grid-cols-3 gap-4"
    >
      {services.map((s) => (
        <label
          key={s.length}
          className="flex cursor-pointer gap-3 rounded-md border border-line-200 bg-surface p-4 has-data-checked:border-2 has-data-checked:border-brand-600 has-data-checked:p-[15px]"
        >
          <RadioGroupItem value={s.length} className="mt-1" />
          <span>
            <span className="block font-semibold">{s.title}</span>
            <span className="block text-sm text-ink-600">{s.length} minutes</span>
            <span className="mt-2 block text-sm">{s.line}</span>
          </span>
        </label>
      ))}
    </RadioGroup>
  );
}
