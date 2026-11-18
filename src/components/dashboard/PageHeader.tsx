export function PageHeader({ title, intro, actions }: { title: string; intro?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {intro ? <p className="mt-1 max-w-[70ch] text-ink-soft">{intro}</p> : null}
      </div>
      {actions}
    </div>
  );
}
