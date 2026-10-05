import type { ReactNode } from "react";

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[10px] border border-dashed border-[var(--line)] px-6 py-10 text-center">
      <h3 className="font-display text-4xl">{title}</h3>
      <p className="mx-auto mt-3 max-w-[40ch] text-sm text-[var(--muted-foreground)]">{message}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
