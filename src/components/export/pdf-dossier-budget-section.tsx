import * as React from "react";
import type { BudgetItemRow } from "@/lib/validations/budget";
import type { calculateBudgetSummary, calculateCategoryBreakdown } from "@/lib/budget-math";
import { getItemVariance } from "@/lib/budget-math";
import { formatMoney } from "@/lib/currency-utils";

export interface PdfDossierBudgetSectionProps {
  budgetSummary: ReturnType<typeof calculateBudgetSummary>;
  categoryBreakdown: ReturnType<typeof calculateCategoryBreakdown>;
  budgetItems: BudgetItemRow[];
}

export function PdfDossierBudgetSection({
  budgetSummary,
  categoryBreakdown,
  budgetItems,
}: PdfDossierBudgetSectionProps) {
  return (
    <>
      {/* ================================================================== */}
      {/* SECTION 4: SMART BUDGET SUMMARY & CATEGORY BREAKDOWN               */}
      {/* ================================================================== */}
      <section className="mt-8 border-b border-slate-200 pb-8 break-inside-avoid">
        <h2 className="text-base font-bold text-slate-950">
          Financial Summary &amp; Category Allocations
        </h2>

        {/* Budget KPIs */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5 text-xs">
          <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/60 print:bg-white">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Target Budget
            </p>
            <p className="mt-1 text-sm font-extrabold text-slate-950">
              {formatMoney(budgetSummary.targetBudget)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/60 print:bg-white">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Planned Estimates
            </p>
            <p className="mt-1 text-sm font-extrabold text-slate-950">
              {formatMoney(budgetSummary.totalEstimated)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/60 print:bg-white">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Actual Expenditures
            </p>
            <p className="mt-1 text-sm font-extrabold text-slate-950">
              {formatMoney(budgetSummary.totalActual)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/60 print:bg-white">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Variance (Actual - Est)
            </p>
            <p className={`mt-1 text-sm font-extrabold ${budgetSummary.variance > 0 ? "text-rose-600" : "text-emerald-700"}`}>
              {budgetSummary.variance > 0 ? `+${formatMoney(budgetSummary.variance)}` : formatMoney(budgetSummary.variance)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/60 print:bg-white">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Remaining Balance
            </p>
            <p className={`mt-1 text-sm font-extrabold ${budgetSummary.remainingBudget < 0 ? "text-rose-600" : "text-slate-950"}`}>
              {formatMoney(budgetSummary.remainingBudget)}
            </p>
          </div>
        </div>

        {/* Category Breakdown Table */}
        {categoryBreakdown.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs" aria-label="Budget Category Breakdown">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="py-2 px-3">Expense Category</th>
                  <th scope="col" className="py-2 px-3 text-right">Estimated</th>
                  <th scope="col" className="py-2 px-3 text-right">Actual</th>
                  <th scope="col" className="py-2 px-3 text-right">Variance</th>
                  <th scope="col" className="py-2 px-3 text-right">% of Target</th>
                  <th scope="col" className="py-2 px-3 text-center w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categoryBreakdown.map((cat, i) => (
                  <tr key={i} className="break-inside-avoid">
                    <td className="py-2 px-3 font-semibold text-slate-900">
                      {cat.category}
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-slate-700">
                      {formatMoney(cat.totalEstimated)}
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-slate-700">
                      {formatMoney(cat.totalActual)}
                    </td>
                    <td className={`py-2 px-3 text-right font-semibold ${cat.variance > 0 ? "text-rose-600" : "text-slate-700"}`}>
                      {cat.variance > 0 ? `+${formatMoney(cat.variance)}` : formatMoney(cat.variance)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      {cat.percentageOfTargetBudget}%
                    </td>
                    <td className="py-2 px-3 text-center">
                      {cat.isOverspent ? (
                        <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                          Overspent
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                          On Track
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-200 bg-slate-50/70 font-bold text-slate-950">
                  <td className="py-2 px-3">Total Allocations</td>
                  <td className="py-2 px-3 text-right">{formatMoney(budgetSummary.totalEstimated)}</td>
                  <td className="py-2 px-3 text-right">{formatMoney(budgetSummary.totalActual)}</td>
                  <td className="py-2 px-3 text-right">{formatMoney(budgetSummary.variance)}</td>
                  <td className="py-2 px-3 text-right">{budgetSummary.utilizationPercent}%</td>
                  <td className="py-2 px-3 text-center">
                    {budgetSummary.isOverBudget ? (
                      <span className="text-rose-600 text-[10px]">Over Budget</span>
                    ) : (
                      <span className="text-emerald-700 text-[10px]">Healthy</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ================================================================== */}
      {/* SECTION 5: ITEMIZED EXPENSE LEDGER                                 */}
      {/* ================================================================== */}
      <section className="mt-8 border-b border-slate-200 pb-8 break-inside-avoid">
        <h2 className="text-base font-bold text-slate-950">
          Itemized Expense Ledger
        </h2>

        {budgetItems.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-2 px-3 w-36">Category</th>
                  <th className="py-2 px-3">Item Name</th>
                  <th className="py-2 px-3 text-right w-24">Estimated</th>
                  <th className="py-2 px-3 text-right w-24">Actual</th>
                  <th className="py-2 px-3 text-right w-24">Variance</th>
                  <th className="py-2 px-3 w-1/3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {budgetItems.map((item) => {
                  const hasActual = item.actual_amount !== null && item.actual_amount !== undefined;
                  const variance = getItemVariance(item);
                  return (
                    <tr key={item.id} className="break-inside-avoid">
                      <td className="py-2 px-3 align-top font-medium text-slate-600">
                        {item.category}
                      </td>
                      <td className="py-2 px-3 align-top font-semibold text-slate-900">
                        {item.item_name}
                      </td>
                      <td className="py-2 px-3 align-top text-right text-slate-700">
                        {formatMoney(Number(item.estimated_amount))}
                      </td>
                      <td className="py-2 px-3 align-top text-right text-slate-700">
                        {hasActual ? (
                          formatMoney(Number(item.actual_amount))
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className={`py-2 px-3 align-top text-right font-medium ${hasActual && variance > 0 ? "text-rose-600 font-bold" : "text-slate-700"}`}>
                        {hasActual ? (
                          variance > 0 ? `+${formatMoney(variance)}` : formatMoney(variance)
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 align-top text-slate-500 text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                        {item.notes || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
            No itemized expense records logged.
          </div>
        )}
      </section>
    </>
  );
}

