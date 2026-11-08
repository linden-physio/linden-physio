export const services = [
  { length: 60, name: "First visit, 60 minutes" },
  { length: 30, name: "Follow-up, 30 minutes" },
  { length: 45, name: "Sports massage, 45 minutes" },
];

export function ServicePicker({
  length,
  open,
  onToggle,
  onChange,
}: {
  length: number;
  open: boolean;
  onToggle: () => void;
  onChange: (length: number) => void;
}) {
  const service = services.find((s) => s.length === length)!;
  return (
    <div className="service-picker">
      Service{" "}
      <button type="button" aria-expanded={open} onClick={onToggle}>
        {service.name}
      </button>
      {open && (
        <ul>
          {services.map((s) => (
            <li key={s.length}>
              <button type="button" className={s.length === length ? "picked" : undefined} onClick={() => onChange(s.length)}>
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
