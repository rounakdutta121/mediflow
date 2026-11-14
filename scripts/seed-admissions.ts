/**
 * Idempotent Phase 2 seed: wards, beds, admission counter, nurse user.
 * Does not wipe existing patients/clinical/billing data.
 */
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
  const { Ward } = await import("../src/models/Ward");
  const { Bed } = await import("../src/models/Bed");
  const { Counter } = await import("../src/models/Counter");

  const hospital = await Hospital.findOne();
  if (!hospital) throw new Error("No hospital found — run npm run seed first");

  const wardCount = await Ward.countDocuments({ hospitalId: hospital._id });
  if (wardCount === 0) {
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
        bedType: "general" as const,
        status: "available" as const,
      });
    }
    for (let i = 1; i <= 4; i++) {
      bedDocs.push({
        hospitalId: hospital._id,
        wardId: wards[1]._id,
        bedNumber: `ICU-${i}`,
        bedType: "icu" as const,
        status: "available" as const,
      });
    }
    for (let i = 1; i <= 4; i++) {
      bedDocs.push({
        hospitalId: hospital._id,
        wardId: wards[2]._id,
        bedNumber: `P${i}`,
        bedType: "private" as const,
        status: "available" as const,
      });
    }
    await Bed.insertMany(bedDocs);
    console.log(`Created ${wards.length} wards and ${bedDocs.length} beds`);
  } else {
    console.log(`Wards already present (${wardCount}) — skipped`);
  }

  const counterId = `admission:${hospital._id.toString()}`;
  const existingCounter = await Counter.findById(counterId);
  if (!existingCounter) {
    await Counter.create({ _id: counterId, seq: 1000 });
    console.log("Created admission counter");
  }

  const nurseEmail = "nurse@mediflow.local";
  const nurse = await User.findOne({ email: nurseEmail });
  if (!nurse) {
    await User.create({
      hospitalId: hospital._id,
      email: nurseEmail,
      passwordHash: await bcrypt.hash("Nurse@12345", 10),
      name: "Sunita Nair",
      role: "NURSE",
      employeeCode: "NUR-001",
    });
    console.log("Created nurse@mediflow.local / Nurse@12345");
  } else {
    console.log("Nurse user already present — skipped");
  }

  await mongoose.disconnect();
  console.log("Admission seed complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
