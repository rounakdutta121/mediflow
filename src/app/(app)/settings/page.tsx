import { connectDB } from "@/lib/db";
import { Hospital, Service } from "@/models";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableScroll } from "@/components/ui/data-table";
import { formatCurrency } from "@/lib/utils";
import { requirePagePermission } from "@/lib/page-auth";
import { HospitalSettingsForm } from "./hospital-settings-form";

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

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Hospital configuration and service catalogue"
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

        <Card>
          <CardHeader>
            <CardTitle>Service catalogue</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <TableScroll className="border-0 shadow-none rounded-none">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={String(s._id)}>
                    <td>{s.code}</td>
                    <td>{s.name}</td>
                    <td className="capitalize">{s.category}</td>
                    <td>{formatCurrency(s.price)}</td>
                  </tr>
                ))}
              </tbody>
            </TableScroll>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
