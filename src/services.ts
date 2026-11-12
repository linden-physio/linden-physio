// The clinic's services. In a file of their own, so that both the server and the browser can read them.
export const services = [
  { id: "first-visit", length: 60, title: "First visit", line: "A full assessment and a plan for your treatment." },
  { id: "follow-up", length: 30, title: "Follow-up", line: "We check your progress and adjust your exercises." },
  { id: "sports-massage", length: 45, title: "Sports massage", line: "Deep work on tight or overworked muscles." },
].map((s) => ({ ...s, name: s.title + ", " + s.length + " minutes" }));
