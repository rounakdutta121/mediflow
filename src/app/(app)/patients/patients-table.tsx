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
      width: "minmax(8rem, 1.1fr)",
      cell: (p) => <span className="font-semibold">{p.uhid}</span>,
    },
    {
      id: "name",
      header: "Name",
      width: "minmax(10rem, 1.6fr)",
      cell: (p) => (
        <span>
          {p.firstName} {p.lastName}
        </span>
      ),
    },
    {
      id: "phone",
      header: "Phone",
      width: "minmax(8rem, 1.2fr)",
      cell: (p) => p.phone,
    },
    {
      id: "gender",
      header: "Gender",
      width: "minmax(6rem, 0.8fr)",
      cell: (p) => <span className="capitalize">{p.gender}</span>,
    },
    {
      id: "registered",
      header: "Registered",
      width: "minmax(7rem, 1fr)",
      cell: (p) => formatDate(p.createdAt),
    },
    {
      id: "actions",
      header: "",
      width: "minmax(5rem, 0.6fr)",
      className: "justify-end",
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
