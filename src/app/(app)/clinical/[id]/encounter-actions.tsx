"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function EncounterActions({
  encounterId,
  patientId,
}: {
  encounterId: string;
  patientId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function addPrescription(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    setLoading(true);
    const form = new FormData(formEl);
    const res = await fetch("/api/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        encounterId,
        patientId,
        sign: true,
        items: [
          {
            medicineName: form.get("medicineName"),
            dosage: form.get("dosage"),
            frequency: form.get("frequency"),
            duration: form.get("duration"),
            instructions: form.get("instructions"),
          },
        ],
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to add prescription");
      return;
    }
    toast.success("Prescription signed");
    formEl.reset();
    router.refresh();
  }

  async function signEncounter() {
    setLoading(true);
    const res = await fetch(`/api/encounters/${encounterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "signed" }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to sign encounter");
      return;
    }
    toast.success("Encounter signed");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={addPrescription} className="space-y-2">
          <Label>Add medicine</Label>
          <Input name="medicineName" placeholder="Medicine name" required />
          <Input name="dosage" placeholder="Dosage e.g. 500mg" />
          <Input name="frequency" placeholder="Frequency e.g. 1-0-1" />
          <Input name="duration" placeholder="Duration e.g. 5 days" />
          <Input name="instructions" placeholder="Instructions" />
          <Button type="submit" variant="secondary" disabled={loading} className="w-full">
            Sign prescription
          </Button>
        </form>
        <Button onClick={signEncounter} disabled={loading} className="w-full">
          Sign encounter
        </Button>
      </CardContent>
    </Card>
  );
}
