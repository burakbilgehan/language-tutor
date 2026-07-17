"use client";

export function ChipGrid({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            onClick={() => onToggle(o)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95 cursor-pointer ${
              on
                ? "bg-accent text-surface shadow-cozy"
                : "bg-surface-2 text-ink hover:bg-accent-soft"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function ChoiceCard({
  selected,
  onClick,
  title,
  desc,
  disabled,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border-2 px-4 py-3 text-left transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? "border-accent bg-accent-soft/40"
          : "border-surface-2 bg-background hover:border-accent-soft"
      }`}
    >
      <div className="font-semibold">{title}</div>
      {desc && <div className="text-sm text-ink-soft">{desc}</div>}
    </button>
  );
}
