"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type DepartmentItem = {
  _id: string;
  name: string;
  code: string;
  description?: string;
};

export function DepartmentCard({
  department,
  doctorCount,
  canWrite,
}: {
  department: DepartmentItem;
  doctorCount: number;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: department.name,
    code: department.code,
    description: department.description || "",
  });

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/departments/${department._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Update failed");
      return;
    }
    toast.success("Department updated");
    setEditing(false);
    router.refresh();
  }

  async function onDelete() {
    if (
      !confirm(
        doctorCount > 0
          ? `This department has ${doctorCount} assigned staff. Delete anyway only works after reassignment.`
          : `Delete department "${department.name}"?`
      )
    ) {
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/departments/${department._id}`, {
      method: "DELETE",
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Delete failed");
      return;
    }
    toast.success("Department deleted");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="p-5">
        {editing ? (
          <form onSubmit={onSave} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--brand-navy)]">
                Edit department
              </p>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-700"
                onClick={() => setEditing(false)}
                aria-label="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`name-${department._id}`}>Name</Label>
              <Input
                id={`name-${department._id}`}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`code-${department._id}`}>Code</Label>
              <Input
                id={`code-${department._id}`}
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`desc-${department._id}`}>Description</Label>
              <Input
                id={`desc-${department._id}`}
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Saving…" : "Save"}
            </Button>
          </form>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-teal)]">
                {department.code}
              </p>
              {canWrite && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-[var(--brand-navy)]"
                    aria-label="Edit department"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                    aria-label="Delete department"
                    disabled={loading}
                    onClick={onDelete}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            <h3 className="mt-1 text-lg font-semibold text-[var(--brand-navy)]">
              {department.name}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {department.description || "No description"}
            </p>
            <p className="mt-4 text-sm text-slate-600">
              {doctorCount} doctors assigned
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
