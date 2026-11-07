// The clinic's opening hours, by weekday (0 is Sunday).
const hours = {
  1: { open: "09:00", close: "12:00" },
  2: { open: "09:00", close: "12:00" },
  3: { open: "09:00", close: "12:00" },
  4: { open: "13:00", close: "17:00" },
  5: { open: "09:00", close: "12:00" },
};

// Times already booked.
const bookings = [
  { date: "2026-11-10", start: "09:00", end: "10:00" },
  { date: "2026-11-11", start: "11:00", end: "12:00" },
];

function toMinutes(time) {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

function toTime(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return h + ":" + m;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

// Free start times on one day, for a visit of the given length.
function freeTimes(date, length) {
  const weekday = new Date(date + "T12:00").getDay();
  const open = hours[weekday];
  const taken = bookings.filter((b) => b.date === date);
  const times = [];
  for (let start = toMinutes(open.open); start + length <= toMinutes(open.close); start += 30) {
    const end = start + length;
    const clash = taken.some((b) => overlaps(start, end, toMinutes(b.start), toMinutes(b.end)));
    if (!clash) times.push(toTime(start));
  }
  return times;
}

const list = document.querySelector("#free-times");
const count = document.querySelector("#count");
const summary = document.querySelector("#summary");
const day = document.querySelector("#day");
const service = document.querySelector("#service");

// Everything the screen shows comes from this.
const state = { date: day.value, picked: null };

function dayName(date) {
  return new Date(date + "T12:00").toLocaleDateString("en-GB", { weekday: "long" });
}

// Rebuild the whole booking card from the state.
function render() {
  const times = freeTimes(state.date, service.value);
  count.textContent = times.length + " free times";
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
}

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
