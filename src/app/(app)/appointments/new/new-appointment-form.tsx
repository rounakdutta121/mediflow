"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Patient = { _id: string; uhid: string; firstName: string; lastName: string };
type Doctor = {
  _id: string;
  name: string;
  departmentId?: { _id: string; name: string } | string;
};
type Department = { _id: string; name: string };

export function NewAppointmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [doctorId, setDoctorId] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/patients?limit=100").then((r) => r.json()),
      fetch("/api/staff?role=DOCTOR").then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
    ]).then(([p, d, dept]) => {
      setPatients(p.items || []);
      setDoctors(d.items || []);
      setDepartments(dept.items || []);
    });
  }, []);

  useEffect(() => {
    const doctor = doctors.find((d) => d._id === doctorId);
    if (!doctor) return;
    const dep =
      typeof doctor.departmentId === "object"
        ? doctor.departmentId?._id
        : doctor.departmentId;
    if (dep) setDepartmentId(dep);
  }, [doctorId, doctors]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const date = String(form.get("date"));
    const time = String(form.get("time"));
    const scheduledAt = new Date(`${date}T${time}:00`);

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: form.get("patientId"),
        doctorId,
        departmentId,
        scheduledAt: scheduledAt.toISOString(),
        type: form.get("type"),
        reason: form.get("reason"),
        notes: form.get("notes"),
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to book appointment");
      return;
    }

    toast.success("Appointment booked");
    router.push("/appointments");
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Book appointment"
        description="Schedule an OPD visit with a clinician"
      />
      <Card>
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="patientId">Patient</Label>
              <Select
                id="patientId"
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
              <Label htmlFor="doctorId">Doctor</Label>
              <Select
                id="doctorId"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                required
              >
                <option value="">Select doctor</option>
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="departmentId">Department</Label>
              <Select
                id="departmentId"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                required
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input id="time" name="time" type="time" required defaultValue="10:00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select id="type" name="type" defaultValue="opd">
                <option value="opd">OPD</option>
                <option value="follow_up">Follow-up</option>
                <option value="walk_in">Walk-in</option>
                <option value="teleconsult">Teleconsult</option>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="reason">Reason</Label>
              <Input id="reason" name="reason" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" />
            </div>
            <div>
              <Button type="submit" disabled={loading}>
                {loading ? "Booking…" : "Book appointment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
