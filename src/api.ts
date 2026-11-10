// The clinic's server. It works out the free times and takes bookings.
const api = "http://localhost:3000";

export type FreeTimes = {
  closed: boolean;
  // Each free time is an instant, like "2026-11-10T08:00:00.000Z".
  times: { start: string }[];
  nearest: { date: string; start: string } | null;
};

// Ask the server for something and read the answer as JSON. A 404 or a 500 is still an answer, so check it.
async function getJSON(path: string) {
  const response = await fetch(api + path);
  if (!response.ok) throw new Error(path + " answered " + response.status);
  return response.json();
}

export function getFreeTimes(date: string, service: string): Promise<FreeTimes> {
  return getJSON("/free-times?date=" + date + "&service=" + service);
}

export type NewBooking = { start: string; service: string; name: string; email: string };

// Send a booking. The server answers 201 when it has taken it.
export function postBooking(booking: NewBooking): Promise<Response> {
  return fetch(api + "/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(booking),
  });
}
