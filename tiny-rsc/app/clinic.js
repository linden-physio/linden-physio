// The clinic's server, which keeps the bookings and works out the free times.
export async function getFreeTimes(day, service) {
  const response = await fetch(`http://localhost:3000/free-times?date=${day}&service=${service}`);
  return response.json();
}
