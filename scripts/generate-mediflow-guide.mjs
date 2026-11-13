import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const OUT_DIR = path.resolve("D:/hospitalcrm/docs");
fs.mkdirSync(OUT_DIR, { recursive: true });
const OUT = path.join(
  OUT_DIR,
  process.env.PDF_NAME || "MediFlow-User-Guide.pdf"
);

const doc = new PDFDocument({
  size: "A4",
  margins: { top: 56, bottom: 56, left: 56, right: 56 },
  bufferPages: true,
  info: {
    Title: "MediFlow Hospital CRM — User & Demo Guide",
    Author: "MediFlow",
    Subject: "Features, workflows, RBAC, and demo credentials",
  },
});

const stream = fs.createWriteStream(OUT);
doc.pipe(stream);

const colors = {
  ink: "#0b1628",
  muted: "#475569",
  brand: "#0891b2",
  line: "#cbd5e1",
  soft: "#f1f5f9",
  danger: "#b91c1c",
};

const left = () => doc.page.margins.left;
const contentWidth = () =>
  doc.page.width - doc.page.margins.left - doc.page.margins.right;

function resetX() {
  doc.x = left();
}

function ensureSpace(h = 80) {
  if (doc.y + h > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
    resetX();
  }
}

function hr() {
  resetX();
  const y = doc.y;
  doc
    .strokeColor(colors.line)
    .lineWidth(1)
    .moveTo(left(), y)
    .lineTo(left() + contentWidth(), y)
    .stroke();
  doc.y = y + 10;
  resetX();
}

function h1(text) {
  ensureSpace(60);
  resetX();
  doc
    .fillColor(colors.ink)
    .font("Helvetica-Bold")
    .fontSize(18)
    .text(text, left(), doc.y, { width: contentWidth(), align: "left" });
  doc.moveDown(0.35);
  hr();
}

function h2(text) {
  ensureSpace(40);
  resetX();
  doc
    .fillColor(colors.brand)
    .font("Helvetica-Bold")
    .fontSize(12)
    .text(text, left(), doc.y, { width: contentWidth(), align: "left" });
  doc.moveDown(0.25);
  resetX();
}

function p(text) {
  ensureSpace(36);
  resetX();
  doc
    .fillColor(colors.muted)
    .font("Helvetica")
    .fontSize(10)
    .text(text, left(), doc.y, {
      width: contentWidth(),
      align: "left",
      lineGap: 2,
    });
  doc.moveDown(0.45);
  resetX();
}

function bullet(items) {
  for (const item of items) {
    ensureSpace(28);
    resetX();
    doc
      .fillColor(colors.muted)
      .font("Helvetica")
      .fontSize(10)
      .text(`•  ${item}`, left(), doc.y, {
        width: contentWidth(),
        align: "left",
        lineGap: 1,
      });
    doc.moveDown(0.2);
  }
  doc.moveDown(0.25);
  resetX();
}

function drawTable(headers, rows, colWeights) {
  const usable = contentWidth();
  const totalW = colWeights.reduce((a, b) => a + b, 0);
  const widths = colWeights.map((w) => (w / totalW) * usable);
  const startX = left();
  const rowH = 18;

  function paintHeader(y) {
    doc.save();
    doc.rect(startX, y, usable, rowH).fill(colors.ink);
    let x = startX;
    headers.forEach((h, i) => {
      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(h, x + 3, y + 5, {
          width: widths[i] - 6,
          lineBreak: false,
          ellipsis: true,
        });
      x += widths[i];
    });
    doc.restore();
    return y + rowH;
  }

  ensureSpace(rowH * 2 + 8);
  let y = paintHeader(doc.y);

  rows.forEach((row, ri) => {
    if (y + rowH > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      resetX();
      y = paintHeader(doc.page.margins.top);
    }

    doc.save();
    if (ri % 2 === 0) {
      doc.rect(startX, y, usable, rowH).fill(colors.soft);
    }
    let x = startX;
    row.forEach((cell, i) => {
      doc
        .fillColor(colors.ink)
        .font("Helvetica")
        .fontSize(8)
        .text(String(cell), x + 3, y + 5, {
          width: widths[i] - 6,
          lineBreak: false,
          ellipsis: true,
        });
      x += widths[i];
    });
    doc.restore();
    y += rowH;
  });

  doc.y = y + 12;
  resetX();
}

