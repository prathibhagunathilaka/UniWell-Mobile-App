import type { AppointmentRecord } from '@/services/counsellingService';

export type ExportFormat = 'table' | 'grid';

export type PdfOptions = {
  format: ExportFormat;
  from: Date; // start of first day (local)
  to: Date; // end of last day (local)
  appointments: AppointmentRecord[]; // already filtered, any order
  counsellorName: string;
  filterSummary: string;
  includeContacts: boolean;
};

const esc = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const DAY = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_LABEL: Record<AppointmentRecord['status'], string> = {
  available: 'Open slot',
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

const STATUS_COLOR: Record<AppointmentRecord['status'], string> = {
  available: '#8FA3AD',
  pending: '#FF7E5C',
  confirmed: '#28745D',
  cancelled: '#A53D35',
  completed: '#55707D',
};

const SESSION_LABEL = { 'in-person': 'In person', online: 'Online', phone: 'Phone' } as const;

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
const dateOf = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const rangeLabel = (from: Date, to: Date) => {
  const f = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  return dayKey(from) === dayKey(to) ? f(from) : `${f(from)} – ${f(to)}`;
};

const sortByStart = (list: AppointmentRecord[]) =>
  [...list].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

const BASE_CSS = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #112E3C; margin: 0; padding: 24px; font-size: 11px; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  .sub { color: #55707D; margin: 0 0 4px; font-size: 12px; }
  .meta { color: #55707D; margin: 0 0 14px; font-size: 10px; }
  .legend { margin: 0 0 10px; font-size: 10px; color: #55707D; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 4px; margin: 0 4px 0 10px; }
  .empty { padding: 30px; text-align: center; color: #55707D; border: 1px dashed #D9E3E7; }
  .footer { margin-top: 14px; color: #8FA3AD; font-size: 9px; }
`;

const header = (o: PdfOptions, title: string) => `
  <h1>${esc(title)}</h1>
  <p class="sub">${esc(o.counsellorName)} · ${esc(rangeLabel(o.from, o.to))}</p>
  <p class="meta">${o.appointments.length} appointment${o.appointments.length === 1 ? '' : 's'} · ${esc(o.filterSummary)} · Generated ${esc(new Date().toLocaleString())}</p>`;

const legend = `<p class="legend">Status:
  ${(['confirmed', 'pending', 'completed', 'available'] as const)
    .map((s) => `<span class="dot" style="background:${STATUS_COLOR[s]}"></span>${STATUS_LABEL[s]}`).join('')}</p>`;

const footer = `<p class="footer">Exported from UniWell. Contains student names and booking times only – never wellbeing or check-in data. Handle according to your privacy policy.</p>`;

const buildTable = (o: PdfOptions) => {
  const rows = sortByStart(o.appointments);
  const body = rows.length === 0
    ? `<div class="empty">No appointments match these filters.</div>`
    : `<table>
        <thead><tr>
          <th>Date</th><th>Time</th><th>Duration</th><th>Student</th>${o.includeContacts ? '<th>Contact</th>' : ''}<th>Session</th><th>Status</th>
        </tr></thead>
        <tbody>${rows.map((a) => `
          <tr>
            <td>${esc(dateOf(a.startsAt))}</td>
            <td>${esc(timeOf(a.startsAt))}</td>
            <td>${a.durationMinutes || 30} min</td>
            <td>${esc(a.studentId?.name || (a.status === 'available' ? '—' : 'Student'))}</td>
            ${o.includeContacts ? `<td>${esc([a.studentId?.email, a.studentId?.phoneNumber].filter(Boolean).join(' · ') || '—')}</td>` : ''}
            <td>${a.studentId ? esc(SESSION_LABEL[a.sessionType] || a.sessionType) : '—'}</td>
            <td><span class="dot" style="background:${STATUS_COLOR[a.status]};margin-left:0"></span>${esc(STATUS_LABEL[a.status])}</td>
          </tr>`).join('')}
        </tbody></table>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${BASE_CSS}
    table { width: 100%; border-collapse: collapse; }
    thead { display: table-header-group; }
    th { text-align: left; background: #EAF3F7; padding: 7px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; }
    td { padding: 7px 8px; border-bottom: 1px solid #D9E3E7; vertical-align: top; }
    tr { page-break-inside: avoid; }
  </style></head><body>${header(o, 'Appointments')}${body}${footer}</body></html>`;
};

const buildGrid = (o: PdfOptions) => {
  const byDay = new Map<string, AppointmentRecord[]>();
  for (const a of sortByStart(o.appointments)) {
    const k = dayKey(new Date(a.startsAt));
    byDay.set(k, [...(byDay.get(k) || []), a]);
  }

  // One month grid for every month the range touches.
  const months: Date[] = [];
  const cursor = new Date(o.from.getFullYear(), o.from.getMonth(), 1);
  while (cursor <= o.to) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const inRange = (d: Date) => d.getTime() >= o.from.getTime() && d.getTime() <= o.to.getTime();

  const monthHtml = months.map((m, idx) => {
    const first = new Date(m.getFullYear(), m.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7; // Monday first
    const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const cells: string[] = [];
    for (let i = 0; i < lead; i += 1) cells.push('<td class="blank"></td>');
    for (let day = 1; day <= daysInMonth; day += 1) {
      const d = new Date(m.getFullYear(), m.getMonth(), day, 12);
      const active = inRange(new Date(m.getFullYear(), m.getMonth(), day, 12));
      const items = active ? byDay.get(dayKey(d)) || [] : [];
      cells.push(`<td class="${active ? '' : 'off'}">
        <div class="num">${day}</div>
        ${items.map((a) => `<div class="evt" style="border-left-color:${STATUS_COLOR[a.status]}"><b>${esc(timeOf(a.startsAt))}</b> ${esc(a.studentId?.name || 'Open slot')}${a.studentId ? `<span class="type"> · ${esc(SESSION_LABEL[a.sessionType] || a.sessionType)}</span>` : ''}</div>`).join('')}
      </td>`);
    }
    while (cells.length % 7 !== 0) cells.push('<td class="blank"></td>');
    const weeks: string[] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(`<tr>${cells.slice(i, i + 7).join('')}</tr>`);

    return `<section class="${idx < months.length - 1 ? 'brk' : ''}">
      <h2>${esc(m.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))}</h2>
      <table class="grid"><thead><tr>${WEEKDAYS.map((w) => `<th>${w}</th>`).join('')}</tr></thead><tbody>${weeks.join('')}</tbody></table>
    </section>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${BASE_CSS}
    h2 { font-size: 15px; margin: 8px 0; }
    .brk { page-break-after: always; }
    table.grid { width: 100%; border-collapse: collapse; table-layout: fixed; }
    table.grid th { background: #112E3C; color: #fff; padding: 5px; font-size: 10px; }
    table.grid td { border: 1px solid #D9E3E7; height: 78px; vertical-align: top; padding: 3px; overflow: hidden; }
    table.grid td.off { background: #F4F6F7; color: #B5C2C8; }
    table.grid td.blank { background: #FAFBFB; }
    tr { page-break-inside: avoid; }
    .num { font-weight: 700; font-size: 10px; margin-bottom: 2px; }
    .evt { font-size: 8.5px; line-height: 1.25; margin-bottom: 2px; padding: 1px 3px; background: #EAF3F7; border-left: 3px solid #28745D; border-radius: 2px; word-break: break-word; }
    .type { color: #55707D; }
  </style></head><body>${header(o, 'Appointment calendar')}${legend}${monthHtml}${footer}</body></html>`;
};

export const buildAppointmentsHtml = (o: PdfOptions) => (o.format === 'grid' ? buildGrid(o) : buildTable(o));

// A4 in points. Table is portrait, the calendar grid is landscape so each day cell has room.
export const pageSize = (format: ExportFormat) =>
  format === 'grid' ? { width: 842, height: 595 } : { width: 595, height: 842 };

export const MAX_RANGE_DAYS = 366;
export const DAY_MS = DAY;
