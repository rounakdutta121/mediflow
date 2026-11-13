"use client";

import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, X } from "lucide-react";
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

const emptyForm = {
  code: "",
  name: "",
  category: "consultation",
  price: "",
  taxPercent: "0",
};

export function ServiceCatalogue({
  initialServices,
  canManage,
  hospitalPanel,
}: {
  initialServices: ServiceRow[];
  canManage: boolean;
  hospitalPanel: ReactNode;
}) {
  const router = useRouter();
  const [services, setServices] = useState(initialServices);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);

  function startEdit(service: ServiceRow) {
    setEditingId(service._id);
    setForm({
      code: service.code,
      name: service.name,
      category: service.category,
      price: String(service.price),
      taxPercent: String(service.taxPercent ?? 0),
    });
    document.getElementById("service-form-card")?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setLoading(true);

    const payload = {
      code: form.code,
      name: form.name,
      category: form.category,
      price: Number(form.price),
      taxPercent: Number(form.taxPercent || 0),
    };

    const res = await fetch(
      editingId ? `/api/services/${editingId}` : "/api/services",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(
        data.error ||
          (editingId ? "Failed to update service" : "Failed to add service")
      );
      return;
    }

    const saved = await res.json();
    const row: ServiceRow = {
      _id: String(saved._id),
      code: saved.code,
      name: saved.name,
      category: saved.category,
      price: saved.price,
      taxPercent: saved.taxPercent ?? 0,
    };

    setServices((prev) => {
      const next = editingId
        ? prev.map((s) => (s._id === editingId ? row : s))
        : [...prev, row];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });

    toast.success(editingId ? "Service updated" : "Service added");
    cancelEdit();
    router.refresh();
  }

  async function onDelete(service: ServiceRow) {
    if (!canManage) return;
    if (
      !confirm(
        `Remove ${service.name} (${service.code}) from the service catalogue?`
      )
    ) {
      return;
    }

    const res = await fetch(`/api/services/${service._id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to delete service");
      return;
    }

    setServices((prev) => prev.filter((s) => s._id !== service._id));
    if (editingId === service._id) cancelEdit();
    toast.success("Service removed");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {hospitalPanel}

        {canManage ? (
          <Card id="service-form-card" className="min-w-0 flex-1">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle>
                  {editingId ? "Edit service" : "Add service"}
                </CardTitle>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Defaults for invoice lines — tax can still be overridden per
                  bill
                </p>
              </div>
              {editingId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Cancel edit"
                  onClick={cancelEdit}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="svc-code">Code</Label>
                  <Input
                    id="svc-code"
                    required
                    value={form.code}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        code: e.target.value.toUpperCase(),
                      }))
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
                    onChange={(e) =>
                      setForm((p) => ({ ...p, name: e.target.value }))
                    }
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
                    onChange={(e) =>
                      setForm((p) => ({ ...p, price: e.target.value }))
                    }
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
                <div className="flex items-end gap-2">
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading
                      ? editingId
                        ? "Saving…"
                        : "Adding…"
                      : editingId
                        ? "Save changes"
                        : "Add service"}
                  </Button>
                  {editingId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelEdit}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="min-w-0 flex-1">
            <CardHeader>
              <CardTitle>Service catalogue</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[var(--muted)]">
              You can view services below. Ask an admin to add or edit the
              catalogue.
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All services</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TableScroll className="border-0 shadow-none rounded-none">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Tax %</th>
                {canManage && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr
                  key={s._id}
                  className={
                    editingId === s._id
                      ? "bg-[color-mix(in_oklab,var(--brand)_10%,transparent)]"
                      : undefined
                  }
                >
                  <td className="font-medium">{s.code}</td>
                  <td>{s.name}</td>
                  <td className="capitalize">{s.category}</td>
                  <td>{formatCurrency(s.price)}</td>
                  <td>{s.taxPercent ?? 0}%</td>
                  {canManage && (
                    <td>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={`Edit ${s.name}`}
                          onClick={() => startEdit(s)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={`Delete ${s.name}`}
                          onClick={() => onDelete(s)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
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
          <p className="px-4 py-3 text-xs text-[var(--muted)]">
            Tax % on a service is applied by default when that service is added
            to an invoice. You can still override tax on each invoice line.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
