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
let picked = null;

function dayName(date) {
  return new Date(date + "T12:00").toLocaleDateString("en-GB", { weekday: "long" });
}

function showTimes(date) {
  const times = freeTimes(date, 60);
  count.textContent = times.length + " free times";
  for (const time of times) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.textContent = time;
    button.addEventListener("click", () => {
      list.querySelector(".picked")?.classList.remove("picked");
      button.classList.add("picked");
      picked = { date, time };
      summary.textContent = dayName(date) + " " + time + ", first visit";
    });
    item.append(button);
    list.append(item);
  }
}

const day = document.querySelector("#day");

day.addEventListener("change", () => {
  list.replaceChildren();
  picked = null;
  summary.textContent = "No time picked yet.";
  showTimes(day.value);
});

showTimes(day.value);
