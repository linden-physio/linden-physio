import { useState } from "react";

export const services = [
  { length: 60, name: "First visit, 60 minutes" },
  { length: 30, name: "Follow-up, 30 minutes" },
  { length: 45, name: "Sports massage, 45 minutes" },
];

export function ServicePicker({ length, onChange }: { length: number; onChange: (length: number) => void }) {
  const [open, setOpen] = useState(false);
  const service = services.find((s) => s.length === length)!;
  return (
    <div className="service-picker">
      Service{" "}
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        {service.name}
      </button>
      {open && (
        <ul>
          {services.map((s) => (
            <li key={s.length}>
              <button
                type="button"
                className={s.length === length ? "picked" : undefined}
                onClick={() => {
                  setOpen(false);
                  onChange(s.length);
                }}
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
