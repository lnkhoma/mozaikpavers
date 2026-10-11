import type { Metadata } from "next";
import { AdminBody, AdminHeader, Panel } from "@/components/admin/ui";
import { requireRole } from "@/lib/auth/session";
import { formatDateTime, formatKwacha, formatNumber } from "@/lib/format";
import { DEFAULT_PRICING, PRICING_FIELDS } from "@/lib/pricing/defaults";
import type { PricingConfig } from "@/lib/pricing/types";
import { getCurrentPricing, listPricingHistory } from "@/lib/services/pricing";
import { PricingForm } from "./pricing-form";

export const metadata: Metadata = { title: "Pricing Settings" };

const label = (key: string) => PRICING_FIELDS.find((f) => f.key === key)?.label ?? key;
const show = (key: string, v: number) => (PRICING_FIELDS.find((f) => f.key === key)?.kind === "money" ? formatKwacha(v) : formatNumber(v));

export default async function PricingPage() {
  await requireRole("admin");
  const [current, history] = await Promise.all([getCurrentPricing(), listPricingHistory()]);

  return (
    <>
      <AdminHeader
        title="Pricing settings"
        subtitle={`Current version ${current.version} · updated ${formatDateTime(current.updatedAt)}`}
      />
      <AdminBody>
        <PricingForm current={current.values} />

        <Panel title="Pricing history">
          <ol className="divide-y divide-ink-100">
            {history.map((h, i) => {
              const prev: PricingConfig | undefined = history[i + 1]?.values;
              const values = { ...DEFAULT_PRICING, ...h.values };
              const diffs = prev ? (Object.keys(values) as (keyof PricingConfig)[]).filter((k) => prev[k] !== values[k]) : [];
              return (
                <li key={h.version} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-bold">
                      Version {h.version}
                      {h.version === current.version && <span className="ml-2 rounded bg-moss-500/10 px-2 py-0.5 text-xs text-moss-600">Current</span>}
                    </p>
                    <p className="text-xs text-ink-500">{h.changedByName ?? "System"} · {formatDateTime(h.createdAt)}</p>
                  </div>
                  {h.changeNote && <p className="text-sm text-ink-600">{h.changeNote}</p>}
                  {diffs.length > 0 && (
                    <ul className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                      {diffs.map((k) => (
                        <li key={k} className="rounded bg-sand-100 px-2 py-1">
                          {label(k)}: <span className="text-ink-500 line-through">{show(k, prev![k])}</span> → <strong>{show(k, values[k])}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        </Panel>
      </AdminBody>
    </>
  );
}
