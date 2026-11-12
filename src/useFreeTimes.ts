import { useQuery } from "@tanstack/react-query";
import { getFreeTimes } from "./api";

// The free times for a day and a service. The key is the question; the cache keeps one answer per
// question, shares it with every component that asks, and asks the server again when it may be old.
export function useFreeTimes(date: string, serviceId: string) {
  return useQuery({
    queryKey: ["free-times", date, serviceId],
    queryFn: ({ signal }) => getFreeTimes(date, serviceId, signal),
  });
}
