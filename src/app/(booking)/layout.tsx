// The pages for people who book: the booking page, with the email link at the bottom.
export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div id="app">{children}</div>
      <p className="mt-12">
        <a className="text-brand-700 underline" href="mailto:hello@lindenphysio.com">
          Email us
        </a>
      </p>
    </main>
  );
}
