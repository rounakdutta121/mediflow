"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function StaffCreateForm() {
  const router = useRouter();
  const [departments, setDepartments] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then((d) => setDepartments(d.items || []));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    setLoading(true);
    const form = new FormData(formEl);
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to create user");
      return;
    }
    toast.success("Staff member created");
    formEl.reset();
    router.refresh();
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Add staff member</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input name="name" required />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input name="email" type="email" required />
          </div>
          <div className="space-y-1">
            <Label>Password</Label>
            <Input name="password" type="password" required />
          </div>
          <div className="space-y-1">
            <Label>Role</Label>
            <Select name="role" defaultValue="RECEPTIONIST">
              <option value="HOSPITAL_ADMIN">Hospital Admin</option>
              <option value="RECEPTIONIST">Receptionist</option>
              <option value="DOCTOR">Doctor</option>
              <option value="NURSE">Nurse</option>
              <option value="ACCOUNTANT">Accountant</option>
              <option value="AUDITOR">Auditor</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Department</Label>
            <Select name="departmentId" defaultValue="">
              <option value="">None</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Employee code</Label>
            <Input name="employeeCode" />
          </div>
          <div className="space-y-1">
            <Label>Specialization</Label>
            <Input name="specialization" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Add staff"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
