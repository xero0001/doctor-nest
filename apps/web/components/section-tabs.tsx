type SectionTabOption<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

export function SectionTabs<T extends string>({
  ariaLabel,
  options,
  value,
  onValueChange,
}: {
  ariaLabel: string;
  options: readonly SectionTabOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="grid shrink-0 border-b border-[#e8eaf1] px-3"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const selected = value === option.value;

        return (
          <button
            type="button"
            role="tab"
            aria-selected={selected}
            key={option.value}
            onClick={() => onValueChange(option.value)}
            className={`relative flex h-11 items-center justify-center gap-1.5 text-xs font-semibold ${
              selected ? "text-[#252a3e]" : "text-[#9ca1b1]"
            }`}
          >
            {option.label}
            {option.count === undefined ? null : (
              <span className={selected ? "text-[#3157f6]" : "text-[#adb2bf]"}>
                {option.count}
              </span>
            )}
            {selected ? (
              <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#3157f6]" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
