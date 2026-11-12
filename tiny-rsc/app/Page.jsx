import { getFreeTimes } from "./clinic.js";
import { services } from "./services.js";
import { DayLinks } from "./DayLinks.jsx";
import { Times } from "./Times.jsx";

// The page. A server component: it reads the day and the service from the address and asks the
// clinic's server for that day's free times.
export function Page({ search }) {
  const day = /^\d{4}-\d\d-\d\d$/.test(search.get("day")) ? search.get("day") : "2026-11-10";
  const service = services.some((s) => s.id === search.get("service")) ? search.get("service") : "first-visit";
  const free = getFreeTimes(day, service);
  return (
    <main>
      <h1>Linden Physio</h1>
      <p className="lead">Physiotherapy in the middle of town.</p>
      <DayLinks day={day} service={service} />
      <section>
        <h2>Free times</h2>
        <Times free={free} />
      </section>
    </main>
  );
}
