/**
 * Demo / test data seeder for UniWell (development only).
 *
 *   node src/utils/seedDemo.js
 *
 * Creates everything needed to walk through a complete student, counsellor and admin journey:
 * accounts, counsellor availability, appointments in every status, check-ins, notifications,
 * ratings and resources. Safe to re-run: it removes the previous demo data (accounts using the
 * @demo.uniwell.test email domain, plus their appointments, check-ins and notifications) and
 * rebuilds it with fresh dates. Real accounts are never touched.
 */
require("dotenv").config();

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const Appointment = require("../models/Appointment");
const CheckIn = require("../models/CheckIn");
const Notification = require("../models/Notification");
const { seedResources } = require("./seedResources");

const DEMO_DOMAIN = "@demo.uniwell.test";
const DEMO_PASSWORD = "Demo@1234"; // meets the app's password rules
const SL_OFFSET_MS = 330 * 60 * 1000; // Sri Lanka, UTC+5:30
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// Small deterministic PRNG so every run produces the same shape of data.
const makeRng = (seed) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
};
const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const weighted = (rng, entries) => {
  const total = entries.reduce((n, [, w]) => n + w, 0);
  let r = rng() * total;
  for (const [value, w] of entries) {
    r -= w;
    if (r <= 0) return value;
  }
  return entries[entries.length - 1][0];
};

const moodMap = { "Very Low": 1, Low: 2, Okay: 3, Good: 4, "Very Good": 5 };
const stressMap = { "Very Low": 5, Low: 4, Moderate: 3, High: 2, "Very High": 1 };
const sleepMap = { "Very Poor": 1, Poor: 2, Okay: 3, Good: 4, "Very Good": 5 };
const copingMap = { "Very Difficult": 1, Difficult: 2, Okay: 3, Well: 4, "Very Well": 5 };
const moods = Object.keys(moodMap);
const stresses = Object.keys(stressMap);
const sleeps = Object.keys(sleepMap);
const copings = Object.keys(copingMap);

const wellbeing = ({ mood, stressLevel, sleepQuality, studyCoping }) => {
  const score = (moodMap[mood] + stressMap[stressLevel] + sleepMap[sleepQuality] + copingMap[studyCoping]) / 4;
  const level = score >= 4.1 ? "Positive" : score >= 3.1 ? "Doing Okay" : score >= 2.1 ? "Moderate" : "Needs Support";
  return { wellbeingScore: Number(score.toFixed(2)), wellbeingLevel: level };
};

