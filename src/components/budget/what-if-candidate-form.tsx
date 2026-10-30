"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface WhatIfCandidateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (candidate: { name: string; category: string; amount: number }) => void;
}

export const CANDIDATE_BUDGET_CATEGORIES = [
  "Venue & Facilities",
  "Catering & Bar",
  "Decor & Styling",
  "Entertainment & AV",
  "Photography & Video",
  "Logistics & Rentals",
  "Staffing & Security",
  "Other",
] as const;

/**
 * Inline form for adding a hypothetical candidate line item to an active What-If scenario.
 */
export function WhatIfCandidateForm({
  isOpen,
  onClose,
  onAdd,
}: WhatIfCandidateFormProps) {
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("Venue & Facilities");
  const [amountStr, setAmountStr] = React.useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amountStr);
    if (!name.trim() || isNaN(parsedAmount) || parsedAmount < 0) return;

    onAdd({
      name: name.trim(),
      category,
      amount: parsedAmount,
    });

    setName("");
    setAmountStr("");
    onClose();
  };

  const handleCancel = () => {
    setName("");
    setAmountStr("");
    onClose();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900 dark:bg-indigo-950/30 space-y-3"
    >
      <div className="font-semibold text-xs text-indigo-950 dark:text-indigo-200">
        Add New Candidate Expense to Scenario
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="candidate-item-name" className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
            Item Name
          </label>
          <Input
            id="candidate-item-name"
            required
            placeholder="e.g. Photo Booth Rental"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label htmlFor="candidate-item-category" className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
            Category
          </label>
          <select
            id="candidate-item-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          >
            {CANDIDATE_BUDGET_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="candidate-item-cost" className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
            Estimated Cost (₹)
          </label>
          <Input
            id="candidate-item-cost"
            required
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            className="h-8 text-xs font-mono"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          className="text-xs h-7"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs h-7"
        >
          Save to Scenario
        </Button>
      </div>
    </form>
  );
}

