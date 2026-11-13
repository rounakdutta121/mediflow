"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/utils";

type Service = {
  _id: string;
  name: string;
  code: string;
  price: number;
};

type Prescription = {
  _id: string;
  status: string;
  invoiceId?: string;
  items: Array<{
    medicineName: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    unitPrice?: number;
    amount?: number;
  }>;
};

type EncounterData = {
  _id: string;
  status: string;
  chiefComplaint?: string;
  history?: string;
  examination?: string;
  assessment?: string;
  plan?: string;
  diagnoses?: Array<{ description: string; type: string }>;
  vitals?: {
    bloodPressure?: string;
    pulse?: number;
    temperature?: number;
    spo2?: number;
  };
};

export function EncounterWorkspace({
  encounter,
  prescriptions: initialRx,
  patientId,
  canWrite,
}: {
  encounter: EncounterData;
  prescriptions: Prescription[];
  patientId: string;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [editingNotes, setEditingNotes] = useState(encounter.status === "open");
  const [editingVitals, setEditingVitals] = useState(false);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [prescriptions, setPrescriptions] = useState(initialRx);
  const [autoInvoiceId, setAutoInvoiceId] = useState<string | null>(null);

  const [notes, setNotes] = useState({
    chiefComplaint: encounter.chiefComplaint || "",
    history: encounter.history || "",
    examination: encounter.examination || "",
    assessment: encounter.assessment || "",
    plan: encounter.plan || "",
    diagnosis: encounter.diagnoses?.[0]?.description || "",
  });

  const [vitals, setVitals] = useState({
    bloodPressure: encounter.vitals?.bloodPressure || "",
    pulse: encounter.vitals?.pulse?.toString() || "",
    temperature: encounter.vitals?.temperature?.toString() || "",
    spo2: encounter.vitals?.spo2?.toString() || "",
  });

  const [rx, setRx] = useState({
    medicineName: "",
    dosage: "",
    frequency: "",
    duration: "",
    instructions: "",
    serviceId: "",
    unitPrice: "",
  });

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((d) => setServices(d.items || []))
      .catch(() => undefined);
  }, []);

  async function saveNotes() {
    setLoading(true);
    const res = await fetch(`/api/encounters/${encounter._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chiefComplaint: notes.chiefComplaint,
        history: notes.history,
        examination: notes.examination,
        assessment: notes.assessment,
        plan: notes.plan,
        diagnoses: notes.diagnosis
          ? [{ description: notes.diagnosis, type: "provisional" }]
          : [],
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to save notes");
      return;
    }
    toast.success("Clinical notes saved");
    setEditingNotes(false);
    router.refresh();
  }

  async function saveVitals() {
    setLoading(true);
    const res = await fetch(`/api/encounters/${encounter._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vitals: {
          bloodPressure: vitals.bloodPressure || undefined,
          pulse: vitals.pulse ? Number(vitals.pulse) : undefined,
          temperature: vitals.temperature ? Number(vitals.temperature) : undefined,
          spo2: vitals.spo2 ? Number(vitals.spo2) : undefined,
        },
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to save vitals");
      return;
    }
    toast.success("Vitals saved");
    setEditingVitals(false);
    router.refresh();
  }

  async function addPrescription(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        encounterId: encounter._id,
        patientId,
        sign: true,
        items: [
          {
            medicineName: rx.medicineName,
            dosage: rx.dosage,
            frequency: rx.frequency,
            duration: rx.duration,
            instructions: rx.instructions,
            serviceId: rx.serviceId || undefined,
            unitPrice: Number(rx.unitPrice || 0),
            quantity: 1,
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
    const created = await res.json();
    setPrescriptions((prev) => [created, ...prev]);
    setRx({
      medicineName: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
      serviceId: "",
      unitPrice: "",
    });
    toast.success("Prescription signed");
    router.refresh();
  }

  async function signEncounter() {
    setLoading(true);
    const res = await fetch(`/api/encounters/${encounter._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "signed",
        chiefComplaint: notes.chiefComplaint,
        history: notes.history,
        examination: notes.examination,
        assessment: notes.assessment,
        plan: notes.plan,
        diagnoses: notes.diagnosis
          ? [{ description: notes.diagnosis, type: "final" }]
          : [],
        vitals: {
          bloodPressure: vitals.bloodPressure || undefined,
          pulse: vitals.pulse ? Number(vitals.pulse) : undefined,
          temperature: vitals.temperature ? Number(vitals.temperature) : undefined,
          spo2: vitals.spo2 ? Number(vitals.spo2) : undefined,
        },
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to sign encounter");
      return;
    }
    const data = await res.json();
    if (data.invoice?._id) {
      setAutoInvoiceId(data.invoice._id);
      toast.success(`Encounter signed · Invoice ${data.invoice.invoiceNumber} created`);
    } else {
      toast.success("Encounter signed");
    }
    router.refresh();
  }

  async function deleteEncounter() {
    if (!confirm("Delete this encounter and its prescriptions?")) return;
    setLoading(true);
    const res = await fetch(`/api/encounters/${encounter._id}`, {
      method: "DELETE",
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Delete failed");
      return;
    }
    toast.success("Encounter deleted");
    router.push("/clinical");
    router.refresh();
  }

  async function deletePrescription(id: string) {
    if (!confirm("Delete this prescription?")) return;
    const res = await fetch(`/api/prescriptions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Delete failed");
      return;
    }
    setPrescriptions((prev) => prev.filter((p) => p._id !== id));
    toast.success("Prescription deleted");
    router.refresh();
  }

  function onServiceChange(serviceId: string) {
    const service = services.find((s) => s._id === serviceId);
    setRx((prev) => ({
      ...prev,
      serviceId,
      unitPrice: service ? String(service.price) : prev.unitPrice,
      medicineName: prev.medicineName || service?.name || "",
    }));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Clinical notes</CardTitle>
          {canWrite && (
            <div className="flex gap-2">
              {!editingNotes ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingNotes(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              ) : (
                <Button size="sm" onClick={saveNotes} disabled={loading}>
                  Save notes
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {editingNotes && canWrite ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="chiefComplaint">Chief complaint</Label>
                <Input
                  id="chiefComplaint"
                  value={notes.chiefComplaint}
                  onChange={(e) =>
                    setNotes((p) => ({ ...p, chiefComplaint: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="history">History</Label>
                <Textarea
                  id="history"
                  value={notes.history}
                  onChange={(e) =>
                    setNotes((p) => ({ ...p, history: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="examination">Examination</Label>
                <Textarea
                  id="examination"
                  value={notes.examination}
                  onChange={(e) =>
                    setNotes((p) => ({ ...p, examination: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="assessment">Assessment</Label>
                <Textarea
                  id="assessment"
                  value={notes.assessment}
                  onChange={(e) =>
                    setNotes((p) => ({ ...p, assessment: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="plan">Plan</Label>
                <Textarea
                  id="plan"
                  value={notes.plan}
                  onChange={(e) =>
                    setNotes((p) => ({ ...p, plan: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="diagnosis">Diagnosis</Label>
                <Input
                  id="diagnosis"
                  value={notes.diagnosis}
                  onChange={(e) =>
                    setNotes((p) => ({ ...p, diagnosis: e.target.value }))
                  }
                />
              </div>
            </div>
          ) : (
            <>
              <section>
                <p className="font-medium text-slate-500">Chief complaint</p>
                <p>{notes.chiefComplaint || "—"}</p>
              </section>
              <section>
                <p className="font-medium text-slate-500">History</p>
                <p className="whitespace-pre-wrap">{notes.history || "—"}</p>
              </section>
              <section>
                <p className="font-medium text-slate-500">Examination</p>
                <p className="whitespace-pre-wrap">{notes.examination || "—"}</p>
              </section>
              <section>
                <p className="font-medium text-slate-500">Assessment</p>
                <p className="whitespace-pre-wrap">{notes.assessment || "—"}</p>
              </section>
              <section>
                <p className="font-medium text-slate-500">Plan</p>
                <p className="whitespace-pre-wrap">{notes.plan || "—"}</p>
              </section>
              <section>
                <p className="mb-2 font-medium text-slate-500">Diagnoses</p>
                <p>{notes.diagnosis || "—"}</p>
              </section>
            </>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Vitals</CardTitle>
            {canWrite && (
              <div className="flex gap-2">
                {!editingVitals ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingVitals(true)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                ) : (
                  <Button size="sm" onClick={saveVitals} disabled={loading}>
                    Save
                  </Button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {editingVitals && canWrite ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="bp">BP</Label>
                  <Input
                    id="bp"
                    value={vitals.bloodPressure}
                    onChange={(e) =>
                      setVitals((p) => ({ ...p, bloodPressure: e.target.value }))
                    }
                    placeholder="120/80"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pulse">Pulse</Label>
                  <Input
                    id="pulse"
                    type="number"
                    value={vitals.pulse}
                    onChange={(e) =>
                      setVitals((p) => ({ ...p, pulse: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="temp">Temp</Label>
                  <Input
                    id="temp"
                    type="number"
                    step="0.1"
                    value={vitals.temperature}
                    onChange={(e) =>
                      setVitals((p) => ({ ...p, temperature: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="spo2">SpO2</Label>
                  <Input
                    id="spo2"
                    type="number"
                    value={vitals.spo2}
                    onChange={(e) =>
                      setVitals((p) => ({ ...p, spo2: e.target.value }))
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">BP</p>
                  <p>{vitals.bloodPressure || "—"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Pulse</p>
                  <p>{vitals.pulse || "—"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Temp</p>
                  <p>{vitals.temperature || "—"}</p>
                </div>
                <div>
                  <p className="text-slate-500">SpO2</p>
                  <p>{vitals.spo2 || "—"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prescriptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {prescriptions.map((rxItem) => (
              <div
                key={rxItem._id}
                className="rounded-lg border border-[var(--border)] p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <StatusBadge status={rxItem.status} />
                  {canWrite && (
                    <button
                      type="button"
                      className="text-slate-400 hover:text-red-600"
                      onClick={() => deletePrescription(rxItem._id)}
                      aria-label="Delete prescription"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <ul className="space-y-1">
                  {rxItem.items.map((item, idx) => (
                    <li key={idx}>
                      <span className="font-medium">{item.medicineName}</span>
                      {[item.dosage, item.frequency, item.duration]
                        .filter(Boolean)
                        .join(" · ")}
                      {typeof item.unitPrice === "number" && item.unitPrice > 0 && (
                        <span className="ml-2 text-slate-500">
                          {formatCurrency(item.unitPrice)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {prescriptions.length === 0 && (
              <p className="text-slate-500">No prescriptions yet</p>
            )}
          </CardContent>
        </Card>

        {canWrite && encounter.status !== "signed" && (
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={addPrescription} className="space-y-2">
                <Label>Add medicine / charge</Label>
                <Input
                  value={rx.medicineName}
                  onChange={(e) =>
                    setRx((p) => ({ ...p, medicineName: e.target.value }))
                  }
                  placeholder="Medicine name"
                  required
                />
                <Input
                  value={rx.dosage}
                  onChange={(e) => setRx((p) => ({ ...p, dosage: e.target.value }))}
                  placeholder="Dosage e.g. 500mg"
                />
                <Input
                  value={rx.frequency}
                  onChange={(e) =>
                    setRx((p) => ({ ...p, frequency: e.target.value }))
                  }
                  placeholder="Frequency e.g. 1-0-1"
                />
                <Input
                  value={rx.duration}
                  onChange={(e) =>
                    setRx((p) => ({ ...p, duration: e.target.value }))
                  }
                  placeholder="Duration e.g. 5 days"
                />
                <Input
                  value={rx.instructions}
                  onChange={(e) =>
                    setRx((p) => ({ ...p, instructions: e.target.value }))
                  }
                  placeholder="Instructions"
                />
                <div className="space-y-1">
                  <Label>Service (optional)</Label>
                  <Select
                    value={rx.serviceId}
                    onChange={(e) => onServiceChange(e.target.value)}
                  >
                    <option value="">Custom price / no service</option>
                    {services.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.code} — {s.name} ({formatCurrency(s.price)})
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Price (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={rx.unitPrice}
                    onChange={(e) =>
                      setRx((p) => ({ ...p, unitPrice: e.target.value }))
                    }
                    placeholder="Enter charge amount"
                  />
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={loading}
                  className="w-full"
                >
                  Sign prescription
                </Button>
              </form>
              <Button onClick={signEncounter} disabled={loading} className="w-full">
                Sign encounter & generate invoice
              </Button>
            </CardContent>
          </Card>
        )}

        {autoInvoiceId && (
          <Card>
            <CardContent className="p-4 text-sm">
              <p className="font-medium text-[var(--brand-navy)]">
                Invoice created automatically
              </p>
              <Button asChild variant="secondary" size="sm" className="mt-3">
                <Link href={`/billing/${autoInvoiceId}`}>Open invoice</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {canWrite && (
          <Button
            variant="danger"
            disabled={loading}
            onClick={deleteEncounter}
            className="w-full"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete encounter
          </Button>
        )}
      </div>
    </div>
  );
}