const buildDataset = (now = Date.now()) => {
  const rng = makeRng(2026);
  const slotKeysFor = (t) => [new Date(t), new Date(t + 15 * MIN)];

  // Instant of "today 00:00" in Sri Lanka.
  const slNow = now + SL_OFFSET_MS;
  const todayStart = slNow - (slNow % DAY) - SL_OFFSET_MS;
  const at = (dayOffset, hour, minute = 0) => todayStart + dayOffset * DAY + (hour * 60 + minute) * MIN;
  const weekdayOf = (t) => new Date(t + SL_OFFSET_MS).getUTCDay();

  const counsellors = [
    { key: "c1", name: "Ms. Dilani Fernando", email: `dilani.fernando${DEMO_DOMAIN}`, qualification: "MSc Counselling Psychology", specialization: "Academic stress and exam anxiety", yearsOfExperience: 6, phoneNumber: "0771000001", status: "active" },
    { key: "c2", name: "Dr. Kasun Perera", email: `kasun.perera${DEMO_DOMAIN}`, qualification: "PhD Clinical Psychology", specialization: "Anxiety, low mood and burnout", yearsOfExperience: 11, phoneNumber: "0771000002", status: "active" },
    { key: "c3", name: "Ms. Nadeesha Silva", email: `nadeesha.silva${DEMO_DOMAIN}`, qualification: "MA Counselling", specialization: "Sleep, relationships and time management", yearsOfExperience: 4, phoneNumber: "0771000003", status: "active" },
    // Pending on purpose, so the admin approval journey can be tried.
    { key: "c4", name: "Mr. Ruwan Jayasena", email: `ruwan.jayasena${DEMO_DOMAIN}`, qualification: "BSc Psychology, Dip. Counselling", specialization: "Career guidance and motivation", yearsOfExperience: 2, phoneNumber: "0771000004", status: "pending" }
  ];

  const faculties = ["Computing", "Engineering", "Business", "Humanities & Sciences"];
  const students = Array.from({ length: 8 }, (_, i) => ({
    key: `s${i + 1}`,
    name: ["Hirushi Kariyawasam", "Amal Rathnayake", "Sithara Wijesinghe", "Nimal Fonseka", "Tharushi Gamage", "Kavindu Senanayake", "Ishara De Silva", "Pasan Liyanage"][i],
    email: `student${i + 1}${DEMO_DOMAIN}`,
    studentId: `IT2400${String(i + 1).padStart(4, "0")}`,
    faculty: faculties[i % faculties.length],
    year: (i % 4) + 1,
    phoneNumber: `07720000${String(i + 1).padStart(2, "0")}`,
    ...(i === 0 ? { trustedPerson: { name: "Kumari Kariyawasam", phoneNumber: "0711234567", relationship: "Mother" } } : {})
  }));

  const admin = { key: "admin", name: "Demo Administrator", email: `admin${DEMO_DOMAIN}`, username: "demoadmin", role: "admin" };

  // ---- Appointments -------------------------------------------------------------------------
  const appointments = [];
  const usedCounsellor = new Set();
  const usedStudent = new Set();
  const claim = (c, s, t, reserves) => {
    if (!reserves) return true;
    const ck = `${c}|${t}`;
    const sk = `${s}|${t}`;
    if (usedCounsellor.has(ck) || (s && usedStudent.has(sk))) return false;
    usedCounsellor.add(ck);
    if (s) usedStudent.add(sk);
    return true;
  };
  const add = (c, s, t, status, extra = {}) => {
    const reserves = status !== "cancelled";
    if (!claim(c, s, t, reserves)) return null;
    const record = { c, s, startsAt: t, status, sessionType: extra.sessionType || "online", ...extra };
    appointments.push(record);
    return record;
  };

  // Student 1's complete journey (Hirushi, the persona from Milestone 1).
  add("c1", "s1", at(-14, 10, 0), "completed", { feedbackRating: 5, shareCheckIn: true, tag: "completed + rated" });
  add("c1", "s1", at(-7, 10, 30), "completed", { tag: "completed, not rated yet (try the star rating)" });
  add("c1", "s1", at(-3, 11, 0), "cancelled", { cancelledBy: "student", tag: "cancelled by student" });
  add("c1", "s1", at(-2, 14, 0), "cancelled", { cancelledBy: "counsellor", tag: "cancelled by counsellor" });
  add("c1", "s1", at(1, 10, 0), "confirmed", { shareCheckIn: true, sessionType: "in-person", tag: "confirmed tomorrow (shared check-in visible to counsellor)" });
  add("c2", "s1", at(3, 11, 0), "pending", { tag: "pending: counsellor 2 must confirm" });
  add("c3", "s1", at(5, 15, 0), "confirmed", { sessionType: "phone", tag: "confirmed, phone session" });

  // A session starting within the hour so reminders fire as soon as the server runs.
  const soon = Math.ceil((now + 45 * MIN) / (15 * MIN)) * 15 * MIN;
  add("c1", "s2", soon, "confirmed", { tag: "starts in under 1 hour (reminder demo)" });

  // Waiting-for-confirmation requests for counsellor 1 to action.
  add("c1", "s3", at(2, 9, 0), "pending", { tag: "pending request" });
  add("c1", "s4", at(2, 9, 30), "pending", { sessionType: "phone", tag: "pending request" });

  // History for the admin reports (peaks on Tue/Thu around 10:00 and 14:00).
  const counsellorKeys = ["c1", "c2", "c3"];
  let guard = 0;
  while (appointments.filter((a) => a.startsAt < now).length < 70 && guard < 3000) {
    guard += 1;
    const dayOffset = -Math.ceil(rng() * 75);
    const day = at(dayOffset, 0);
    const dow = weekdayOf(day);
    if (dow === 0 || dow === 6) continue;
    const peakBoost = dow === 2 || dow === 4 ? 3 : 1;
    if (rng() * 3 > peakBoost) continue;
    const hour = weighted(rng, [[9, 2], [10, 5], [11, 3], [14, 4], [15, 3], [16, 1]]);
    const minute = pick(rng, [0, 30]);
    const status = weighted(rng, [["completed", 66], ["cancelled", 20], ["confirmed", 4]]); // confirmed in the past = never closed
    const rating = status === "completed" && rng() < 0.65 ? weighted(rng, [[5, 5], [4, 4], [3, 2], [2, 1]]) : null;
    add(
      pick(rng, counsellorKeys),
      pick(rng, students.map((s) => s.key)),
      at(dayOffset, hour, minute),
      status,
      {
        sessionType: weighted(rng, [["online", 5], ["in-person", 3], ["phone", 1]]),
        ...(status === "cancelled" ? { cancelledBy: rng() < 0.7 ? "student" : "counsellor" } : {}),
        ...(rating ? { feedbackRating: rating } : {})
      }
    );
  }

  // Extra upcoming bookings from other students so calendars look lived-in.
  [
    ["c2", "s5", at(1, 14, 0), "confirmed"],
    ["c2", "s6", at(2, 10, 0), "confirmed"],
    ["c3", "s7", at(1, 11, 0), "pending"],
    ["c3", "s8", at(4, 9, 30), "confirmed"],
    ["c2", "s3", at(6, 15, 30), "pending"]
  ].forEach(([c, s, t, st]) => add(c, s, t, st));

  // Open slots, 14 weekdays ahead, skipping anything already booked.
  const slotTimes = [[9, 0], [9, 30], [10, 0], [10, 30], [11, 0], [11, 30], [14, 0], [14, 30], [15, 0], [15, 30], [16, 0]];
  for (const c of counsellorKeys) {
    for (let d = 0; d <= 14; d += 1) {
      if ([0, 6].includes(weekdayOf(at(d, 12)))) continue;
      for (const [h, m] of slotTimes) {
        const t = at(d, h, m);
        if (t <= now + 30 * MIN) continue;
        if (usedCounsellor.has(`${c}|${t}`)) continue;
        usedCounsellor.add(`${c}|${t}`);
        appointments.push({ c, s: null, startsAt: t, status: "available", sessionType: "online" });
      }
    }
  }

  // ---- Check-ins (8 students, ~8 each over 30 days, enough for the anonymised report) ---------
  const checkIns = [];
  students.forEach((student, idx) => {
    const base = idx === 0 ? 1.8 : 2 + (idx % 4) * 0.6; // student 1 starts low and improves
    for (let n = 0; n < 8; n += 1) {
      const drift = idx === 0 ? n * 0.4 : (rng() - 0.5) * 0.8;
      const target = Math.min(5, Math.max(1, Math.round(base + drift)));
      const jitter = () => Math.min(5, Math.max(1, target + Math.round((rng() - 0.5) * 2)));
      const mood = moods[jitter() - 1];
      const stressLevel = stresses[5 - jitter()];
      const sleepQuality = sleeps[jitter() - 1];
      const studyCoping = copings[jitter() - 1];
      const daysAgo = 29 - n * 4 + (idx % 3);
      checkIns.push({
        s: student.key,
        mood,
        stressLevel,
        sleepQuality,
        studyCoping,
        note: n % 3 === 0 ? "Busy week with assignments." : "",
        createdAt: new Date(at(-daysAgo, 18 + (n % 3), 15)),
        ...wellbeing({ mood, stressLevel, sleepQuality, studyCoping })
      });
    }
  });

  return { counsellors, students, admin, appointments, checkIns, DEMO_PASSWORD, DEMO_DOMAIN };
};

