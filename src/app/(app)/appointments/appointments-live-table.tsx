"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TableScroll } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/utils";
import { AppointmentRowActions } from "@/components/appointment-row-actions";
import { useLiveReload } from "@/hooks/use-live-reload";

type AppointmentRow = {
  _id: string;
  scheduledAt: string;
  status: string;
  tokenNumber?: number;
  patientId?: {
    _id?: string;
    uhid?: string;
    firstName?: string;
    lastName?: string;
  };
  doctorId?: { name?: string };
  departmentId?: { name?: string };
};

export function AppointmentsLiveTable({
  initialRows,
  date,
  status,
  canDelete,
  history = false,
}: {
  initialRows: AppointmentRow[];
  date: string;
  status?: string;
  canDelete: boolean;
  history?: boolean;
}) {
  const [rows, setRows] = useState(initialRows);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const reload = useCallback(async () => {
    const params = new URLSearchParams({ limit: history ? "100" : "100" });
    if (history) params.set("view", "history");
    else if (date) params.set("date", date);
    if (status) params.set("status", status);
    const res = await fetch(`/api/appointments?${params.toString()}`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!res.ok) return;
    const data = await res.json();
    setRows(
      (data.items || []).map((a: AppointmentRow) => ({
        ...a,
        _id: String(a._id),
      }))
    );
  }, [date, status, history]);

  useLiveReload(reload);

  return (
    <TableScroll className="border-0 shadow-none rounded-none">
      <thead>
        <tr>
          <th>Time</th>
          <th>Patient</th>
          <th>Doctor</th>
          <th>Department</th>
          <th>Token</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((a) => {
          const patient = a.patientId;
          const doctor = a.doctorId;
          const dept = a.departmentId;
          return (
            <tr key={a._id}>
              <td>{formatDateTime(a.scheduledAt)}</td>
              <td>
                <Link
                  href={`/patients/${patient?._id}`}
                  className="font-medium text-[var(--brand-teal)] hover:underline"
                >
                  {patient?.firstName} {patient?.lastName}
                </Link>
                <div className="text-xs text-slate-500">{patient?.uhid}</div>
              </td>
              <td>{doctor?.name}</td>
              <td>{dept?.name}</td>
              <td>{a.tokenNumber ?? "—"}</td>
              <td>
                <StatusBadge status={a.status} />
              </td>
              <td>
                <AppointmentRowActions id={a._id} canDelete={canDelete} />
              </td>
            </tr>
          );
        })}
        {rows.length === 0 && (
          <tr>
            <td colSpan={7} className="py-10 text-center text-slate-500">
              No appointments for this day
            </td>
          </tr>
        )}
      </tbody>
    </TableScroll>
  );
}
