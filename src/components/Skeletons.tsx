export function PostSkeleton() {
  return (
    <div className="animate-pulse border-t border-[var(--line)] py-6">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-full bg-[var(--surface-high)]" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded bg-[var(--surface-high)]" />
          <div className="h-2 w-16 rounded bg-[var(--surface-high)]" />
        </div>
      </div>
      <div className="mt-4 h-5 w-48 rounded bg-[var(--surface-high)]" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded bg-[var(--surface-high)]" />
        <div className="h-3 w-4/5 rounded bg-[var(--surface-high)]" />
        <div className="h-3 w-2/3 rounded bg-[var(--surface-high)]" />
      </div>
    </div>
  );
}

export function LineSkeleton() {
  return <div className="h-16 animate-pulse border-t border-[var(--line)] bg-[var(--surface)]/40" />;
}
