import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing");

  await mongoose.connect(uri);

  const { Hospital } = await import("../src/models/Hospital");
  const { User } = await import("../src/models/User");
  const { Department } = await import("../src/models/Department");
  const { DoctorSchedule } = await import("../src/models/DoctorSchedule");
  const { Service } = await import("../src/models/Service");
  const { Ward } = await import("../src/models/Ward");
  const { Bed } = await import("../src/models/Bed");
  const { Admission } = await import("../src/models/Admission");
  const { Counter } = await import("../src/models/Counter");

  await Promise.all([
    Hospital.deleteMany({}),
    User.deleteMany({}),
    Department.deleteMany({}),
    DoctorSchedule.deleteMany({}),
    Service.deleteMany({}),
    Ward.deleteMany({}),
    Bed.deleteMany({}),
    Admission.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  const hospital = await Hospital.create({
    name: "MediFlow General Hospital",
    code: "MFH",
    address: "12 Health Avenue, Mumbai",
    phone: "+91-22-4000-1000",
    email: "info@mediflow.local",
  });

  const departments = await Department.insertMany([
    { hospitalId: hospital._id, name: "General Medicine", code: "GM" },
    { hospitalId: hospital._id, name: "Pediatrics", code: "PED" },
    { hospitalId: hospital._id, name: "Orthopedics", code: "ORTHO" },
    { hospitalId: hospital._id, name: "Cardiology", code: "CARD" },
  ]);

  const passwordHash = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD || "Admin@12345",
    10
  );

  const admin = await User.create({
    hospitalId: hospital._id,
    email: process.env.SEED_ADMIN_EMAIL || "admin@mediflow.local",
    passwordHash,
    name: "Hospital Admin",
    role: "HOSPITAL_ADMIN",
    employeeCode: "EMP-001",
  });

  const doctorPassword = await bcrypt.hash("Doctor@12345", 10);
  const doctors = await User.insertMany([
    {
      hospitalId: hospital._id,
      email: "dr.mehta@mediflow.local",
      passwordHash: doctorPassword,
      name: "Dr. Ananya Mehta",
      role: "DOCTOR",
      departmentId: departments[0]._id,
      employeeCode: "DOC-001",
      specialization: "General Physician",
      qualification: "MBBS, MD",
    },
    {
      hospitalId: hospital._id,
      email: "dr.khan@mediflow.local",
      passwordHash: doctorPassword,
      name: "Dr. Imran Khan",
      role: "DOCTOR",
      departmentId: departments[3]._id,
      employeeCode: "DOC-002",
      specialization: "Cardiologist",
      qualification: "MBBS, DM Cardiology",
    },
  ]);

  const receptionPassword = await bcrypt.hash("Reception@12345", 10);
  await User.create({
    hospitalId: hospital._id,
    email: "reception@mediflow.local",
    passwordHash: receptionPassword,
    name: "Priya Sharma",
    role: "RECEPTIONIST",
    employeeCode: "REC-001",
  });

  const accountantPassword = await bcrypt.hash("Accounts@12345", 10);
  await User.create({
    hospitalId: hospital._id,
    email: "accounts@mediflow.local",
    passwordHash: accountantPassword,
    name: "Ravi Patel",
    role: "ACCOUNTANT",
    employeeCode: "ACC-001",
  });

  const nursePassword = await bcrypt.hash("Nurse@12345", 10);
  await User.create({
    hospitalId: hospital._id,
    email: "nurse@mediflow.local",
    passwordHash: nursePassword,
    name: "Sunita Nair",
    role: "NURSE",
    employeeCode: "NUR-001",
  });

  for (const doctor of doctors) {
    for (const day of [1, 2, 3, 4, 5, 6]) {
      await DoctorSchedule.create({
        hospitalId: hospital._id,
        doctorId: doctor._id,
        departmentId: doctor.departmentId,
        dayOfWeek: day,
        startTime: "09:00",
        endTime: "13:00",
        slotDurationMinutes: 15,
      });
      await DoctorSchedule.create({
        hospitalId: hospital._id,
        doctorId: doctor._id,
        departmentId: doctor.departmentId,
        dayOfWeek: day,
        startTime: "16:00",
        endTime: "19:00",
        slotDurationMinutes: 15,
      });
    }
  }

  await Service.insertMany([
    {
      hospitalId: hospital._id,
      code: "OPD-CONS",
      name: "OPD Consultation",
      category: "consultation",
      price: 500,
      taxPercent: 0,
    },
    {
      hospitalId: hospital._id,
      code: "OPD-FOLLOW",
      name: "Follow-up Consultation",
      category: "consultation",
      price: 300,
      taxPercent: 0,
    },
    {
      hospitalId: hospital._id,
      code: "ECG",
      name: "ECG",
      category: "procedure",
      price: 400,
      taxPercent: 0,
    },
    {
      hospitalId: hospital._id,
      code: "CBC",
      name: "Complete Blood Count",
      category: "lab",
      price: 350,
      taxPercent: 0,
    },
  ]);

  const wards = await Ward.insertMany([
    {
      hospitalId: hospital._id,
      name: "General Ward A",
      code: "GWA",
      floor: "2",
      genderPolicy: "mixed",
    },
    {
      hospitalId: hospital._id,
      name: "ICU",
      code: "ICU",
      floor: "3",
      genderPolicy: "mixed",
    },
    {
      hospitalId: hospital._id,
      name: "Private Wing",
      code: "PVT",
      floor: "4",
      genderPolicy: "mixed",
    },
  ]);

  const bedDocs = [];
  for (let i = 1; i <= 8; i++) {
    bedDocs.push({
      hospitalId: hospital._id,
      wardId: wards[0]._id,
      bedNumber: String(i).padStart(2, "0"),
      bedType: "general",
      status: "available",
    });
  }
  for (let i = 1; i <= 4; i++) {
    bedDocs.push({
      hospitalId: hospital._id,
      wardId: wards[1]._id,
      bedNumber: `ICU-${i}`,
      bedType: "icu",
      status: "available",
    });
  }
  for (let i = 1; i <= 4; i++) {
    bedDocs.push({
      hospitalId: hospital._id,
      wardId: wards[2]._id,
      bedNumber: `P${i}`,
      bedType: "private",
      status: "available",
    });
  }
  await Bed.insertMany(bedDocs);

  await Counter.create({ _id: `uhid:${hospital._id.toString()}`, seq: 1000 });
  await Counter.create({ _id: `invoice:${hospital._id.toString()}`, seq: 1000 });
  await Counter.create({ _id: `receipt:${hospital._id.toString()}`, seq: 1000 });
  await Counter.create({
    _id: `admission:${hospital._id.toString()}`,
    seq: 1000,
  });

  console.log("Seed complete");
  console.log("Hospital:", hospital.name);
  console.log("Admin:", admin.email, "/", process.env.SEED_ADMIN_PASSWORD || "Admin@12345");
  console.log("Doctor: dr.mehta@mediflow.local / Doctor@12345");
  console.log("Reception: reception@mediflow.local / Reception@12345");
  console.log("Accounts: accounts@mediflow.local / Accounts@12345");
  console.log("Nurse: nurse@mediflow.local / Nurse@12345");
  console.log(`Wards: ${wards.length}, Beds: ${bedDocs.length}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
