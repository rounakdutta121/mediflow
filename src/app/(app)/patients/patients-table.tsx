"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export type PatientRow = {
  _id: string;
  uhid: string;
  firstName: string;
  lastName: string;
  phone: string;
  gender: string;
  createdAt: string | Date;
};

export function PatientsTable({ rows }: { rows: PatientRow[] }) {
  const columns: DataTableColumn<PatientRow>[] = [
    {
      id: "uhid",
      header: "UHID",
      width: 140,
      cell: (p) => <span className="font-semibold">{p.uhid}</span>,
    },
    {
      id: "name",
      header: "Name",
      width: 180,
      cell: (p) => (
        <span>
          {p.firstName} {p.lastName}
        </span>
      ),
    },
    {
      id: "phone",
      header: "Phone",
      width: 140,
      cell: (p) => p.phone,
    },
    {
      id: "gender",
      header: "Gender",
      width: 100,
      cell: (p) => <span className="capitalize">{p.gender}</span>,
    },
    {
      id: "registered",
      header: "Registered",
      width: 140,
      cell: (p) => formatDate(p.createdAt),
    },
    {
      id: "actions",
      header: "",
      width: 100,
      cell: (p) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/patients/${p._id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r._id}
      empty="No patients found"
      virtualizeAbove={30}
    />
  );
}
