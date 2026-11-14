"use client";

import { useCallback, useEffect, useState } from "react";
import { PatientsTable, type PatientRow } from "./patients-table";
import { useLiveReload } from "@/hooks/use-live-reload";

export function PatientsLiveTable({
  initialRows,
  q,
  status = "active",
}: {
  initialRows: PatientRow[];
  q?: string;
  status?: string;
}) {
  const [rows, setRows] = useState(initialRows);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const reload = useCallback(async () => {
    const params = new URLSearchParams({ limit: "50", status });
    if (q) params.set("q", q);
    const res = await fetch(`/api/patients?${params.toString()}`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!res.ok) return;
    const data = await res.json();
    const items = (data.items || []) as Array<{
      _id: string;
      uhid: string;
      firstName: string;
      lastName: string;
      phone: string;
      gender: string;
      createdAt: string;
    }>;
    setRows(
      items.map((p) => ({
        _id: String(p._id),
        uhid: p.uhid,
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone,
        gender: p.gender,
        createdAt: p.createdAt,
      }))
    );
  }, [q, status]);

  useLiveReload(reload);

  return <PatientsTable rows={rows} />;
}
