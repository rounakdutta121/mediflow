import Link from "next/link";
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
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await requirePagePermission("patients:read");
  const { q, status: rawStatus } = await searchParams;
  await connectDB();

  const status = rawStatus === "archived" || rawStatus === "all" ? rawStatus : "active";
  const filter: Record<string, unknown> = {
    hospitalId: session.user.hospitalId,
  };
  if (status === "active") filter.isActive = true;
  else if (status === "archived") filter.isActive = false;

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
    gender: p.gender || "unknown",
    createdAt: new Date(p.createdAt).toISOString(),
    isActive: p.isActive !== false,
  }));

  return (
    <FadeIn>
      <PageHeader
        title="Patients"
        description="Registration, UHID and patient CRM profiles — archive keeps history"
        action={
          canWrite
            ? { href: "/patients/new", label: "Register patient" }
            : undefined
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <form className="flex flex-1 flex-col gap-2 sm:flex-row">
            <Input
              name="q"
              defaultValue={q}
              placeholder="Search by name, phone or UHID"
              className="flex-1"
            />
            <select
              name="status"
              defaultValue={status}
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
            <Button type="submit" variant="outline" className="sm:w-auto">
              Search
            </Button>
          </form>
          <Button asChild size="sm" variant="outline">
            <Link href="/records?tab=patients">Full patient history</Link>
          </Button>
        </CardContent>
      </Card>

      <PatientsLiveTable initialRows={rows} q={q} status={status} />
    </FadeIn>
  );
}
