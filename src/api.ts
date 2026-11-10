// The clinic's server. It works out the free times and takes bookings.
const api = "http://localhost:3000";

export type FreeTimes = {
  closed: boolean;
  times: string[];
  nearest: { date: string; time: string } | null;
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
