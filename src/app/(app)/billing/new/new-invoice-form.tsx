"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
import { useLiveReload } from "@/hooks/use-live-reload";

type Service = {
  _id: string;
  name: string;
  code: string;
  price: number;
  taxPercent: number;
};

type LineItem = {
  serviceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
};

export function NewInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<
    { _id: string; uhid: string; firstName: string; lastName: string }[]
  >([]);
  const [patientId, setPatientId] = useState(
    searchParams.get("patientId") || ""
  );
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState("");
  const [taxPercent, setTaxPercent] = useState("0");
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedService = services.find((s) => s._id === serviceId);

  const loadCatalogs = useCallback(() => {
    Promise.all([
      fetch("/api/patients?limit=100").then((r) => r.json()),
      fetch("/api/services").then((r) => r.json()),
    ]).then(([p, s]) => {
      const itemsList = p.items || [];
      setPatients(itemsList);
      setServices(s.items || []);
      setServiceId((prev) => {
        const next =
          prev && (s.items || []).some((item: Service) => item._id === prev)
            ? prev
            : s.items?.[0]?._id || "";
        const svc = (s.items || []).find((item: Service) => item._id === next);
        if (svc) {
          setUnitPrice(String(svc.price));
          setTaxPercent(String(svc.taxPercent ?? 0));
        }
        return next;
      });
      const fromQuery = searchParams.get("patientId") || "";
      if (
        fromQuery &&
        itemsList.some((item: { _id: string }) => item._id === fromQuery)
      ) {
        setPatientId(fromQuery);
      }
    });
  }, [searchParams]);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  useLiveReload(loadCatalogs);

  useEffect(() => {
    if (!selectedService) return;
    setUnitPrice(String(selectedService.price));
    setTaxPercent(String(selectedService.taxPercent ?? 0));
  }, [selectedService]);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, i) => sum + i.quantity * i.unitPrice,
      0
    );
    const taxTotal = items.reduce(
      (sum, i) => sum + i.quantity * i.unitPrice * (i.taxPercent / 100),
      0
    );
    const total = Math.max(0, subtotal + taxTotal - discount);
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }, [items, discount]);

  function addItem() {
    const service = services.find((s) => s._id === serviceId);
    if (!service) return;
    const price = Number(unitPrice);
    const tax = Number(taxPercent || 0);
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Enter a valid unit price");
      return;
    }
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
      toast.error("Tax % must be between 0 and 100");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        serviceId: service._id,
        description: service.name,
        quantity: Math.max(1, quantity || 1),
        unitPrice: price,
        taxPercent: tax,
      },
    ]);
  }

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
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
        patientId,
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
      <PageHeader
        title="Create invoice"
        description="Bill OPD and service charges — set tax % per line or use the service default"
      />
      <Card>
        <CardContent className="space-y-6 p-6">
          <form
            id="invoice-form"
            onSubmit={onSubmit}
            className="grid gap-4 md:grid-cols-2"
          >
            <div className="space-y-2 md:col-span-2">
              <Label>Patient</Label>
              <Select
                name="patientId"
                required
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
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
            <div className="mb-3 grid gap-3 md:grid-cols-6">
              <div className="md:col-span-2">
                <Label>Service</Label>
                <Select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                >
                  {services.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.code} — {s.name} ({formatCurrency(s.price)}
                      {s.taxPercent ? ` · ${s.taxPercent}% tax` : ""})
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
              <div>
                <Label>Unit price</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                />
              </div>
              <div>
                <Label>Tax %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="outline" onClick={addItem}>
                  Add item
                </Button>
              </div>
            </div>

            <TableScroll maxHeight={320}>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Tax %</th>
                  <th>Line total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const line =
                    item.quantity *
                    item.unitPrice *
                    (1 + item.taxPercent / 100);
                  return (
                    <tr key={idx}>
                      <td>{item.description}</td>
                      <td>
                        <Input
                          type="number"
                          min={1}
                          className="h-8 w-20"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(idx, {
                              quantity: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="h-8 w-28"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(idx, {
                              unitPrice: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          className="h-8 w-24"
                          value={item.taxPercent}
                          onChange={(e) =>
                            updateItem(idx, {
                              taxPercent: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </td>
                      <td>{formatCurrency(line)}</td>
                      <td>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setItems((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-[var(--muted)]"
                    >
                      Add services with price and tax % to build the invoice
                    </td>
                  </tr>
                )}
              </tbody>
            </TableScroll>
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-end gap-8">
                <span className="text-[var(--muted)]">Subtotal</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-end gap-8">
                <span className="text-[var(--muted)]">Tax</span>
                <span>{formatCurrency(totals.taxTotal)}</span>
              </div>
              <div className="flex justify-end gap-8">
                <span className="text-[var(--muted)]">Discount</span>
                <span>{formatCurrency(discount)}</span>
              </div>
              <p className="text-right text-lg font-semibold">
                Total: {formatCurrency(totals.total)}
              </p>
            </div>
          </div>

          <Button form="invoice-form" type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create invoice"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
