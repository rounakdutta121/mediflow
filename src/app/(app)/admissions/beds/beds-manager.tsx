"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableScroll } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";

type WardRow = {
  _id: string;
  name: string;
  code: string;
  floor: string;
  genderPolicy: string;
};

type BedRow = {
  _id: string;
  bedNumber: string;
  bedType: string;
  status: string;
  wardId: { _id: string; name: string; code: string };
};

export function BedsManager({
  initialWards,
  initialBeds,
}: {
  initialWards: WardRow[];
  initialBeds: BedRow[];
}) {
  const router = useRouter();
  const [wards, setWards] = useState(initialWards);
  const [beds, setBeds] = useState(initialBeds);
  const [loading, setLoading] = useState(false);
  const [editingBedId, setEditingBedId] = useState<string | null>(null);

  const [wardForm, setWardForm] = useState({
    name: "",
    code: "",
    floor: "",
    genderPolicy: "mixed",
  });
  const [bedForm, setBedForm] = useState({
    wardId: initialWards[0]?._id || "",
    bedNumber: "",
    bedType: "general",
    status: "available",
  });

  useEffect(() => {
    setWards(initialWards);
    setBeds(initialBeds);
  }, [initialWards, initialBeds]);

  async function createWard(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/wards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(wardForm),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to create ward");
      return;
    }
    const ward = await res.json();
    setWards((prev) =>
      [...prev, { ...ward, _id: String(ward._id), floor: ward.floor || "" }].sort(
        (a, b) => a.name.localeCompare(b.name)
      )
    );
    setWardForm({ name: "", code: "", floor: "", genderPolicy: "mixed" });
    toast.success("Ward added");
    router.refresh();
  }

  async function deleteWard(ward: WardRow) {
    if (!confirm(`Remove ward ${ward.name}? Beds in this ward will be deactivated.`)) {
      return;
    }
    const res = await fetch(`/api/wards/${ward._id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to delete ward");
      return;
    }
    setWards((prev) => prev.filter((w) => w._id !== ward._id));
    setBeds((prev) => prev.filter((b) => b.wardId._id !== ward._id));
    toast.success("Ward removed");
    router.refresh();
  }

  function startEditBed(bed: BedRow) {
    setEditingBedId(bed._id);
    setBedForm({
      wardId: bed.wardId._id,
      bedNumber: bed.bedNumber,
      bedType: bed.bedType,
      status: bed.status === "occupied" ? "occupied" : bed.status,
    });
  }

  function cancelEditBed() {
    setEditingBedId(null);
    setBedForm({
      wardId: wards[0]?._id || "",
      bedNumber: "",
      bedType: "general",
      status: "available",
    });
  }

  async function saveBed(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(
      editingBedId ? `/api/beds/${editingBedId}` : "/api/beds",
      {
        method: editingBedId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bedForm),
      }
    );
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to save bed");
      return;
    }
    toast.success(editingBedId ? "Bed updated" : "Bed added");
    cancelEditBed();
    router.refresh();
  }

  async function deleteBed(bed: BedRow) {
    if (!confirm(`Remove bed ${bed.wardId.code}-${bed.bedNumber}?`)) return;
    const res = await fetch(`/api/beds/${bed._id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to delete bed");
      return;
    }
    setBeds((prev) => prev.filter((b) => b._id !== bed._id));
    if (editingBedId === bed._id) cancelEditBed();
    toast.success("Bed removed");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add ward</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createWard} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  required
                  value={wardForm.name}
                  onChange={(e) =>
                    setWardForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="General Ward B"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input
                  required
                  value={wardForm.code}
                  onChange={(e) =>
                    setWardForm((p) => ({
                      ...p,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="GWB"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Floor</Label>
                <Input
                  value={wardForm.floor}
                  onChange={(e) =>
                    setWardForm((p) => ({ ...p, floor: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Gender policy</Label>
                <Select
                  value={wardForm.genderPolicy}
                  onChange={(e) =>
                    setWardForm((p) => ({ ...p, genderPolicy: e.target.value }))
                  }
                >
                  <option value="mixed">Mixed</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={loading}>
                  Add ward
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <CardTitle>{editingBedId ? "Edit bed" : "Add bed"}</CardTitle>
            {editingBedId && (
              <Button type="button" variant="ghost" size="icon" onClick={cancelEditBed}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={saveBed} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Ward</Label>
                <Select
                  required
                  value={bedForm.wardId}
                  onChange={(e) =>
                    setBedForm((p) => ({ ...p, wardId: e.target.value }))
                  }
                  disabled={!!editingBedId && bedForm.status === "occupied"}
                >
                  <option value="">Select ward</option>
                  {wards.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.code} — {w.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Bed number</Label>
                <Input
                  required
                  value={bedForm.bedNumber}
                  onChange={(e) =>
                    setBedForm((p) => ({
                      ...p,
                      bedNumber: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="09"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={bedForm.bedType}
                  onChange={(e) =>
                    setBedForm((p) => ({ ...p, bedType: e.target.value }))
                  }
                >
                  <option value="general">General</option>
                  <option value="semi_private">Semi private</option>
                  <option value="private">Private</option>
                  <option value="icu">ICU</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={bedForm.status}
                  onChange={(e) =>
                    setBedForm((p) => ({ ...p, status: e.target.value }))
                  }
                  disabled={bedForm.status === "occupied"}
                >
                  <option value="available">Available</option>
                  <option value="reserved">Reserved</option>
                  <option value="maintenance">Maintenance</option>
                  {bedForm.status === "occupied" && (
                    <option value="occupied">Occupied</option>
                  )}
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={loading || !wards.length}>
                  {editingBedId ? "Save bed" : "Add bed"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wards</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TableScroll className="border-0 shadow-none rounded-none">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Floor</th>
                <th>Policy</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {wards.map((w) => (
                <tr key={w._id}>
                  <td className="font-medium">{w.code}</td>
                  <td>{w.name}</td>
                  <td>{w.floor || "—"}</td>
                  <td className="capitalize">{w.genderPolicy}</td>
                  <td>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteWard(w)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableScroll>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Beds</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TableScroll className="border-0 shadow-none rounded-none">
            <thead>
              <tr>
                <th>Ward</th>
                <th>Bed</th>
                <th>Type</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {beds.map((b) => (
                <tr key={b._id}>
                  <td>
                    {b.wardId.code} — {b.wardId.name}
                  </td>
                  <td className="font-medium">{b.bedNumber}</td>
                  <td className="capitalize">
                    {b.bedType.replaceAll("_", " ")}
                  </td>
                  <td>
                    <StatusBadge status={b.status} />
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditBed(b)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={b.status === "occupied"}
                        onClick={() => deleteBed(b)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableScroll>
        </CardContent>
      </Card>
    </div>
  );
}
