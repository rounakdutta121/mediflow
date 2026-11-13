import { connectDB } from "@/lib/db";
import { AuditLog } from "@/models";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TableScroll } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { requirePagePermission } from "@/lib/page-auth";

export default async function AuditPage() {
  const session = await requirePagePermission("audit:view");
  await connectDB();

  const logs = await AuditLog.find({
    hospitalId: session.user.hospitalId,
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Tamper-evident trail of sensitive create/update/access actions"
      />
      <Card>
        <CardContent className="p-0">
          <TableScroll className="border-0 shadow-none rounded-none">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Resource</th>
                <th>ID</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={String(log._id)}>
                  <td>{formatDateTime(log.createdAt)}</td>
                  <td>{log.actorEmail || "system"}</td>
                  <td>{log.action}</td>
                  <td>{log.resource}</td>
                  <td className="font-mono text-xs">{log.resourceId || "—"}</td>
                  <td>
                    <Badge variant={log.success ? "success" : "danger"}>
                      {log.success ? "ok" : "fail"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No audit events yet
                  </td>
                </tr>
              )}
            </tbody>
          </TableScroll>
        </CardContent>
      </Card>
    </div>
  );
}
