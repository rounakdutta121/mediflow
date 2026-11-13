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
  balance: number;
  status: string;
  patientId?: {
    firstName?: string;
    lastName?: string;
    uhid?: string;
  };
};

export function BillingLiveTable({ initialRows }: { initialRows: InvoiceRow[] }) {
  const [rows, setRows] = useState(initialRows);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const reload = useCallback(async () => {
    const res = await fetch("/api/invoices?limit=50", {
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
  }, []);

  useLiveReload(reload);

  return (
    <TableScroll className="border-0 shadow-none rounded-none">
      <thead>
        <tr>
          <th>Invoice</th>
          <th>Patient</th>
          <th>Date</th>
          <th>Total</th>
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
              <td>{formatCurrency(inv.balance)}</td>
              <td>
                <StatusBadge status={inv.status} />
              </td>
              <td>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/billing/${inv._id}`}>Open</Link>
                </Button>
              </td>
            </tr>
          );
        })}
        {rows.length === 0 && (
          <tr>
            <td colSpan={7} className="py-10 text-center text-slate-500">
              No invoices yet
            </td>
          </tr>
        )}
      </tbody>
    </TableScroll>
  );
}
