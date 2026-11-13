"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TableScroll } from "@/components/ui/data-table";
import { formatCurrency } from "@/lib/utils";

type Service = {
  _id: string;
  name: string;
  code: string;
  price: number;
  taxPercent: number;
};

export function NewInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<
    { _id: string; uhid: string; firstName: string; lastName: string }[]
  >([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState<
    {
      serviceId: string;
      description: string;
      quantity: number;
      unitPrice: number;
      taxPercent: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/patients?limit=100").then((r) => r.json()),
      fetch("/api/services").then((r) => r.json()),
    ]).then(([p, s]) => {
      setPatients(p.items || []);
      setServices(s.items || []);
      if (s.items?.[0]) setServiceId(s.items[0]._id);
    });
  }, []);

  const total = useMemo(() => {
    const sub = items.reduce(
      (sum, i) => sum + i.quantity * i.unitPrice * (1 + i.taxPercent / 100),
      0
    );
    return Math.max(0, sub - discount);
  }, [items, discount]);

  function addItem() {
    const service = services.find((s) => s._id === serviceId);
    if (!service) return;
    setItems((prev) => [
      ...prev,
      {
        serviceId: service._id,
        description: service.name,
        quantity,
        unitPrice: service.price,
        taxPercent: service.taxPercent,
      },
    ]);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!items.length) {
      toast.error("Add at least one line item");
      return;
    }
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: form.get("patientId"),
        discount,
        items,
        notes: form.get("notes"),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to create invoice");
      return;
    }
    const invoice = await res.json();
    toast.success(`Invoice ${invoice.invoiceNumber} created`);
    router.push(`/billing/${invoice._id}`);
  }

  return (
    <div>
      <PageHeader title="Create invoice" description="Bill OPD and service charges" />
      <Card>
        <CardContent className="space-y-6 p-6">
          <form id="invoice-form" onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Patient</Label>
              <Select
                name="patientId"
                required
                defaultValue={searchParams.get("patientId") || ""}
              >
                <option value="">Select patient</option>
                {patients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.uhid} — {p.firstName} {p.lastName}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Discount</Label>
              <Input
                type="number"
                min={0}
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input name="notes" />
            </div>
          </form>

          <div className="rounded-lg border border-[var(--border)] p-4">
            <div className="mb-3 grid gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label>Service</Label>
                <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                  {services.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.code} — {s.name} ({formatCurrency(s.price)})
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Qty</Label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="outline" onClick={addItem}>
                  Add item
                </Button>
              </div>
            </div>

            <TableScroll maxHeight={280}>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Tax %</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.unitPrice)}</td>
                    <td>{item.taxPercent}</td>
                    <td>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setItems((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableScroll>
            <p className="mt-4 text-right text-lg font-semibold">
              Total: {formatCurrency(total)}
            </p>
          </div>

          <Button form="invoice-form" type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create invoice"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
