// Shows which database this deployment uses, so we can tell previews and production apart.
export function DatabaseStatus() {
  const url = import.meta.env.VITE_DATABASE_URL;
  if (!url) return null;
  return <p className="mt-12 text-small text-ink-600">Database: {new URL(url).hostname}</p>;
}
