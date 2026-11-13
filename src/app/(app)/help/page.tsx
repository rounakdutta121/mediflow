import { requirePagePermission } from "@/lib/page-auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const guides = [
  {
    title: "Sign in & navigation",
    steps: [
      "Open the app and sign in with your role email/password.",
      "Use the theme toggle in the top bar for light or dark mode.",
      "The left sidebar only lists modules your role can access.",
      "Open notifications from the bell icon; Admin sees all alerts.",
    ],
  },
  {
    title: "Register a patient",
    when: "Walk-in or new registration",
    href: "/patients/new",
    linkLabel: "Register patient",
    steps: [
      "Go to Patients → Register patient (needs patients:write).",
      "Enter first name, last name, and phone (required).",
      "Optional: allergies and chronic conditions as comma-separated lists.",
      "Save to generate a UHID (e.g. MFH-001007).",
      "From the profile you can book, start an encounter, or create an invoice if allowed.",
    ],
  },
  {
    title: "Book an appointment",
    when: "Schedule an OPD / follow-up visit",
    href: "/appointments/new",
    linkLabel: "Book appointment",
    steps: [
      "Open Appointments → Book, or Patient profile → Book appointment.",
      "Select patient, doctor, and department.",
      "Pick date, time, and type (OPD, follow-up, walk-in, teleconsult).",
      "Save — it appears on the appointments board for that day.",
    ],
  },
  {
    title: "Check-in & queue",
    when: "Patient has arrived",
    href: "/queue",
    linkLabel: "Open queue",
    steps: [
      "Open Queue (requires queue:manage).",
      "Check in a scheduled patient to generate a token.",
      "Update status as they move through the clinic.",
      "Doctors with clinical:write can Start consult from the queue.",
    ],
  },
  {
    title: "Clinical encounter (EMR)",
    when: "Consultation / documentation",
    href: "/clinical/new",
    linkLabel: "New encounter",
    steps: [
      "Open Clinical → New encounter, or Start encounter from queue/patient.",
      "Record chief complaint, history, examination, assessment, plan, vitals, diagnosis.",
      "Add prescriptions; optional service/price can auto-create an invoice on sign.",
      "Edit while open; signing locks the clinical note for the consult.",
    ],
  },
  {
    title: "Billing & payments",
    when: "Collect OPD charges",
    href: "/billing/new",
    linkLabel: "Create invoice",
    steps: [
      "Billing → Create invoice: choose patient and add catalogue services.",
      "Apply discount if needed, then save.",
      "Open the invoice and collect payment (cash/card/UPI as available).",
      "Status moves issued → partially paid → paid; dues show on the dashboard.",
    ],
  },
  {
    title: "Staff, departments & settings",
    when: "Hospital configuration (Admin)",
    href: "/settings",
    linkLabel: "Open settings",
    steps: [
      "Doctors & Staff: create users with role and password; edit or deactivate.",
      "Departments: create and maintain specialty units.",
      "Settings: edit hospital name, code, address, phone, email, timezone, currency.",
      "Reports and Audit are available to roles with reports:view / audit:view.",
    ],
  },
];

const demoUsers = [
  ["Hospital Admin", "admin@mediflow.local", "Admin@12345"],
  ["Doctor", "dr.mehta@mediflow.local", "Doctor@12345"],
  ["Reception", "reception@mediflow.local", "Reception@12345"],
  ["Accounts", "accounts@mediflow.local", "Accounts@12345"],
];

export default async function HelpPage() {
  await requirePagePermission("dashboard:view");

  return (
    <FadeIn>
      <PageHeader
        title="Help"
        description="How to do common MediFlow workflows — what to open, when, and in what order"
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick path</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--muted)]">
            <p>
              Typical OPD flow:{" "}
              <span className="font-medium text-[var(--foreground)]">
                Register patient → Book appointment → Check-in (Queue) → Clinical
                encounter → Invoice / payment
              </span>
              . Use the cards below for step-by-step detail. Actions you cannot
              perform for your role stay hidden or return forbidden.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Demo logins</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {demoUsers.map(([role, email, pass]) => (
              <div key={email} className="rounded-xl border border-[var(--border)] p-2.5">
                <p className="font-semibold text-[var(--foreground)]">{role}</p>
                <p className="break-all text-xs text-[var(--muted)]">{email}</p>
                <p className="font-mono text-xs text-[var(--brand)]">{pass}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {guides.map((guide) => (
          <Card key={guide.title}>
            <CardHeader className="space-y-2">
              <CardTitle>{guide.title}</CardTitle>
              {guide.when && (
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand)]">
                  When: {guide.when}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <ol className="mb-4 list-decimal space-y-2 pl-4 text-sm text-[var(--muted)]">
                {guide.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              {guide.href && (
                <Button asChild variant="outline" size="sm">
                  <Link href={guide.href}>{guide.linkLabel}</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </FadeIn>
  );
}
