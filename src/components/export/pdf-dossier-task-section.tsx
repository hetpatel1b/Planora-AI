import * as React from "react";
import type { TaskRow } from "@/lib/validations/task";
import { formatStatusLabel, isTaskOverdue } from "@/lib/date-utils";
import { PriorityBadge } from "@/components/shared/priority-badge";

export interface PdfDossierTaskSectionProps {
  tasks: TaskRow[];
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  referenceMs: number;
}

export function PdfDossierTaskSection({
  tasks,
  totalTasks,
  completedTasks,
  pendingTasks,
  overdueTasks,
  referenceMs,
}: PdfDossierTaskSectionProps) {
  return (
    <section className="mt-8 border-b border-slate-200 pb-8 break-inside-avoid">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-950">
          Timeline Checklist &amp; Deliverables
        </h2>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span>Total: <strong>{totalTasks}</strong></span>
          <span>•</span>
          <span className="text-emerald-700">Completed: <strong>{completedTasks}</strong></span>
          <span>•</span>
          <span>Pending: <strong>{pendingTasks}</strong></span>
          {overdueTasks > 0 && (
            <>
              <span>•</span>
              <span className="text-rose-600 font-bold">Overdue: {overdueTasks}</span>
            </>
          )}
        </div>
      </div>

      {tasks.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs" aria-label="Event Checklist Tasks">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="py-2 px-3 w-28">Status</th>
                <th scope="col" className="py-2 px-3">Task Title &amp; Description</th>
                <th scope="col" className="py-2 px-3 w-28">Due Date</th>
                <th scope="col" className="py-2 px-3 w-24">Priority</th>
                <th scope="col" className="py-2 px-3 w-28">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map((task) => {
                const isOverdue = isTaskOverdue(task.due_date, task.status, referenceMs);

                return (
                  <tr key={task.id} className="break-inside-avoid">
                    <td className="py-2 px-3 align-top">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          task.status === "completed"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : task.status === "in_progress"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {formatStatusLabel(task.status)}
                      </span>
                    </td>
                    <td className="py-2 px-3 align-top">
                      <p className={`font-semibold ${task.status === "completed" ? "line-through text-slate-400" : "text-slate-900"}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed break-words whitespace-pre-wrap">
                          {task.description}
                        </p>
                      )}
                    </td>
                    <td className="py-2 px-3 align-top whitespace-nowrap">
                      {task.due_date ? (
                        <span className={isOverdue ? "font-bold text-rose-600" : "text-slate-700"}>
                          {task.due_date.split("T")[0]}
                          {isOverdue && " (Overdue)"}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 align-top">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="py-2 px-3 align-top whitespace-nowrap">
                      {task.is_vendor_checklist ? (
                        <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 border border-purple-200">
                          Vendor Item
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">General</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
          No checklist tasks recorded for this event.
        </div>
      )}
    </section>
  );
}

