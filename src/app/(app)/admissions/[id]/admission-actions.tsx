"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLiveReload } from "@/hooks/use-live-reload";

type Bed = {
  _id: string;
  bedNumber: string;
  bedType: string;
  wardId: { _id: string; name: string; code: string };
};

export function AdmissionActions({
  admissionId,
  currentBedId,
}: {
  admissionId: string;
  currentBedId: string;
}) {
  const router = useRouter();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [transferBedId, setTransferBedId] = useState("");
  const [loading, setLoading] = useState(false);

  const loadBeds = useCallback(() => {
    fetch("/api/beds?status=available")
      .then((r) => r.json())
      .then((data) => {
        const items = (data.items || [])
          .map(
            (b: {
              _id: string;
              bedNumber: string;
              bedType: string;
              wardId: { _id: string; name?: string; code?: string } | string;
            }) => ({
              _id: String(b._id),
              bedNumber: b.bedNumber,
              bedType: b.bedType,
              wardId:
                typeof b.wardId === "object"
                  ? {
                      _id: String(b.wardId._id),
                      name: b.wardId.name || "",
                      code: b.wardId.code || "",
                    }
                  : { _id: String(b.wardId), name: "", code: "" },
            })
          )
          .filter((b: Bed) => b._id !== currentBedId);
        setBeds(items);
        setTransferBedId((prev) =>
          prev && items.some((b: Bed) => b._id === prev)
            ? prev
            : items[0]?._id || ""
        );
      })
      .catch(() => undefined);
  }, [currentBedId]);

  useEffect(() => {
    loadBeds();
  }, [loadBeds]);

  useLiveReload(loadBeds);

  async function onDischarge(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    const res = await fetch(`/api/admissions/${admissionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "discharge",
        dischargeSummary: form.get("dischargeSummary"),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Discharge failed");
      return;
    }
    toast.success("Patient discharged · bed freed");
    router.refresh();
  }

  async function onTransfer(e: FormEvent) {
    e.preventDefault();
    if (!transferBedId) {
      toast.error("Select a target bed");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/admissions/${admissionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "transfer",
        bedId: transferBedId,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Transfer failed");
      return;
    }
    toast.success("Patient transferred");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Discharge</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onDischarge} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="dischargeSummary">Discharge summary</Label>
              <Textarea
                id="dischargeSummary"
                name="dischargeSummary"
                rows={3}
                placeholder="Condition on discharge, advice, follow-up"
              />
            </div>
            <Button type="submit" variant="danger" disabled={loading} className="w-full">
              {loading ? "Working…" : "Discharge & free bed"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transfer bed</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onTransfer} className="space-y-3">
            <div className="space-y-1.5">
              <Label>New available bed</Label>
              <Select
                value={transferBedId}
                onChange={(e) => setTransferBedId(e.target.value)}
              >
                <option value="">Select bed</option>
                {beds.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.wardId.code}-{b.bedNumber} · {b.wardId.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={loading || beds.length === 0}
              className="w-full"
            >
              Transfer
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