function footer() {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc
      .fillColor(colors.muted)
      .font("Helvetica")
      .fontSize(8)
      .text(
        `MediFlow Phase 1 · Demo Guide · Page ${i + 1} of ${range.count}`,
        left(),
        doc.page.height - 36,
        { width: contentWidth(), align: "center", lineBreak: false }
      );
  }
}

// ——— Cover ———
resetX();
doc
  .fillColor(colors.ink)
  .font("Helvetica-Bold")
  .fontSize(26)
  .text("MediFlow", left(), doc.y, { width: contentWidth() });
doc
  .fillColor(colors.brand)
  .font("Helvetica-Bold")
  .fontSize(13)
  .text("Hospital ERP + CRM", left(), doc.y, { width: contentWidth() });
doc.moveDown(0.3);
doc
  .fillColor(colors.muted)
  .font("Helvetica")
  .fontSize(11)
  .text("Phase 1 MVP — User, Demo & Operations Guide", left(), doc.y, {
    width: contentWidth(),
  });
doc.moveDown(0.6);
hr();
p(
  "This document explains what MediFlow is, which module to use when, how to run common workflows, role-based access (RBAC), demo logins, the in-app Help page, and deployment notes for Vercel demos."
);
p(
  `Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`
);
p("Repository: https://github.com/rounakdutta121/mediflow");

h1("1. What is MediFlow?");
p(
  "MediFlow is a modern single-hospital operations platform that combines front-office CRM (patients, appointments, queue) with clinical EMR basics and OPD billing. It is built with Next.js, MongoDB Atlas, Auth.js, and role-based permissions so each staff role only sees and does what they should."
);
h2("Phase 1 includes");
bullet([
  "Secure login, JWT sessions, RBAC, notifications, audit trail",
  "Patient registration with UHID, search, and profile",
  "Departments, doctors/staff directory, doctor schedules",
  "Appointment booking, check-in, token queue",
  "Clinical encounters, notes, vitals, diagnoses, signed prescriptions",
  "Service catalogue, invoices, payments/receipts, auto-invoice from priced Rx on sign",
  "Operational dashboard, MTD reports, hospital settings, Help guide",
  "Light/dark theme, responsive UI, mobile sidebar",
]);
h2("Later phases (navigation shells only)");
bullet([
  "Admission & Beds",
  "Laboratory",
  "Pharmacy",
  "Insurance / TPA",
  "Nursing",
]);

h1("2. Demo credentials (IDs & passwords)");
p(
  "Use these accounts after seeding the database (npm run seed). Passwords are case-sensitive."
);
drawTable(
  ["Role", "Email / ID", "Password", "Best for"],
  [
    [
      "Hospital Admin",
      "admin@mediflow.local",
      "Admin@12345",
      "Full access, settings, staff",
    ],
    [
      "Doctor",
      "dr.mehta@mediflow.local",
      "Doctor@12345",
      "EMR, queue, own appointments",
    ],
    [
      "Doctor",
      "dr.khan@mediflow.local",
      "Doctor@12345",
      "Second clinician demo",
    ],
    [
      "Receptionist",
      "reception@mediflow.local",
      "Reception@12345",
      "Patients, booking, queue, billing",
    ],
    [
      "Accountant",
      "accounts@mediflow.local",
      "Accounts@12345",
      "Invoices, payments, reports",
    ],
  ],
  [1.3, 2.4, 1.6, 2.2]
);
p(
  "Roles defined in code but not seeded by default: NURSE, AUDITOR. Admin can create them under Doctors & Staff."
);
h2("Demo hospital defaults (seed)");
bullet([
  "Hospital name: MediFlow General Hospital",
  "Hospital code: MFH",
  "Timezone: Asia/Kolkata · Currency: INR",
  "Sample patient (if present): Rounak Dutta · UHID MFH-001006",
  "Sample services: OPD Consultation, Follow-up, ECG, CBC",
]);
ensureSpace(30);
resetX();
doc
  .fillColor(colors.danger)
  .font("Helvetica-Bold")
  .fontSize(9)
  .text(
    "Security note: Change all demo passwords before any real/production use. Never commit .env.local.",
    left(),
    doc.y,
    { width: contentWidth() }
  );
