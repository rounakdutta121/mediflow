"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function CollectPaymentForm({
  invoiceId,
  balance,
}: {
  invoiceId: string;
  balance: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceId,
        amount: Number(form.get("amount")),
        method: form.get("method"),
        reference: form.get("reference"),
        notes: form.get("notes"),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Payment failed");
      return;
    }
    toast.success("Payment recorded");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Collect payment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Amount</Label>
            <Input
              name="amount"
              type="number"
              min={1}
              max={balance}
              step="0.01"
              defaultValue={balance}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Method</Label>
            <Select name="method" defaultValue="cash">
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Reference</Label>
            <Input name="reference" />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Input name="notes" />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving…" : "Record payment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
