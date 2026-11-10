import { create } from "zustand";

// What the visitor has chosen so far. It isn't server data, so it doesn't belong in the query cache,
// and the header and the booking section are far apart, so it lives in one small store that any
// component can read and change.
type Choice = {
  date: string;
  serviceId: string;
  picked: string | null;
  showDay: (date: string) => void;
  showService: (serviceId: string) => void;
  pick: (time: string | null) => void;
};

export const useChoice = create<Choice>()((set) => ({
  date: "2026-11-10",
  serviceId: "first-visit",
  picked: null,
  // A new day or service clears the picked time, which belonged to the old one.
  showDay: (date) => set({ date, picked: null }),
  showService: (serviceId) => set({ serviceId, picked: null }),
  pick: (picked) => set({ picked }),
}));
