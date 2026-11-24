/** Simple horizontal tab strip — active tab reads via a subtle neutral
 *  underline/background, not color (DESIGN_SYSTEM.md §7: never color-only). */
export default function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`shrink-0 border-b-2 px-4 py-3 text-body-sm font-semibold transition-colors ${
            active === tab.key
              ? 'border-primary text-text-900'
              : 'border-transparent text-text-500 hover:text-text-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
