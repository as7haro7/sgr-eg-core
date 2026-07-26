import Link from "next/link";

interface SectionTab {
  description?: string;
  href: string;
  id: string;
  label: string;
}

export function SectionTabs({
  active,
  label,
  tabs,
}: {
  active: string;
  label: string;
  tabs: SectionTab[];
}) {
  return (
    <nav
      aria-label={label}
      className="overflow-x-auto border-b border-slate-200 bg-slate-50/80 p-3"
    >
      <div className="flex min-w-max gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active === tab.id ? "page" : undefined}
            className={
              active === tab.id
                ? "min-w-32 rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 shadow-sm"
                : "min-w-32 rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-950"
            }
          >
            <span className="block">{tab.label}</span>
            {tab.description && (
              <span className="mt-0.5 block text-xs font-normal text-slate-500">
                {tab.description}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
