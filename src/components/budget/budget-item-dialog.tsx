"use client";

import * as React from "react";
import {
  BUDGET_CATEGORIES,
  createBudgetItemSchema,
  updateBudgetItemSchema,
  type BudgetItemRow,
} from "@/lib/validations/budget";
import {
  createBudgetItemAction,
  updateBudgetItemAction,
} from "@/lib/actions/budget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { DollarSign, Loader2, X, Plus, Edit2 } from "lucide-react";

interface BudgetItemDialogProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (item: BudgetItemRow) => void;
  /** Pass an existing item to edit; null or undefined for create */
  item?: BudgetItemRow | null;
}

export function BudgetItemDialog({
  eventId,
  isOpen,
  onClose,
  onSuccess,
  item,
}: BudgetItemDialogProps) {
  if (!isOpen) return null;

  return (
    <BudgetItemDialogModal
      key={item ? `edit-${item.id}` : "create-new"}
      eventId={eventId}
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      item={item}
    />
  );
}

function BudgetItemDialogModal({
  eventId,
  isOpen,
  onClose,
  onSuccess,
  item,
}: BudgetItemDialogProps) {
  const isEditing = Boolean(item);

  const isCustomInit = item?.category
    ? !BUDGET_CATEGORIES.includes(item.category as (typeof BUDGET_CATEGORIES)[number])
    : false;

  const [isCustomCategory, setIsCustomCategory] = React.useState(isCustomInit);
  const [category, setCategory] = React.useState(
    item?.category ? (isCustomInit ? "Custom" : item.category) : BUDGET_CATEGORIES[0]
  );
  const [customCategory, setCustomCategory] = React.useState(
    isCustomInit ? item?.category || "" : ""
  );

  const [itemName, setItemName] = React.useState(item?.item_name || "");
  const [estimatedAmount, setEstimatedAmount] = React.useState(
    item ? String(item.estimated_amount) : ""
  );
  const [actualAmount, setActualAmount] = React.useState(
    item ? String(item.actual_amount) : ""
  );
  const [notes, setNotes] = React.useState(item?.notes || "");

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[] | undefined>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const resolvedCategory = isCustomCategory ? customCategory.trim() : category;

    const rawPayload = {
      category: resolvedCategory,
      item_name: itemName,
      estimated_amount: estimatedAmount,
      actual_amount: actualAmount,
      notes: notes,
    };

    // Client-side pre-validation
    const clientValidation = isEditing
      ? updateBudgetItemSchema.safeParse(rawPayload)
      : createBudgetItemSchema.safeParse(rawPayload);

    if (!clientValidation.success) {
      setFieldErrors(clientValidation.error.flatten().fieldErrors);
      setFormError("Please correct the errors in the form.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && item) {
        const result = await updateBudgetItemAction(item.id, eventId, rawPayload);
        if (!result.success) {
          setFormError(result.error);
          if (result.fieldErrors) setFieldErrors(result.fieldErrors);
          setIsSubmitting(false);
          return;
        }
        onSuccess(result.data);
      } else {
        const result = await createBudgetItemAction(eventId, rawPayload);
        if (!result.success) {
          setFormError(result.error);
          if (result.fieldErrors) setFieldErrors(result.fieldErrors);
          setIsSubmitting(false);
          return;
        }
        onSuccess(result.data);
      }
      onClose();
    } catch {
      setFormError("An unexpected error occurred while saving. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <DialogContent showCloseButton={false}>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              {isEditing ? <Edit2 className="size-4" /> : <Plus className="size-4" />}
            </div>
            <DialogHeader className="gap-0.5">
              <DialogTitle>
                {isEditing ? "Edit Budget Item" : "Add Budget Item"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Update projected allocation or recorded expenditure."
                  : "Track an anticipated cost and actual payments for this event."}
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogClose
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
            aria-label="Close dialog"
          >
            <X className="size-4" />
            <span className="sr-only">Close dialog</span>
          </DialogClose>
        </div>

        {/* Form Error Banner */}
        {formError && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Category Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="item-category" className="text-xs font-semibold">
              Category <span className="text-rose-500">*</span>
            </Label>
            <select
              id="item-category"
              value={isCustomCategory ? "Custom" : category}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "Custom") {
                  setIsCustomCategory(true);
                  setCategory("Custom");
                } else {
                  setIsCustomCategory(false);
                  setCategory(val);
                }
              }}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              {BUDGET_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="Custom">Custom Category...</option>
            </select>
          </div>

          {/* Custom Category input if selected */}
          {isCustomCategory && (
            <div className="space-y-1.5 animate-in fade-in duration-100">
              <Label htmlFor="custom-category" className="text-xs font-semibold">
                Custom Category Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="custom-category"
                type="text"
                placeholder="e.g., Security, Fireworks, Childcare"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                disabled={isSubmitting}
                className="text-xs"
                maxLength={50}
                required
              />
              {fieldErrors.category && (
                <p className="text-[11px] font-medium text-rose-500">
                  {fieldErrors.category[0]}
                </p>
              )}
            </div>
          )}

          {/* Item Name */}
          <div className="space-y-1.5">
            <Label htmlFor="item-name" className="text-xs font-semibold">
              Item Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="item-name"
              type="text"
              placeholder="e.g., Main Hall Deposit, Sound System Rental"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              disabled={isSubmitting}
              className="text-xs"
              maxLength={120}
              required
            />
            {fieldErrors.item_name && (
              <p className="text-[11px] font-medium text-rose-500">
                {fieldErrors.item_name[0]}
              </p>
            )}
          </div>

          {/* Estimated Amount & Actual Amount Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Estimated Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="item-estimated" className="text-xs font-semibold">
                Estimated Cost <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  id="item-estimated"
                  type="number"
                  step="0.01"
                  min="0"
                  max="9999999999.99"
                  placeholder="0.00"
                  value={estimatedAmount}
                  onChange={(e) => setEstimatedAmount(e.target.value)}
                  disabled={isSubmitting}
                  className="pl-8 text-xs font-mono"
                  required
                />
              </div>
              {fieldErrors.estimated_amount && (
                <p className="text-[11px] font-medium text-rose-500">
                  {fieldErrors.estimated_amount[0]}
                </p>
              )}
            </div>

            {/* Actual Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="item-actual" className="text-xs font-semibold">
                Actual Cost Spent
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  id="item-actual"
                  type="number"
                  step="0.01"
                  min="0"
                  max="9999999999.99"
                  placeholder="0.00"
                  value={actualAmount}
                  onChange={(e) => setActualAmount(e.target.value)}
                  disabled={isSubmitting}
                  className="pl-8 text-xs font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Defaults to $0.00 if left blank.
              </p>
              {fieldErrors.actual_amount && (
                <p className="text-[11px] font-medium text-rose-500">
                  {fieldErrors.actual_amount[0]}
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="item-notes" className="text-xs font-semibold">
              Notes &amp; Vendor Details (Optional)
            </Label>
            <Textarea
              id="item-notes"
              placeholder="e.g., Includes 20% deposit due by March 15, invoice #INV-4921"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              className="h-20 text-xs leading-relaxed"
              maxLength={1000}
            />
            {fieldErrors.notes && (
              <p className="text-[11px] font-medium text-rose-500">
                {fieldErrors.notes[0]}
              </p>
            )}
          </div>

          {/* Form Actions */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : isEditing ? (
                <>
                  <Edit2 className="size-3.5" />
                  <span>Update Item</span>
                </>
              ) : (
                <>
                  <Plus className="size-3.5" />
                  <span>Add Item</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
