import { requirePagePermission } from "@/lib/page-auth";
import { NewPatientForm } from "./new-patient-form";

export default async function NewPatientPage() {
  await requirePagePermission("patients:write");
  return <NewPatientForm />;
}
