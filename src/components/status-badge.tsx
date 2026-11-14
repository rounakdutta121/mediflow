import { Badge } from "@/components/ui/badge";

const map: Record<string, "default" | "success" | "warning" | "danger" | "info" | "brand"> = {
  scheduled: "info",
  confirmed: "brand",
  checked_in: "warning",
  in_consultation: "warning",
  completed: "success",
  cancelled: "danger",
  no_show: "danger",
  open: "warning",
  signed: "success",
  amended: "info",
  draft: "default",
  issued: "info",
  partially_paid: "warning",
  paid: "success",
  admitted: "brand",
  discharged: "success",
  transferred: "info",
  available: "success",
  occupied: "warning",
  maintenance: "danger",
  reserved: "info",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={map[status] || "default"}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
