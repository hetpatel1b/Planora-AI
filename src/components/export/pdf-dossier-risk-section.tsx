import * as React from "react";
import type { evaluateEventRisks } from "@/lib/risk-engine";
import { ShieldCheck } from "lucide-react";

export interface PdfDossierRiskSectionProps {
  riskAssessment: ReturnType<typeof evaluateEventRisks>;
}

export function PdfDossierRiskSection({
  riskAssessment,
}: PdfDossierRiskSectionProps) {
  return (
    <section className="mt-8 border-b border-slate-200 pb-8 break-inside-avoid">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-indigo-600 print:text-slate-700" />
          <h2 className="text-base font-bold text-slate-950">
            Real-Time Event Risk Radar Findings
          </h2>
        </div>
        <div className="text-[11px] text-slate-500">
          Overall Status: <strong className="capitalize">{riskAssessment.overallRiskLevel}</strong>
        </div>
      </div>

      <p className="mt-1 text-[11px] text-slate-500">
        Automated health assessment dynamically evaluated from authoritative timeline, budget, and blueprint records.
      </p>

      {riskAssessment.risks.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-2 px-3 w-24">Severity</th>
                <th className="py-2 px-3 w-28">Category</th>
                <th className="py-2 px-3">Risk Finding &amp; Evidence</th>
                <th className="py-2 px-3 w-1/3">Recommended Mitigation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {riskAssessment.risks.map((risk) => (
                <tr key={risk.id} className="break-inside-avoid">
                  <td className="py-2 px-3 align-top">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        risk.severity === "critical"
                          ? "bg-rose-100 text-rose-800 border border-rose-300"
                          : risk.severity === "high"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {risk.severity}
                    </span>
                  </td>
                  <td className="py-2 px-3 align-top font-medium text-slate-600 capitalize">
                    {risk.category.replace(/_/g, " ")}
                  </td>
                  <td className="py-2 px-3 align-top">
                    <p className="font-bold text-slate-950">{risk.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-600 leading-relaxed">
                      {risk.explanation}
                    </p>
                  </td>
                  <td className="py-2 px-3 align-top text-[11px] text-slate-700 leading-relaxed">
                    {risk.suggestedMitigation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-center text-xs text-emerald-800 print:bg-white print:border-slate-200 print:text-slate-700">
          <ShieldCheck className="mx-auto size-5 text-emerald-600 print:text-slate-600 mb-1" />
          <p className="font-bold">Event Plan Healthy</p>
          <p className="mt-0.5 text-[11px]">
            No critical or elevated risks detected across authoritative budget allocations, timeline deadlines, or checklists.
          </p>
        </div>
      )}
    </section>
  );
}

