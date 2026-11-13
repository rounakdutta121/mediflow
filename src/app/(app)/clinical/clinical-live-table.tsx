"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TableScroll } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/utils";
import { useLiveReload } from "@/hooks/use-live-reload";

type EncounterRow = {
  _id: string;
  createdAt: string;
  chiefComplaint?: string;
  status: string;
  patientId?: {
    _id?: string;
    uhid?: string;
    firstName?: string;
    lastName?: string;
  };
  doctorId?: { name?: string };
};

export function ClinicalLiveTable({
  initialRows,
}: {
  initialRows: EncounterRow[];
}) {
  const [rows, setRows] = useState(initialRows);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const reload = useCallback(async () => {
    const res = await fetch("/api/encounters?limit=40", {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!res.ok) return;
    const data = await res.json();
    setRows(
      (data.items || []).map((e: EncounterRow) => ({
        ...e,
        _id: String(e._id),
      }))
    );
  }, []);

  useLiveReload(reload);

  return (
    <TableScroll className="border-0 shadow-none rounded-none">
      <thead>
        <tr>
          <th>When</th>
          <th>Patient</th>
          <th>Doctor</th>
          <th>Complaint</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((e) => {
          const patient = e.patientId;
          const doctor = e.doctorId;
          return (
            <tr key={e._id}>
              <td>{formatDateTime(e.createdAt)}</td>
              <td>
                {patient?.firstName} {patient?.lastName}
                <div className="text-xs text-slate-500">{patient?.uhid}</div>
              </td>
              <td>{doctor?.name}</td>
              <td>{e.chiefComplaint || "—"}</td>
              <td>
                <StatusBadge status={e.status} />
              </td>
              <td>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/clinical/${e._id}`}>Open</Link>
                </Button>
              </td>
            </tr>
          );
        })}
        {rows.length === 0 && (
          <tr>
            <td colSpan={6} className="py-10 text-center text-slate-500">
              No encounters yet
            </td>
          </tr>
        )}
      </tbody>
    </TableScroll>
  );
}
