// Cancel a booking, through the app's own /api/bookings/{id}. It's the same origin as the page, so the
// browser asks no one's permission first. The server answers 204 when it's cancelled (server/openapi.yaml
// lists the other answers).
export function cancelBooking(id: string): Promise<Response> {
  return fetch("/api/bookings/" + id, { method: "DELETE" });
}
