import Link from "next/link";
import { connectDB } from "@/lib/db";
import { Bed, Ward } from "@/models";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePagePermission } from "@/lib/page-auth";
import { BedsManager } from "./beds-manager";
import { ArrowLeft } from "lucide-react";

export default async function BedsManagePage() {
  const session = await requirePagePermission("beds:manage");
  await connectDB();

  const hospitalId = session.user.hospitalId;
  const [wards, beds] = await Promise.all([
    Ward.find({ hospitalId, isActive: true }).sort({ name: 1 }).lean(),
    Bed.find({ hospitalId, isActive: true })
      .populate("wardId", "name code")
      .sort({ bedNumber: 1 })
      .lean(),
  ]);

  return (
    <div>
      <div className="mb-4 space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/admissions">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to admissions
          </Link>
        </Button>
        <PageHeader
          title="Manage wards & beds"
          description="Add, edit, or remove IPD capacity — Admin and Nurse only"
        />
      </div>

      <BedsManager
        initialWards={wards.map((w) => ({
          _id: String(w._id),
          name: w.name,
          code: w.code,
          floor: w.floor || "",
          genderPolicy: w.genderPolicy,
        }))}
        initialBeds={beds.map((b) => {
          const ward = b.wardId as unknown as {
            _id?: unknown;
            name?: string;
            code?: string;
          } | null;
          return {
            _id: String(b._id),
            bedNumber: b.bedNumber,
            bedType: b.bedType,
            status: b.status,
            wardId: {
              _id: ward?._id ? String(ward._id) : String(b.wardId),
              name: ward?.name || "",
              code: ward?.code || "",
            },
          };
        })}
      />
    </div>
  );
}
