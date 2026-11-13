"use client";

import { useRouter } from "next/navigation";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { services } from "./services";

// Picking a service changes the address, and the server sends the page for that service.
export function ServiceCards({ day, service }: { day: string; service: string }) {
  const router = useRouter();
  return (
    <RadioGroup
      aria-label="Service"
      value={service}
      onValueChange={(value) => router.push("/?day=" + day + "&service=" + value, { scroll: false })}
      className="grid grid-cols-1 gap-4 sm:grid-cols-3"
    >
      {services.map((s) => (
        <ServiceCard key={s.id} service={s} />
      ))}
    </RadioGroup>
  );
}

function ServiceCard({ service }: { service: (typeof services)[number] }) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-md border border-line-200 bg-surface p-4 has-data-checked:border-2 has-data-checked:border-brand-600 has-data-checked:p-[15px]">
      <RadioGroupItem value={service.id} className="mt-1" />
      <span>
        <span className="block font-semibold">{service.title}</span>
        <span className="block text-sm text-ink-600">{service.length} minutes</span>
        <span className="mt-2 block text-sm">{service.line}</span>
      </span>
    </label>
  );
}
