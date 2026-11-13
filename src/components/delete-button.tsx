"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteButton({
  endpoint,
  label = "Delete",
  confirmMessage = "Are you sure? This permanently deletes related records.",
  redirectTo,
  variant = "outline",
  size = "sm",
}: {
  endpoint: string;
  label?: string;
  confirmMessage?: string;
  redirectTo?: string;
  variant?: "outline" | "danger" | "ghost";
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (!confirm(confirmMessage)) return;
    setLoading(true);
    const res = await fetch(endpoint, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Delete failed");
      return;
    }
    toast.success("Deleted");
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={loading}
      onClick={onDelete}
    >
      <Trash2 className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
