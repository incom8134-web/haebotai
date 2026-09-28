// One quick moment per navigation: the new page fades and lifts in.
// Plain CSS (.page-enter in globals.css), not a JS animation: the page
// is visible from the first paint even if scripts are slow or fail to
// load, and prefers-reduced-motion turns it into an instant swap.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
