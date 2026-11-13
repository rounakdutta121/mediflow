import { connectDB } from "@/lib/db";
import { Patient } from "@/models";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasPermission, type Role } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/page-auth";
import { FadeIn } from "@/components/motion/fade-in";
import { PatientsLiveTable } from "./patients-live-table";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requirePagePermission("patients:read");
  const { q } = await searchParams;
  await connectDB();

  const filter: Record<string, unknown> = {
    hospitalId: session.user.hospitalId,
    isActive: true,
  };
  if (q) {
    filter.$or = [
      { firstName: new RegExp(q, "i") },
      { lastName: new RegExp(q, "i") },
      { phone: new RegExp(q, "i") },
      { uhid: new RegExp(q, "i") },
    ];
  }

  const patients = await Patient.find(filter).sort({ createdAt: -1 }).limit(50).lean();
  const canWrite = hasPermission(session.user.role as Role, "patients:write");

  const rows = patients.map((p) => ({
    _id: String(p._id),
    uhid: p.uhid,
    firstName: p.firstName,
    lastName: p.lastName,
    phone: p.phone,
    gender: p.gender,
    createdAt: p.createdAt,
  }));

  return (
    <FadeIn>
      <PageHeader
        title="Patients"
        description="Registration, UHID and patient CRM profiles"
        action={
          canWrite
            ? { href: "/patients/new", label: "Register patient" }
            : undefined
        }
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <form className="flex flex-col gap-2 sm:flex-row">
            <Input
              name="q"
              defaultValue={q}
              placeholder="Search by name, phone or UHID"
              className="flex-1"
            />
            <Button type="submit" variant="outline" className="sm:w-auto">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      <PatientsLiveTable initialRows={rows} q={q} />
    </FadeIn>
  );
}
