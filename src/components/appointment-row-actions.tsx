"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";

export function AppointmentRowActions({
  id,
  canDelete,
}: {
  id: string;
  canDelete: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button asChild size="sm" variant="ghost">
        <Link href="/queue">Queue</Link>
      </Button>
      {canDelete && (
        <DeleteButton
          endpoint={`/api/appointments/${id}`}
          label=""
          confirmMessage="Remove this appointment from the board? It will stay in Hospital records."
          variant="ghost"
        />
      )}
    </div>
  );
}
