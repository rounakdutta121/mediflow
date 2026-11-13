import { connectDB } from "@/lib/db";
import { Department, User } from "@/models";
import { PageHeader } from "@/components/page-header";
import { hasPermission, type Role } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/page-auth";
import { DepartmentCreateForm } from "./department-create-form";
import { DepartmentCard } from "./department-card";
import mongoose from "mongoose";

export default async function DepartmentsPage() {
  const session = await requirePagePermission("departments:read");
  await connectDB();

  const hospitalObjectId = new mongoose.Types.ObjectId(session.user.hospitalId);

  const [departments, doctorCounts] = await Promise.all([
    Department.find({
      hospitalId: hospitalObjectId,
      isActive: true,
    })
      .sort({ name: 1 })
      .lean(),
    User.aggregate([
      {
        $match: {
          hospitalId: hospitalObjectId,
          role: "DOCTOR",
          isActive: true,
        },
      },
      { $group: { _id: "$departmentId", count: { $sum: 1 } } },
    ]),
  ]);

  const countMap = Object.fromEntries(
    doctorCounts.map((c: { _id: { toString(): string } | null; count: number }) => [
      c._id?.toString() || "none",
      c.count,
    ])
  );

  const canWrite = hasPermission(session.user.role as Role, "departments:write");

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Hospital departments and service lines"
      />

      {canWrite && <DepartmentCreateForm />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {departments.map((d) => (
          <DepartmentCard
            key={String(d._id)}
            canWrite={canWrite}
            doctorCount={countMap[String(d._id)] || 0}
            department={{
              _id: String(d._id),
              name: d.name,
              code: d.code,
              description: d.description,
            }}
          />
        ))}
      </div>
    </div>
  );
}