doc.moveDown(1);
resetX();

h1("3. When to use which module");
drawTable(
  ["Situation", "Open this module", "Who usually uses it"],
  [
    ["New walk-in / registration", "Patients → Register", "Reception"],
    ["Schedule a visit", "Appointments / Patient → Book", "Reception"],
    ["Patient arrived today", "Queue → Check-in", "Reception / Nurse"],
    ["Doctor starts consult", "Queue / Clinical → New", "Doctor"],
    ["Write Rx / vitals / notes", "Clinical → Encounter", "Doctor"],
    ["Collect money / OPD bill", "Billing", "Reception / Accounts"],
    ["Month-to-date KPIs", "Reports / Dashboard", "Admin / Accounts"],
    ["Investigate changes", "Audit", "Admin / Auditor"],
    ["Hospital name, contact, TZ", "Settings", "Admin only"],
    ["How to do workflows", "Help (after Settings)", "All roles"],
    ["Add doctor / change role", "Doctors & Staff", "Admin"],
    ["Add specialty units", "Departments", "Admin"],
  ],
  [2.2, 2.6, 1.8]
);

h1("4. How to use — step by step");
h2("4.1 Sign in");
bullet([
  "Open the app URL (local http://localhost:3000 or your Vercel URL).",
  "Enter email + password from the credentials table.",
  "Optional: use the theme toggle (sun/moon) for light or dark mode.",
  "Sidebar only shows modules your role can access.",
]);
h2("4.2 Register a patient");
bullet([
  "Go to Patients → Register patient (needs patients:write).",
  "Fill first/last name and phone (required). Add allergies/conditions as comma lists.",
  "Save — system assigns a UHID (e.g. MFH-001007).",
  "From profile: Book appointment, Start encounter, Create invoice (only if your role allows).",
]);
h2("4.3 Book an appointment");
bullet([
  "Appointments → Book appointment, or Patient → Book appointment.",
  "Select patient, doctor, department, date, time, type (OPD / follow-up / walk-in / teleconsult).",
  "Save. Appointment appears on the appointments board for that date.",
]);
h2("4.4 Check-in & queue");
bullet([
  "Open Queue (queue:manage).",
  "Check in a scheduled patient for today — token is generated.",
  "Doctors with clinical:write see Start consult; reception typically only manages queue status.",
]);
h2("4.5 Clinical encounter (EMR)");
bullet([
  "Clinical → New encounter, or Start encounter from queue/patient.",
  "Document chief complaint, history, examination, assessment, plan, vitals, diagnosis.",
  "Add prescriptions with optional service/price; signing a priced Rx can auto-create an invoice.",
  "Edit notes/vitals while open; delete only with clinical:write.",
]);
h2("4.6 Billing & payments");
bullet([
  "Billing → Create invoice: pick patient, add catalogue services, discount, save.",
  "Open invoice → Collect payment (cash/card/UPI etc. as available in form).",
  "Status moves draft/issued → partially paid → paid. Balance shows on dashboard.",
]);
h2("4.7 Staff, departments, settings");
bullet([
  "Doctors & Staff: create users with role + password; edit/deactivate (staff:write = Admin).",
  "Departments: create/edit/delete active departments (departments:write = Admin).",
  "Settings: edit hospital name, code, address, phone, email, timezone, currency (settings:manage = Admin).",
]);
h2("4.8 Help page (in app)");
bullet([
  "Open Help from the sidebar (listed after Settings).",
  "Use it as an on-screen checklist for register → book → check-in → consult → bill.",
  "All signed-in roles can open Help; actions still respect RBAC on each module.",
]);
h2("4.9 Notifications");
bullet([
  "Bell icon in the top bar lists targeted alerts (patient, appointment, clinical, billing, system).",
  "Hospital Admin receives all notifications; others receive role-targeted ones.",
  "Mark one read, mark all read, or delete from the panel.",
]);

