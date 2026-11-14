"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useLiveReload } from "@/hooks/use-live-reload";
import { cn } from "@/lib/utils";

type WardRow = {
  _id: string;
  name: string;
  code: string;
  floor: string;
  bedCount: number;
  availableCount: number;
  occupiedCount: number;
};

type BedRow = {
  _id: string;
  bedNumber: string;
  bedType: string;
  status: string;
  wardId: { _id: string; name: string; code: string };
  currentAdmissionId?: string;
};

type AdmissionRow = {
  _id: string;
  admissionNumber: string;
  status: string;
  admissionType: string;
  admittedAt: string;
  patientId?: {
    _id?: string;
    uhid: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  wardId?: { name: string; code: string };
  bedId?: { bedNumber: string; bedType: string };
  admittingDoctorId?: { name: string };
};

export function AdmissionsLiveBoard({
  initialWards,
  initialBeds,
  initialAdmissions,
  canWrite,
}: {
  initialWards: WardRow[];
  initialBeds: BedRow[];
  initialAdmissions: AdmissionRow[];
  canWrite: boolean;
}) {
  const [wards, setWards] = useState(initialWards);
  const [beds, setBeds] = useState(initialBeds);
  const [admissions, setAdmissions] = useState(initialAdmissions);
  const [wardFilter, setWardFilter] = useState<string>("all");

  useEffect(() => {
    setWards(initialWards);
    setBeds(initialBeds);
    setAdmissions(initialAdmissions);
  }, [initialWards, initialBeds, initialAdmissions]);

  const reload = useCallback(async () => {
    const [wRes, bRes, aRes] = await Promise.all([
      fetch("/api/wards", { cache: "no-store" }),
      fetch("/api/beds", { cache: "no-store" }),
      fetch("/api/admissions?status=admitted&limit=50", { cache: "no-store" }),
    ]);
    if (wRes.ok) {
      const data = await wRes.json();
      setWards(
        (data.items || []).map((w: WardRow & { _id: string }) => ({
          ...w,
          _id: String(w._id),
          floor: w.floor || "",
        }))
      );
    }
    if (bRes.ok) {
      const data = await bRes.json();
      setBeds(
        (data.items || []).map(
          (b: {
            _id: string;
            bedNumber: string;
            bedType: string;
            status: string;
            wardId:
              | { _id: string; name?: string; code?: string }
              | string;
            currentAdmissionId?: string;
          }) => ({
            _id: String(b._id),
            bedNumber: b.bedNumber,
            bedType: b.bedType,
            status: b.status,
            wardId:
              typeof b.wardId === "object"
                ? {
                    _id: String(b.wardId._id),
                    name: b.wardId.name || "",
                    code: b.wardId.code || "",
                  }
                : { _id: String(b.wardId), name: "", code: "" },
            currentAdmissionId: b.currentAdmissionId
              ? String(b.currentAdmissionId)
              : undefined,
          })
        )
      );
    }
    if (aRes.ok) {
      const data = await aRes.json();
      setAdmissions(data.items || []);
    }
  }, []);

  useLiveReload(reload);

  const visibleBeds = useMemo(
    () =>
      wardFilter === "all"
        ? beds
        : beds.filter((b) => b.wardId._id === wardFilter),
    [beds, wardFilter]
  );

  const admissionByBed = useMemo(() => {
    const map = new Map<string, AdmissionRow>();
    for (const a of admissions) {
      // match via currentAdmissionId on bed when possible
    }
    for (const bed of beds) {
      if (!bed.currentAdmissionId) continue;
      const adm = admissions.find((a) => a._id === bed.currentAdmissionId);
      if (adm) map.set(bed._id, adm);
    }
    // fallback: match by bed number + ward
    for (const a of admissions) {
      const match = beds.find(
        (b) =>
          b.bedNumber === a.bedId?.bedNumber &&
          b.wardId.name === a.wardId?.name
      );
      if (match && !map.has(match._id)) map.set(match._id, a);
    }
    return map;
  }, [admissions, beds]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>Bed board</CardTitle>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setWardFilter("all")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                wardFilter === "all"
                  ? "bg-[var(--brand)] text-white"
                  : "bg-[var(--surface-muted)] text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              All wards
            </button>
            {wards.map((w) => (
              <button
                key={w._id}
                type="button"
                onClick={() => setWardFilter(w._id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  wardFilter === w._id
                    ? "bg-[var(--brand)] text-white"
                    : "bg-[var(--surface-muted)] text-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                {w.code} · {w.availableCount}/{w.bedCount}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {visibleBeds.map((bed) => {
              const admission = admissionByBed.get(bed._id);
              return (
                <div
                  key={bed._id}
                  className={cn(
                    "rounded-xl border p-3 transition-colors",
                    bed.status === "available" &&
                      "border-emerald-500/30 bg-emerald-500/5",
                    bed.status === "occupied" &&
                      "border-amber-500/30 bg-amber-500/5",
                    bed.status === "maintenance" &&
                      "border-rose-500/30 bg-rose-500/5",
                    bed.status === "reserved" &&
                      "border-sky-500/30 bg-sky-500/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        {bed.wardId.code}-{bed.bedNumber}
                      </p>
                      <p className="text-xs capitalize text-[var(--muted)]">
                        {bed.bedType.replaceAll("_", " ")} · {bed.wardId.name}
                      </p>
                    </div>
                    <StatusBadge status={bed.status} />
                  </div>
                  {admission ? (
                    <div className="mt-3 space-y-1 text-sm">
                      <p className="font-medium">
                        {admission.patientId?.firstName}{" "}
                        {admission.patientId?.lastName}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {admission.admissionNumber} · {admission.patientId?.uhid}
                      </p>
                      <Button asChild size="sm" variant="ghost" className="mt-1 px-0">
                        <Link href={`/admissions/${admission._id}`}>
                          Open admission
                        </Link>
                      </Button>
                    </div>
                  ) : bed.status === "available" && canWrite ? (
                    <Button asChild size="sm" variant="outline" className="mt-3">
                      <Link href={`/admissions/new?bedId=${bed._id}`}>
                        Admit here
                      </Link>
                    </Button>
                  ) : (
                    <p className="mt-3 text-xs text-[var(--muted)]">No patient</p>
                  )}
                </div>
              );
            })}
            {visibleBeds.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-[var(--muted)]">
                No beds in this ward
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
