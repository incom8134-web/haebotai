// Shown instantly on navigation while the server renders the next page,
// so a tap never looks like nothing happened.
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1240px] animate-pulse px-4 pt-6 md:px-8 md:pt-10" aria-busy="true" aria-label="불러오는 중">
      <div className="h-3 w-28 rounded-full bg-surface-2/70" />
      <div className="mt-4 h-9 w-2/3 max-w-md rounded-xl bg-surface-2/70" />
      <div className="mt-3 h-4 w-full max-w-xl rounded-lg bg-surface-2/50" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-36 rounded-[24px] bg-surface-2/50" />
        ))}
      </div>
    </div>
  );
}