const run = async () => {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to seed demo data in production.");
    process.exit(1);
  }
  await connectDB();
  if (mongoose.connection.readyState !== 1) {
    console.error("MongoDB is not connected. Check MONGODB_URI in your .env file.");
    process.exit(1);
  }

  // 1. Remove previous demo data (only accounts using the demo email domain).
  const oldUsers = await User.find({ email: new RegExp(`${DEMO_DOMAIN.replace(".", "\\.")}$`, "i") }).select("_id");
  const oldIds = oldUsers.map((u) => u._id);
  if (oldIds.length) {
    await Appointment.deleteMany({ $or: [{ counsellorId: { $in: oldIds } }, { studentId: { $in: oldIds } }] });
    await CheckIn.deleteMany({ studentId: { $in: oldIds } });
    await Notification.deleteMany({ userId: { $in: oldIds } });
    await User.deleteMany({ _id: { $in: oldIds } });
  }

  // 2. Resources (the app's own seeder only fills an empty collection).
  await seedResources();

  const data = buildDataset();
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);

  // 3. Accounts
  const idOf = {};
  for (const c of data.counsellors) {
    const { key, ...fields } = c;
    const doc = await User.create({ ...fields, password, role: "counsellor", isActive: true });
    idOf[key] = doc._id;
  }
  for (const s of data.students) {
    const { key, ...fields } = s;
    const doc = await User.create({ ...fields, password, role: "student", isActive: true, status: "active" });
    idOf[key] = doc._id;
  }
  const adminDoc = await User.create({ name: data.admin.name, email: data.admin.email, username: data.admin.username, password, role: "admin", isActive: true, status: "active" });
  idOf.admin = adminDoc._id;

  // 4. Appointments (reminder flags are pre-set for past sessions so they are not re-notified)
  const now = Date.now();
  const appointmentDocs = data.appointments.map((a) => {
    const past = a.startsAt <= now;
    return {
      counsellorId: idOf[a.c],
      studentId: a.s ? idOf[a.s] : null,
      startsAt: new Date(a.startsAt),
      slotKeys: [new Date(a.startsAt), new Date(a.startsAt + 15 * MIN)],
      durationMinutes: 30,
      sessionType: a.sessionType,
      status: a.status,
      reservesSlot: a.status !== "cancelled",
      shareCheckIn: Boolean(a.shareCheckIn),
      cancelledBy: a.cancelledBy || null,
      cancelledAt: a.cancelledBy ? new Date(Math.min(now, a.startsAt - DAY)) : null,
      feedbackRating: a.feedbackRating || null,
      feedbackAt: a.feedbackRating ? new Date(a.startsAt + HOUR) : null,
      reminder24Sent: past,
      reminder1hSent: past
    };
  });
  const inserted = await Appointment.insertMany(appointmentDocs);

  // 5. Check-ins
  await CheckIn.insertMany(
    data.checkIns.map(({ s, ...rest }) => ({ ...rest, studentId: idOf[s] }))
  );

  // 6. Notifications for the two main demo users (more are created automatically by the app)
  const find = (tag) => {
    const index = data.appointments.findIndex((a) => a.tag === tag);
    return index >= 0 ? inserted[index]._id : null;
  };
  const ago = (ms) => new Date(now - ms);
  await Notification.insertMany([
    { userId: idOf.s1, type: "booking_confirmed", title: "Session confirmed", body: "Your counsellor has confirmed your session tomorrow at 10:00 AM.", appointmentId: find("confirmed tomorrow (shared check-in visible to counsellor)"), createdAt: ago(2 * HOUR) },
    { userId: idOf.s1, type: "booking_completed", title: "Session completed", body: "Your session was marked as completed. Don't forget to do a check-in this week.", appointmentId: find("completed, not rated yet (try the star rating)"), readAt: ago(6 * DAY), createdAt: ago(7 * DAY) },
    { userId: idOf.s1, type: "booking_cancelled", title: "Session cancelled", body: "Your counsellor has cancelled your session.", appointmentId: find("cancelled by counsellor"), readAt: ago(DAY), createdAt: ago(2 * DAY) },
    { userId: idOf.c1, type: "booking_created", title: "New booking added to your calendar", body: "A student booked a session. Please confirm it.", appointmentId: find("pending request"), createdAt: ago(3 * HOUR) },
    { userId: idOf.c1, type: "booking_cancelled", title: "A student cancelled", body: "A session was cancelled and the time is open again.", appointmentId: find("cancelled by student"), readAt: ago(2 * DAY), createdAt: ago(3 * DAY) }
  ].filter((n) => n.appointmentId));

  const summary = {
    accounts: data.counsellors.length + data.students.length + 1,
    appointments: data.appointments.length,
    openSlots: data.appointments.filter((a) => a.status === "available").length,
    checkIns: data.checkIns.length
  };
  console.log("\nDemo data created:", summary);
  console.log(`\nAll demo accounts use the password:  ${DEMO_PASSWORD}\n`);
  console.log("  Student    student1" + DEMO_DOMAIN + "  (Hirushi, full journey; student2..8 also exist)");
  console.log("  Counsellor dilani.fernando" + DEMO_DOMAIN + "  (busiest calendar; also kasun.perera / nadeesha.silva)");
  console.log("  Admin      username: demoadmin   (or admin" + DEMO_DOMAIN + ")");
  console.log("  Pending    ruwan.jayasena" + DEMO_DOMAIN + "  (counsellor waiting for admin approval)\n");
  await mongoose.disconnect();
};

module.exports = { buildDataset };

if (require.main === module) {
  run().catch(async (error) => {
    console.error("Seeding failed:", error.message);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
  });
}
