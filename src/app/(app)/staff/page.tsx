import { connectDB } from "@/lib/db";
import { User } from "@/models";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TableScroll } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { hasPermission, type Role } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/page-auth";
import { StaffCreateForm } from "./staff-create-form";
import { StaffRowActions } from "./staff-row-actions";

export default async function StaffPage() {
  const session = await requirePagePermission("staff:read");
  await connectDB();

  const staff = await User.find({
    hospitalId: session.user.hospitalId,
    isActive: true,
  })
    .select("-passwordHash")
    .populate("departmentId", "name")
    .sort({ role: 1, name: 1 })
    .lean();

  const canWrite = hasPermission(session.user.role as Role, "staff:write");

  return (
    <div>
      <PageHeader
        title="Doctors & Staff"
        description="Workforce directory, roles and clinician profiles"
      />

      {canWrite && <StaffCreateForm />}

      <Card>
        <CardContent className="p-0">
          <TableScroll className="border-0 shadow-none rounded-none">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Email</th>
                <th>Code</th>
                {canWrite && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {staff.map((u) => {
                const dept = u.departmentId as unknown as
                  | { _id?: string; name?: string }
                  | null
                  | undefined;
                return (
                  <tr key={String(u._id)}>
                    <td>
                      <div className="font-medium">{u.name}</div>
                      {u.specialization && (
                        <div className="text-xs text-slate-500">
                          {u.specialization}
                        </div>
                      )}
                    </td>
                    <td>
                      <Badge variant="brand">
                        {u.role.replaceAll("_", " ")}
                      </Badge>
                    </td>
                    <td>{dept?.name || "—"}</td>
                    <td>{u.email}</td>
                    <td>{u.employeeCode || "—"}</td>
                    {canWrite && (
                      <td>
                        <StaffRowActions
                          canWrite={canWrite}
                          isSelf={String(u._id) === session!.user.id}
                          staff={{
                            _id: String(u._id),
                            name: u.name,
                            email: u.email,
                            role: u.role,
                            employeeCode: u.employeeCode,
                            specialization: u.specialization,
                            qualification: u.qualification,
                            phone: u.phone,
                            departmentId: dept?._id
                              ? String(dept._id)
                              : undefined,
                          }}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </TableScroll>
        </CardContent>
      </Card>
    </div>
  );
}