h1("5. RBAC — roles & permissions");
p(
  "Every page and API is permission-gated. Missing permission → UI hides the action; direct URL redirects to dashboard?error=forbidden; API returns 403."
);
h2("5.1 Permission catalogue");
bullet([
  "dashboard:view — home KPIs",
  "patients:read / patients:write — view vs register/update/delete",
  "appointments:read / appointments:write — list vs book/update/cancel",
  "queue:manage — check-in and queue board",
  "staff:read / staff:write — directory vs create/edit staff",
  "departments:read / departments:write — view vs manage departments",
  "clinical:read / clinical:write — view EMR vs create/edit/sign/delete",
  "billing:read / billing:write — view invoices vs create/pay/delete",
  "reports:view — analytics",
  "audit:view — audit log",
  "settings:manage — hospital configuration",
]);
h2("5.2 Role matrix");
drawTable(
  ["Capability", "Admin", "Reception", "Doctor", "Nurse", "Accounts", "Auditor"],
  [
    ["Dashboard", "Yes", "Yes", "Yes", "Yes", "Yes", "Yes"],
    ["Patients write", "Yes", "Yes", "No", "No", "No", "No"],
    ["Appointments write", "Yes", "Yes", "No", "No", "No", "No"],
    ["Queue", "Yes", "Yes", "Yes", "Yes", "No", "No"],
    ["Clinical write", "Yes", "No", "Yes", "No", "No", "No"],
    ["Billing write", "Yes", "Yes", "No", "No", "Yes", "No"],
    ["Reports", "Yes", "No", "No", "No", "Yes", "Yes"],
    ["Audit", "Yes", "No", "No", "No", "No", "Yes"],
    ["Staff write", "Yes", "No", "No", "No", "No", "No"],
    ["Settings", "Yes", "No", "No", "No", "No", "No"],
    ["Help page", "Yes", "Yes", "Yes", "Yes", "Yes", "Yes"],
  ],
  [1.8, 0.9, 1.1, 0.9, 0.9, 1.0, 0.9]
);

h1("6. Recommended demo script (5–10 minutes)");
bullet([
  "1. Login as Admin — show dashboard KPIs, toggle dark mode, open notifications and Help.",
  "2. Switch to Reception — register a patient, book appointment with Dr Mehta, check-in on Queue.",
  "3. Switch to Doctor — open Queue/Clinical, start encounter, add vitals + Rx with price, sign.",
  "4. Switch to Accounts — open Billing, confirm invoice / collect payment, open Reports.",
  "5. Back to Admin — show Audit trail and editable Hospital settings.",
]);

h1("7. Local & Vercel setup");
h2("Local");
bullet([
  "npm install",
  "Copy .env.example → .env.local and set MONGODB_URI + AUTH_SECRET + AUTH_URL",
  "npm run seed",
  "npm run dev → http://localhost:3000",
]);
h2("Vercel demo");
bullet([
  "Import GitHub repo rounakdutta121/mediflow",
  "Set env: MONGODB_URI, AUTH_SECRET, AUTH_URL (your https://….vercel.app)",
  "Deploy, then run seed once against the same Atlas URI",
  "Atlas network access must allow Vercel (0.0.0.0/0 is typical for demos)",
]);

h1("8. Support & scope notes");
bullet([
  "Phase 1 is single-hospital OPD-focused CRM/ERP foundation.",
  "Admission, lab, pharmacy, insurance, and nursing are placeholders for later phases.",
  "Soft-delete is used for many entities (e.g. patients marked inactive via Delete in UI).",
  "For demos, keep seeded credentials handy; rotate them for any shared public deployment.",
]);

doc.moveDown(0.8);
hr();
resetX();
doc
  .fillColor(colors.ink)
  .font("Helvetica-Bold")
  .fontSize(11)
  .text("End of MediFlow Phase 1 User & Demo Guide", left(), doc.y, {
    width: contentWidth(),
  });
doc
  .fillColor(colors.muted)
  .font("Helvetica")
  .fontSize(9)
  .text("MediFlow — Clinical ops, flowing with clarity.", left(), doc.y, {
    width: contentWidth(),
  });

footer();
doc.end();

await new Promise((resolve, reject) => {
  stream.on("finish", resolve);
  stream.on("error", reject);
});

console.log("PDF written:", OUT);
