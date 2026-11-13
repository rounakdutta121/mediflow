import { connectDB } from "@/lib/db";
import { Hospital, Service } from "@/models";
import { PageHeader } from "@/components/page-header";
import { hasPermission, type Role } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/page-auth";
import { HospitalSettingsForm } from "./hospital-settings-form";
import { ServiceCatalogue } from "./service-catalogue";

export default async function SettingsPage() {
  const session = await requirePagePermission("settings:manage");
  await connectDB();

  const hospital = await Hospital.findById(session.user.hospitalId).lean();
  const services = await Service.find({
    hospitalId: session.user.hospitalId,
    isActive: true,
  })
    .sort({ name: 1 })
    .lean();

  if (!hospital) {
    return (
      <div>
        <PageHeader title="Settings" description="Hospital not found" />
      </div>
    );
  }

  const canManageServices = hasPermission(
    session.user.role as Role,
    "billing:write"
  );

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Hospital configuration and service catalogue (price + tax %)"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <HospitalSettingsForm
          hospital={{
            name: hospital.name,
            code: hospital.code,
            address: hospital.address,
            phone: hospital.phone,
            email: hospital.email,
            timezone: hospital.timezone,
            currency: hospital.currency,
          }}
        />

        <ServiceCatalogue
          canManage={canManageServices}
          initialServices={services.map((s) => ({
            _id: String(s._id),
            code: s.code,
            name: s.name,
            category: s.category,
            price: s.price,
            taxPercent: s.taxPercent ?? 0,
          }))}
        />
      </div>
    </div>
  );
}
