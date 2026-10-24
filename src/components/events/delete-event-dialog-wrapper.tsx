"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { DeleteEventDialog } from "@/components/events/delete-event-dialog";
import { Trash2 } from "lucide-react";

interface DeleteEventDialogWrapperProps {
  eventId: string;
  eventName: string;
  redirectToDashboard?: boolean;
}

export function DeleteEventDialogWrapper({
  eventId,
  eventName,
  redirectToDashboard = false,
}: DeleteEventDialogWrapperProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-1.5 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/50"
      >
        <Trash2 className="size-3.5" />
        <span>Delete</span>
      </Button>

      <DeleteEventDialog
        eventId={eventId}
        eventName={eventName}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        redirectToDashboard={redirectToDashboard}
      />
    </>
  );
}
