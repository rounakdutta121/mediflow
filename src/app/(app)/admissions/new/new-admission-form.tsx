"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useLiveReload } from "@/hooks/use-live-reload";

type Patient = { _id: string; uhid: string; firstName: string; lastName: string };
type Doctor = { _id: string; name: string };
type Department = { _id: string; name: string };
type Bed = {
  _id: string;
  bedNumber: string;
  bedType: string;
  status: string;
  wardId: { _id: string; name: string; code: string };
};

export function NewAdmissionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [patientId, setPatientId] = useState(
    searchParams.get("patientId") || ""
  );
  const [bedId, setBedId] = useState(searchParams.get("bedId") || "");
  const [doctorId, setDoctorId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [admissionType, setAdmissionType] = useState("elective");
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/patients?limit=100").then((r) => r.json()),
      fetch("/api/staff?role=DOCTOR").then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
      fetch("/api/beds?status=available").then((r) => r.json()),
    ]).then(([p, d, dept, b]) => {
      setPatients(p.items || []);
      setDoctors(d.items || []);
      setDepartments(dept.items || []);
      const available = (b.items || []).map(
        (bed: {
          _id: string;
          bedNumber: string;
          bedType: string;
          status: string;
          wardId: { _id: string; name?: string; code?: string } | string;
        }) => ({
          _id: String(bed._id),
          bedNumber: bed.bedNumber,
          bedType: bed.bedType,
          status: bed.status,
          wardId:
            typeof bed.wardId === "object"
              ? {
                  _id: String(bed.wardId._id),
                  name: bed.wardId.name || "",
                  code: bed.wardId.code || "",
                }
              : { _id: String(bed.wardId), name: "", code: "" },
        })
      );
      setBeds(available);
      const preferred = searchParams.get("bedId");
      if (preferred && available.some((x: Bed) => x._id === preferred)) {
        setBedId(preferred);
      }
    });
  }, [searchParams]);

  useEffect(() => {
    load();
  }, [load]);

  useLiveReload(load);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        bedId,
        admittingDoctorId: doctorId || undefined,
        departmentId: departmentId || undefined,
        admissionType,
        chiefComplaint: form.get("chiefComplaint"),
        provisionalDiagnosis: form.get("provisionalDiagnosis"),
        notes: form.get("notes"),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Admission failed");
      return;
    }
    const admission = await res.json();
    toast.success(`Admitted · ${admission.admissionNumber}`);
    router.push(`/admissions/${admission._id}`);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Admit patient"
        description="Assign an available bed and create an IPD admission"
      />
      <Card>
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Patient</Label>
              <Select
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
            <div className="space-y-2 md:col-span-2">
              <Label>Available bed</Label>
              <Select
                required
                value={bedId}
                onChange={(e) => setBedId(e.target.value)}
              >
                <option value="">Select bed</option>
                {beds.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.wardId.code}-{b.bedNumber} · {b.wardId.name} (
                    {b.bedType.replaceAll("_", " ")})
                  </option>
                ))}
              </Select>
              {beds.length === 0 && (
                <p className="text-xs text-amber-600">
                  No available beds. Free a bed by discharging a patient first.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Admission type</Label>
              <Select
                value={admissionType}
                onChange={(e) => setAdmissionType(e.target.value)}
              >
                <option value="elective">Elective</option>
                <option value="emergency">Emergency</option>
                <option value="transfer">Transfer</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Admitting doctor</Label>
              <Select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
              >
                <option value="">Optional</option>
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Department</Label>
              <Select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                <option value="">Optional</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Chief complaint</Label>
              <Input name="chiefComplaint" placeholder="Reason for admission" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Provisional diagnosis</Label>
              <Input name="provisionalDiagnosis" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea name="notes" rows={3} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={loading || !beds.length}>
                {loading ? "Admitting…" : "Admit patient"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
