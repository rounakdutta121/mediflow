"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function NewPatientForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const allergies = String(payload.allergies || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const chronicConditions = String(payload.chronicConditions || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, allergies, chronicConditions }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to register patient");
      return;
    }

    const patient = await res.json();
    toast.success(`Patient registered · ${patient.uhid}`);
    router.push(`/patients/${patient._id}`);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Register patient"
        description="Create a new patient record and generate UHID"
      />
      <Card>
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input id="dateOfBirth" name="dateOfBirth" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select id="gender" name="gender" defaultValue="unknown">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="unknown">Unknown</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bloodGroup">Blood group</Label>
              <Input id="bloodGroup" name="bloodGroup" placeholder="e.g. B+" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select id="source" name="source" defaultValue="walk-in">
                <option value="walk-in">Walk-in</option>
                <option value="referral">Referral</option>
                <option value="online">Online</option>
                <option value="campaign">Campaign</option>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContactName">Emergency contact</Label>
              <Input id="emergencyContactName" name="emergencyContactName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContactPhone">Emergency phone</Label>
              <Input id="emergencyContactPhone" name="emergencyContactPhone" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies (comma separated)</Label>
              <Input id="allergies" name="allergies" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chronicConditions">Chronic conditions</Label>
              <Input id="chronicConditions" name="chronicConditions" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Register patient"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
