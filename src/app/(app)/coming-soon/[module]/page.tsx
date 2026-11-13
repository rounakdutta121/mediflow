import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

const titles: Record<string, string> = {
  admission: "Admission & Beds",
  laboratory: "Laboratory",
  pharmacy: "Pharmacy",
  insurance: "Insurance / TPA",
  nursing: "Nursing",
};

export default async function ComingSoonPage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const title = titles[module] || "Module";

  return (
    <div>
      <PageHeader
        title={title}
        description="Planned for a later MediFlow delivery phase"
      />
      <Card>
        <CardContent className="p-8 text-sm text-slate-600">
          This module is intentionally scaffolded as a navigation shell for Phase 1.
          Full workflows will ship in subsequent phases after the MVP foundation is
          stable in production.
        </CardContent>
      </Card>
    </div>
  );
}
