// Minimal RFC 5545 calendar builder (no dependency).
const pad = (n) => String(n).padStart(2, "0");
const stamp = (d) => {
  const x = new Date(d);
  return `${x.getUTCFullYear()}${pad(x.getUTCMonth() + 1)}${pad(x.getUTCDate())}T${pad(x.getUTCHours())}${pad(x.getUTCMinutes())}${pad(x.getUTCSeconds())}Z`;
};
const esc = (v) => String(v ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// Fold lines to 75 octets as required by the spec.
const fold = (line) => {
  const out = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 74) {
    let cut = 74;
    while (Buffer.byteLength(rest.slice(0, cut)) > 74) cut -= 1;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
};

const buildCalendar = (appointments, calendarName = "UniWell Appointments") => {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UniWell//Counsellor Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(calendarName)}`
  ];
  for (const a of appointments) {
    const start = new Date(a.startsAt);
    const end = new Date(start.getTime() + (a.durationMinutes || 30) * 60 * 1000);
    // Privacy: the feed deliberately shows the student's name only, never wellbeing data.
    const who = a.studentId?.name ? a.studentId.name : "Student";
    lines.push(
      "BEGIN:VEVENT",
      `UID:${a._id}@uniwell`,
      `DTSTAMP:${stamp(a.updatedAt || new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${esc(`Counselling: ${who}`)}`,
      `DESCRIPTION:${esc(`Session type: ${a.sessionType}. Status: ${a.status}.`)}`,
      `STATUS:${a.status === "pending" ? "TENTATIVE" : a.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
};

module.exports = { buildCalendar };
