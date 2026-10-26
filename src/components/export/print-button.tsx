"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { generateExportFilename } from "@/lib/export-csv";
import { Printer, Loader2 } from "lucide-react";

export interface PrintButtonProps {
  eventName: string;
  className?: string;
}

export function PrintButton({ eventName, className }: PrintButtonProps) {
  const [isPrinting, setIsPrinting] = React.useState(false);

  const handlePrint = () => {
    setIsPrinting(true);

    try {
      // Suggest clean document filename for browsers supporting Save as PDF default naming
      const originalTitle = document.title;
      const pdfFilename = generateExportFilename(eventName, "tasks", "pdf").replace(
        "-tasks-",
        "-brief-"
      );

      document.title = pdfFilename.replace(/\.pdf$/i, "");

      // Trigger native browser print dialog
      window.print();

      // Reset document title after a short delay so tab title isn't permanently altered
      setTimeout(() => {
        document.title = originalTitle;
        setIsPrinting(false);
      }, 1000);
    } catch {
      setIsPrinting(false);
    }
  };

  return (
    <Button
      type="button"
      id="print-pdf-button"
      size="sm"
      aria-label={`Print or save event dossier for ${eventName} as PDF`}
      onClick={handlePrint}
      disabled={isPrinting}
      className={`gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs text-xs font-semibold print:hidden ${
        className ?? ""
      }`}
    >
      {isPrinting ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Printer className="size-3.5" />
      )}
      <span>Print / Save as PDF</span>
    </Button>
  );
}
