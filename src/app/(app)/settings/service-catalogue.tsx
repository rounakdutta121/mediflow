"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableScroll } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

type ServiceRow = {
  _id: string;
  code: string;
  name: string;
  category: string;
  price: number;
  taxPercent: number;
};

export function ServiceCatalogue({
  initialServices,
  canManage,
}: {
  initialServices: ServiceRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [services, setServices] = useState(initialServices);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    category: "consultation",
    price: "",
    taxPercent: "0",
  });

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code,
        name: form.name,
        category: form.category,
        price: Number(form.price),
        taxPercent: Number(form.taxPercent || 0),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to add service");
      return;
    }
    const created = await res.json();
    setServices((prev) =>
      [...prev, { ...created, _id: String(created._id) }].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    );
    setForm({
      code: "",
      name: "",
      category: "consultation",
      price: "",
      taxPercent: "0",
    });
    toast.success("Service added");
    router.refresh();
  }

  async function updateTax(id: string, taxPercent: number, price: number) {
    const res = await fetch(`/api/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taxPercent, price }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to update service");
      return;
    }
    const updated = await res.json();
    setServices((prev) =>
      prev.map((s) =>
        s._id === id
          ? {
              ...s,
              taxPercent: updated.taxPercent,
              price: updated.price,
            }
          : s
      )
    );
    toast.success("Service updated");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service catalogue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-0">
        {canManage && (
          <form
            onSubmit={onCreate}
            className="grid gap-3 border-b border-[var(--border)] p-4 sm:grid-cols-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="svc-code">Code</Label>
              <Input
                id="svc-code"
                required
                value={form.code}
                onChange={(e) =>
                  setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))
                }
                placeholder="OPD"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-name">Name</Label>
              <Input
                id="svc-name"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="OPD Consultation"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-category">Category</Label>
              <Select
                id="svc-category"
                value={form.category}
                onChange={(e) =>
                  setForm((p) => ({ ...p, category: e.target.value }))
                }
              >
                <option value="consultation">Consultation</option>
                <option value="procedure">Procedure</option>
                <option value="lab">Lab</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-price">Price</Label>
              <Input
                id="svc-price"
                type="number"
                min={0}
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-tax">Tax %</Label>
              <Input
                id="svc-tax"
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={form.taxPercent}
                onChange={(e) =>
                  setForm((p) => ({ ...p, taxPercent: e.target.value }))
                }
                placeholder="e.g. 18"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Adding…" : "Add service"}
              </Button>
            </div>
          </form>
        )}

        <TableScroll className="border-0 shadow-none rounded-none">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Tax %</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <ServiceRowEditor
                key={s._id}
                service={s}
                canManage={canManage}
                onSave={updateTax}
              />
            ))}
            {services.length === 0 && (
              <tr>
                <td
                  colSpan={canManage ? 6 : 5}
                  className="py-8 text-center text-[var(--muted)]"
                >
                  No services yet
                </td>
              </tr>
            )}
          </tbody>
        </TableScroll>
        <p className="px-4 pb-4 text-xs text-[var(--muted)]">
          Tax % on a service is applied by default when that service is added to
          an invoice. You can still override tax on each invoice line.
        </p>
      </CardContent>
    </Card>
  );
}

function ServiceRowEditor({
  service,
  canManage,
  onSave,
}: {
  service: ServiceRow;
  canManage: boolean;
  onSave: (id: string, taxPercent: number, price: number) => Promise<void>;
}) {
  const [price, setPrice] = useState(String(service.price));
  const [taxPercent, setTaxPercent] = useState(String(service.taxPercent ?? 0));
  const [saving, setSaving] = useState(false);

  const dirty =
    Number(price) !== service.price ||
    Number(taxPercent) !== (service.taxPercent ?? 0);

  async function save() {
    setSaving(true);
    await onSave(service._id, Number(taxPercent || 0), Number(price || 0));
    setSaving(false);
  }

  return (
    <tr>
      <td>{service.code}</td>
      <td>{service.name}</td>
      <td className="capitalize">{service.category}</td>
      <td>
        {canManage ? (
          <Input
            type="number"
            min={0}
            step="0.01"
            className="h-8 w-28"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            aria-label={`Price for ${service.name}`}
          />
        ) : (
          formatCurrency(service.price)
        )}
      </td>
      <td>
        {canManage ? (
          <Input
            type="number"
            min={0}
            max={100}
            step="0.01"
            className="h-8 w-20"
            value={taxPercent}
            onChange={(e) => setTaxPercent(e.target.value)}
            aria-label={`Tax percent for ${service.name}`}
          />
        ) : (
          `${service.taxPercent ?? 0}%`
        )}
      </td>
      {canManage && (
        <td>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!dirty || saving}
            onClick={save}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </td>
      )}
    </tr>
  );
}
