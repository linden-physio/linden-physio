type OpeningHours = { open: string; close: string } | "closed";

// The clinic's opening hours, by weekday (0 is Sunday).
const hours: Record<number, OpeningHours> = {
  0: "closed",
  1: { open: "09:00", close: "12:00" },
  2: { open: "09:00", close: "12:00" },
  3: { open: "09:00", close: "12:00" },
  4: { open: "13:00", close: "17:00" },
  5: { open: "09:00", close: "12:00" },
  6: "closed",
};

type Booking = { date: string; start: string; end: string };

// Times already booked.
const bookings: Booking[] = [
  { date: "2026-11-10", start: "09:00", end: "10:00" },
  { date: "2026-11-11", start: "11:00", end: "12:00" },
];

function toMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

function toTime(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return h + ":" + m;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

// Free start times on one day, for a visit of the given length.
function freeTimes(date: string, length: number): string[] {
  const weekday = new Date(date + "T12:00").getDay();
  const open = hours[weekday];
  if (open === "closed") return [];
  const taken = bookings.filter((b) => b.date === date);
  const times = [];
  for (let start = toMinutes(open.open); start + length <= toMinutes(open.close); start += 30) {
    const end = start + length;
    const clash = taken.some((b) => overlaps(start, end, toMinutes(b.start), toMinutes(b.end)));
    if (!clash) times.push(toTime(start));
  }
  return times;
}

const list = document.querySelector<HTMLUListElement>("#free-times")!;
const count = document.querySelector<HTMLParagraphElement>("#count")!;
const summary = document.querySelector<HTMLParagraphElement>("#summary")!;
const day = document.querySelector<HTMLInputElement>("#day")!;
const service = document.querySelector<HTMLSelectElement>("#service")!;

const form = document.querySelector<HTMLFormElement>("#details")!;
const message = document.querySelector<HTMLParagraphElement>("#message")!;

type FormState =
  | { kind: "editing" }
  | { kind: "invalid"; message: string }
  | { kind: "ready"; name: string; email: string; date: string; time: string };

let formState: FormState = { kind: "editing" };

// Everything the screen shows comes from this.
const state: { date: string; picked: string | null } = { date: day.value, picked: null };

function dayName(date: string): string {
  return new Date(date + "T12:00").toLocaleDateString("en-GB", { weekday: "long" });
}

// Rebuild the whole booking card from the state.
function render() {
  const times = freeTimes(state.date, Number(service.value));
  count.textContent = times.length === 0 ? "No free times on " + dayName(state.date) : times.length + " free times";
  list.replaceChildren();
  for (const time of times) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.textContent = time;
    if (time === state.picked) button.classList.add("picked");
    button.addEventListener("click", () => {
      state.picked = time;
      render();
    });
    item.append(button);
    list.append(item);
  }
  summary.textContent = state.picked
    ? dayName(state.date) + " " + state.picked + ", " + service.selectedOptions[0].text
    : "No time picked yet.";

  switch (formState.kind) {
    case "editing":
      message.textContent = "";
      break;
    case "invalid":
      message.textContent = formState.message;
      break;
    case "ready":
      message.textContent = "Ready to book " + formState.time + " for " + formState.name + ".";
      break;
    default: {
      const unhandled: never = formState;
      throw new Error("Unhandled form state: " + JSON.stringify(unhandled));
    }
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  if (state.picked === null) {
    formState = { kind: "invalid", message: "Pick a time first." };
  } else if (state.date < today()) {
    formState = { kind: "invalid", message: "That day has already passed." };
  } else {
    formState = {
      kind: "ready",
      name: String(data.get("name")),
      email: String(data.get("email")),
      date: state.date,
      time: state.picked,
    };
  }
  render();
});

day.addEventListener("change", () => {
  state.date = day.value;
  state.picked = null;
  render();
});

service.addEventListener("change", () => {
  state.picked = null;
  render();
});

render();
