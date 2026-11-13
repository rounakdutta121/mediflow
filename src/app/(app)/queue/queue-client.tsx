"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TableScroll } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

type QueueItem = {
  _id: string;
  scheduledAt: string;
  status: string;
  tokenNumber?: number;
  patientId: { _id: string; uhid: string; firstName: string; lastName: string };
  doctorId: { _id: string; name: string };
  departmentId: { name: string };
};

export function QueueClient({ canStartConsult }: { canStartConsult: boolean }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/queue?date=${date}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Unable to load queue");
      setItems([]);
      return;
    }
    const data = await res.json();
    setItems(data.items || []);
  }, [date]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  async function checkIn(appointmentId: string) {
    setLoading(true);
    const res = await fetch("/api/queue/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Check-in failed");
      return;
    }
    const appt = await res.json();
    toast.success(`Checked in · Token ${appt.tokenNumber}`);
    load();
  }

  async function startConsult(item: QueueItem) {
    if (!canStartConsult) {
      toast.error("You do not have permission to start consultations");
      return;
    }
    const res = await fetch("/api/encounters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: item.patientId._id,
        appointmentId: item._id,
        doctorId: item.doctorId._id,
        chiefComplaint: "OPD visit",
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to start encounter");
      return;
    }
    const encounter = await res.json();
    toast.success("Encounter started");
    window.location.href = `/clinical/${encounter._id}`;
  }

  return (
    <div>
      <PageHeader
        title="Queue"
        description="Check-in, token generation and waiting-room status"
      />

      <Card className="mb-4">
        <CardContent className="flex items-center gap-3 p-4">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
          />
          <Button variant="outline" onClick={load}>
            Refresh
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <TableScroll className="border-0 shadow-none rounded-none">
            <thead>
              <tr>
                <th>Token</th>
                <th>Time</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td className="text-lg font-semibold text-[var(--brand-navy)]">
                    {item.tokenNumber ?? "—"}
                  </td>
                  <td>{formatDateTime(item.scheduledAt)}</td>
                  <td>
                    <Link
                      href={`/patients/${item.patientId._id}`}
                      className="font-medium text-[var(--brand-teal)] hover:underline"
                    >
                      {item.patientId.firstName} {item.patientId.lastName}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {item.patientId.uhid}
                    </div>
                  </td>
                  <td>{item.doctorId.name}</td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="space-x-2">
                    {["scheduled", "confirmed"].includes(item.status) && (
                      <Button
                        size="sm"
                        disabled={loading}
                        onClick={() => checkIn(item._id)}
                      >
                        Check in
                      </Button>
                    )}
                    {canStartConsult &&
                      ["checked_in", "in_consultation"].includes(item.status) && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => startConsult(item)}
                        >
                          Start consult
                        </Button>
                      )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Queue is empty for this day
                  </td>
                </tr>
              )}
            </tbody>
          </TableScroll>
        </CardContent>
      </Card>
    </div>
  );
}
