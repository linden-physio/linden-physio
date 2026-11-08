export function DayPicker({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  return (
    <label>
      Day <input type="date" id="day" value={date} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
