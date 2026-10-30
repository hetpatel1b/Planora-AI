"use client";

import * as React from "react";
import type { BudgetItemRow } from "@/lib/validations/budget";
import type { BudgetScenarioInput, ScenarioResult } from "@/lib/budget-simulator";
import { formatMoney } from "@/lib/currency-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export interface WhatIfWorkbenchTableProps {
  baselineItems: BudgetItemRow[];
  simulationResult: ScenarioResult;
  currentScenario: BudgetScenarioInput;
  onItemEstimateChange: (id: string, value: string) => void;
  onItemDeleteToggle: (id: string) => void;
  onRemoveNewItem: (tempId: string) => void;
}

export function WhatIfWorkbenchTable({
  baselineItems,
  simulationResult,
  currentScenario,
  onItemEstimateChange,
  onItemDeleteToggle,
  onRemoveNewItem,
}: WhatIfWorkbenchTableProps) {
  const hasItems =
    baselineItems.length > 0 ||
    (currentScenario.new_items && currentScenario.new_items.length > 0);

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full text-left text-xs"
        aria-label="Scenario Line Items Allocation"
      >
        <thead className="border-b border-slate-200 text-slate-600 dark:text-slate-400 dark:border-slate-800">
          <tr>
            <th scope="col" className="py-2 pr-4 font-semibold">
              Expense Item
            </th>
            <th scope="col" className="py-2 px-4 font-semibold">
              Category
            </th>
            <th scope="col" className="py-2 px-4 font-semibold">
              Baseline Cost
            </th>
            <th scope="col" className="py-2 px-4 font-semibold">
              Hypothetical Estimate
            </th>
            <th scope="col" className="py-2 px-4 font-semibold">
              Delta
            </th>
            <th scope="col" className="py-2 pl-4 text-right font-semibold">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {!hasItems && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-slate-500">
                No baseline budget items found. Add a candidate item to begin
                modeling.
              </td>
            </tr>
          )}

          {/* Existing Items with overrides */}
          {baselineItems.map((bItem) => {
            const computed = simulationResult.computedItems.find(
              (i) => i.id === bItem.id
            );
            const isDeleted = !computed;
            const baselineEst = Number(bItem.estimated_amount);
            const hypotheticalEst = computed ? computed.estimated_amount : 0;
            const delta = hypotheticalEst - baselineEst;

            return (
              <tr
                key={bItem.id}
                className={`transition ${
                  isDeleted ? "opacity-40 bg-slate-50 dark:bg-slate-900/40" : ""
                }`}
              >
                <td className="py-2.5 pr-4 font-medium text-slate-900 dark:text-slate-100">
                  <div className="flex items-center gap-2">
                    {isDeleted && (
                      <span className="line-through">{bItem.item_name}</span>
                    )}
                    {!isDeleted && <span>{bItem.item_name}</span>}
                    {computed?.isModified && (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-indigo-600 py-0"
                      >
                        Edited
                      </Badge>
                    )}
                    {isDeleted && (
                      <Badge variant="destructive" className="text-[10px] py-0">
                        Removed
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="py-2.5 px-4 text-slate-500">{bItem.category}</td>
                <td className="py-2.5 px-4 font-mono">
                  {formatMoney(baselineEst)}
                </td>
                <td className="py-2.5 px-4">
                  {!isDeleted ? (
                    <div className="relative w-32">
                      <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">
                        ₹
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        aria-label={`Adjust estimated amount for ${bItem.item_name}`}
                        value={hypotheticalEst}
                        onChange={(e) =>
                          onItemEstimateChange(bItem.id, e.target.value)
                        }
                        className="pl-6 h-7 text-xs font-mono"
                      />
                    </div>
                  ) : (
                    <span className="font-mono text-slate-400">₹0.00</span>
                  )}
                </td>
                <td
                  className={`py-2.5 px-4 font-mono font-semibold ${
                    delta < 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : delta > 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-slate-500"
                  }`}
                >
                  {delta !== 0
                    ? `${delta > 0 ? "+" : ""}${formatMoney(delta)}`
                    : "—"}
                </td>
                <td className="py-2.5 pl-4 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onItemDeleteToggle(bItem.id)}
                    className={`h-7 px-2 text-xs ${
                      isDeleted
                        ? "text-indigo-600 hover:text-indigo-700"
                        : "text-rose-600 hover:text-rose-700"
                    }`}
                  >
                    {isDeleted ? "Restore" : "Remove"}
                  </Button>
                </td>
              </tr>
            );
          })}

          {/* Newly Proposed Items */}
          {currentScenario.new_items?.map((newItem) => (
            <tr
              key={newItem.tempId}
              className="bg-emerald-50/40 dark:bg-emerald-950/20"
            >
              <td className="py-2.5 pr-4 font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{newItem.item_name}</span>
                <Badge
                  variant="outline"
                  className="text-[10px] text-emerald-700 py-0"
                >
                  New
                </Badge>
              </td>
              <td className="py-2.5 px-4 text-slate-500">{newItem.category}</td>
              <td className="py-2.5 px-4 font-mono text-slate-400">₹0.00</td>
              <td className="py-2.5 px-4 font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                {formatMoney(newItem.estimated_amount)}
              </td>
              <td className="py-2.5 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                +{formatMoney(newItem.estimated_amount)}
              </td>
              <td className="py-2.5 pl-4 text-right">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemoveNewItem(newItem.tempId)}
                  className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700"
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

