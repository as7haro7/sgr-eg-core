import Link from "next/link";

interface SectionTab {
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
      className="overflow-x-auto border-b border-slate-200 bg-white px-4"
    >
      <div className="flex min-w-max gap-1">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active === tab.id ? "page" : undefined}
            className={
              active === tab.id
                ? "border-b-2 border-blue-700 px-4 py-3 text-sm font-semibold text-blue-700"
                : "border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-600 hover:text-slate-950"
            }
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
