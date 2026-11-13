"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type StaffItem = {
  _id: string;
  name: string;
  email: string;
  role: string;
  employeeCode?: string;
  specialization?: string;
  qualification?: string;
  phone?: string;
  departmentId?: string;
};

export function StaffRowActions({
  staff,
  canWrite,
  isSelf,
}: {
  staff: StaffItem;
  canWrite: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<{ _id: string; name: string }[]>(
    []
  );
  const [form, setForm] = useState({
    name: staff.name,
    email: staff.email,
    role: staff.role,
    departmentId: staff.departmentId || "",
    employeeCode: staff.employeeCode || "",
    specialization: staff.specialization || "",
    phone: staff.phone || "",
    password: "",
  });

  useEffect(() => {
    if (!editing) return;
    fetch("/api/departments")
      .then((r) => r.json())
      .then((d) => setDepartments(d.items || []));
  }, [editing]);

  if (!canWrite) return null;

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      role: form.role,
      departmentId: form.departmentId || null,
      employeeCode: form.employeeCode,
      specialization: form.specialization,
      phone: form.phone,
    };
    if (form.password) payload.password = form.password;

    const res = await fetch(`/api/staff/${staff._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Update failed");
      return;
    }
    toast.success("Staff updated");
    setEditing(false);
    router.refresh();
  }

  async function onDelete() {
    if (isSelf) {
      toast.error("You cannot delete your own account");
      return;
    }
    if (!confirm(`Deactivate ${staff.name}?`)) return;
    setLoading(true);
    const res = await fetch(`/api/staff/${staff._id}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Delete failed");
      return;
    }
    toast.success("Staff deactivated");
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[var(--brand-navy)]"
          aria-label="Edit staff"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-40"
          aria-label="Delete staff"
          disabled={loading || isSelf}
          title={isSelf ? "Cannot delete your own account" : "Delete"}
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-md)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--brand-navy)]">
                Edit staff
              </h3>
              <button
                type="button"
                onClick={() => setEditing(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={onSave} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, email: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                  disabled={isSelf}
                >
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
                <Select
                  value={form.departmentId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, departmentId: e.target.value }))
                  }
                >
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
                <Input
                  value={form.employeeCode}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, employeeCode: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Specialization</Label>
                <Input
                  value={form.specialization}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, specialization: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>New password (optional)</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, password: e.target.value }))
                  }
                  placeholder="Leave blank to keep current"
                />
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving…" : "Save changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
