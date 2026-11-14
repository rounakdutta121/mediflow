"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TableScroll } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useLiveReload } from "@/hooks/use-live-reload";

type InvoiceRow = {
  _id: string;
  invoiceNumber: string;
  createdAt: string;
  total: number;
  amountPaid?: number;
  balance: number;
  status: string;
  patientId?: {
    firstName?: string;
    lastName?: string;
    uhid?: string;
  };
};

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "issued", label: "Issued" },
  { id: "partially_paid", label: "Partially paid" },
  { id: "paid", label: "Paid" },
  { id: "cancelled", label: "Cancelled" },
];

export function BillingLiveTable({
  initialRows,
  initialStatus = "all",
}: {
  initialRows: InvoiceRow[];
  initialStatus?: string;
}) {
  const [rows, setRows] = useState(initialRows);
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const reload = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100" });
    if (status !== "all") params.set("status", status);
    const res = await fetch(`/api/invoices?${params.toString()}`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!res.ok) return;
    const data = await res.json();
    setRows(
      (data.items || []).map((inv: InvoiceRow) => ({
        ...inv,
        _id: String(inv._id),
      }))
    );
  }, [status]);

  useEffect(() => {
    reload();
  }, [reload]);

  useLiveReload(reload);

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] p-3">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.id}
            type="button"
            size="sm"
            variant={status === f.id ? "default" : "outline"}
            onClick={() => setStatus(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>
      <TableScroll className="border-0 shadow-none rounded-none">
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Patient</th>
            <th>Date</th>
            <th>Total</th>
            <th>Paid</th>
            <th>Balance</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((inv) => {
            const patient = inv.patientId;
            return (
              <tr key={inv._id}>
                <td className="font-medium">{inv.invoiceNumber}</td>
                <td>
                  {patient?.firstName} {patient?.lastName}
                  <div className="text-xs text-slate-500">{patient?.uhid}</div>
                </td>
                <td>{formatDate(inv.createdAt)}</td>
                <td>{formatCurrency(inv.total)}</td>
                <td>{formatCurrency(inv.amountPaid || 0)}</td>
                <td>{formatCurrency(inv.balance)}</td>
                <td>
                  <StatusBadge status={inv.status} />
                </td>
                <td>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/billing/${inv._id}`}>View / print</Link>
                  </Button>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="py-10 text-center text-slate-500">
                No invoices for this filter
              </td>
            </tr>
          )}
        </tbody>
      </TableScroll>
    </div>
  );
}
