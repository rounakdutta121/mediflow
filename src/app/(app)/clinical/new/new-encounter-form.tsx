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

export function NewEncounterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<
    { _id: string; uhid: string; firstName: string; lastName: string }[]
  >([]);
  const [patientId, setPatientId] = useState(
    searchParams.get("patientId") || ""
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/patients?limit=100")
      .then((r) => r.json())
      .then((d) => {
        const items = d.items || [];
        setPatients(items);
        const fromQuery = searchParams.get("patientId") || "";
        if (fromQuery && items.some((item: { _id: string }) => item._id === fromQuery)) {
          setPatientId(fromQuery);
        }
      });
  }, [searchParams]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const diagnosis = String(form.get("diagnosis") || "").trim();

    const res = await fetch("/api/encounters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        chiefComplaint: form.get("chiefComplaint"),
        history: form.get("history"),
        examination: form.get("examination"),
        assessment: form.get("assessment"),
        plan: form.get("plan"),
        vitals: {
          bloodPressure: form.get("bloodPressure") || undefined,
          pulse: form.get("pulse") ? Number(form.get("pulse")) : undefined,
          temperature: form.get("temperature")
            ? Number(form.get("temperature"))
            : undefined,
          spo2: form.get("spo2") ? Number(form.get("spo2")) : undefined,
        },
        diagnoses: diagnosis
          ? [{ description: diagnosis, type: "provisional" }]
          : [],
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to create encounter");
      return;
    }

    const encounter = await res.json();
    toast.success("Encounter created");
    router.push(`/clinical/${encounter._id}`);
  }

  return (
    <div>
      <PageHeader
        title="New encounter"
        description="Document an OPD consultation"
      />
      <Card>
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
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
            <div className="space-y-2 md:col-span-2">
              <Label>Chief complaint</Label>
              <Input name="chiefComplaint" required />
            </div>
            <div className="space-y-2">
              <Label>Blood pressure</Label>
              <Input name="bloodPressure" placeholder="120/80" />
            </div>
            <div className="space-y-2">
              <Label>Pulse</Label>
              <Input name="pulse" type="number" />
            </div>
            <div className="space-y-2">
              <Label>Temperature °C</Label>
              <Input name="temperature" type="number" step="0.1" />
            </div>
            <div className="space-y-2">
              <Label>SpO2 %</Label>
              <Input name="spo2" type="number" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>History</Label>
              <Textarea name="history" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Examination</Label>
              <Textarea name="examination" />
            </div>
            <div className="space-y-2">
              <Label>Assessment</Label>
              <Textarea name="assessment" />
            </div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <Textarea name="plan" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Diagnosis</Label>
              <Input name="diagnosis" placeholder="Provisional diagnosis" />
            </div>
            <div>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Create encounter"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
