"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function DepartmentCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    setLoading(true);
    const form = new FormData(formEl);
    const res = await fetch("/api/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to create department");
      return;
    }
    toast.success("Department created");
    formEl.reset();
    router.refresh();
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Add department</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input name="name" required />
          </div>
          <div className="space-y-1">
            <Label>Code</Label>
            <Input name="code" required />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input name="description" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Add"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
