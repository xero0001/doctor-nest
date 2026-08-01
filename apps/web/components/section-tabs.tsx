type SectionTabOption<T extends string> = {
  value: T;
  label: string;
  count?: number;
  disabled?: boolean;
  title?: string;
};

export function SectionTabs<T extends string>({
  ariaLabel,
  options,
  value,
  onValueChange,
  layout = "equal",
}: {
  ariaLabel: string;
  options: readonly SectionTabOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  layout?: "equal" | "fit";
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`${
        layout === "equal" ? "grid px-3" : "flex px-6"
      } shrink-0 border-b border-[#e8eaf1]`}
      style={
        layout === "equal"
          ? {
              gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
            }
          : undefined
      }
    >
      {options.map((option) => {
        const selected = value === option.value;

        return (
          <button
            type="button"
            role="tab"
            aria-selected={selected}
            aria-disabled={option.disabled || undefined}
            disabled={option.disabled}
            title={option.title}
            key={option.value}
            onClick={() => onValueChange(option.value)}
            className={`relative flex h-12 items-center justify-center gap-1.5 text-sm font-semibold disabled:cursor-not-allowed ${
              layout === "fit" ? "min-w-44 px-6" : ""
            } ${
              selected
                ? "text-[#252a3e]"
                : option.disabled
                  ? "text-[#c2c6d0]"
                  : "text-[#9ca1b1] hover:text-[#646b7f]"
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
