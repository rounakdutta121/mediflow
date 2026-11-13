"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type HospitalSettings = {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone: string;
  currency: string;
};

export function HospitalSettingsForm({
  hospital,
  className,
}: {
  hospital: HospitalSettings;
  className?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: hospital.name || "",
    code: hospital.code || "",
    address: hospital.address || "",
    phone: hospital.phone || "",
    email: hospital.email || "",
    timezone: hospital.timezone || "Asia/Kolkata",
    currency: hospital.currency || "INR",
  });

  function startEdit() {
    setForm({
      name: hospital.name || "",
      code: hospital.code || "",
      address: hospital.address || "",
      phone: hospital.phone || "",
      email: hospital.email || "",
      timezone: hospital.timezone || "Asia/Kolkata",
      currency: hospital.currency || "INR",
    });
    setEditing(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/hospital", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to update hospital");
      return;
    }

    toast.success("Hospital settings saved");
    setEditing(false);
    router.refresh();
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <CardTitle>Hospital</CardTitle>
        {!editing ? (
          <Button type="button" variant="outline" size="sm" onClick={startEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Cancel edit"
            onClick={() => setEditing(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!editing ? (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-[var(--muted)]">Name</p>
              <p className="font-medium">{hospital.name}</p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Code</p>
              <p>{hospital.code}</p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Address</p>
              <p>{hospital.address || "—"}</p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Contact</p>
              <p>
                {hospital.phone || "—"} · {hospital.email || "—"}
              </p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Timezone / currency</p>
              <p>
                {hospital.timezone} · {hospital.currency}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="hospital-name">Name</Label>
              <Input
                id="hospital-name"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hospital-code">Code</Label>
              <Input
                id="hospital-code"
                value={form.code}
                onChange={(e) =>
                  setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hospital-phone">Phone</Label>
              <Input
                id="hospital-phone"
                value={form.phone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="hospital-address">Address</Label>
              <Input
                id="hospital-address"
                value={form.address}
                onChange={(e) =>
                  setForm((p) => ({ ...p, address: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="hospital-email">Email</Label>
              <Input
                id="hospital-email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hospital-timezone">Timezone</Label>
              <Input
                id="hospital-timezone"
                value={form.timezone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, timezone: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hospital-currency">Currency</Label>
              <Input
                id="hospital-currency"
                value={form.currency}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    currency: e.target.value.toUpperCase(),
                  }))
                }
                required
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
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
