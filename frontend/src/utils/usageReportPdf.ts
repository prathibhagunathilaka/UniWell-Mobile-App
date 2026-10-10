import type { UsageReport } from '@/services/adminService';

const esc = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const pct = (v: number | null) => (v === null ? 'n/a' : `${v}%`);
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const bars = (rows: { label: string; value: number }[]) => {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return rows.map((r) => `
    <div class="bar"><span class="bl">${esc(r.label)}</span>
      <span class="track"><span class="fill" style="width:${(r.value / max) * 100}%"></span></span>
      <span class="bv">${r.value}</span></div>`).join('');
};

export type UsageReportPdfOptions = {
  report: UsageReport;
  rangeLabel: string;
  sessionTypeLabel: string;
  counsellorLabel: string;
};

// Builds a printable A4 HTML version of the aggregate usage report (same numbers as the screen / CSV).
export const buildUsageReportHtml = ({ report, rangeLabel, sessionTypeLabel, counsellorLabel }: UsageReportPdfOptions) => {
  const t = report.totals;
  const hours = report.byHour.filter((h) => h.hour >= 6 && h.hour <= 21)
    .map((h) => ({ label: `${String(h.hour).padStart(2, '0')}:00`, value: h.count }));

  const satisfaction = report.satisfaction.suppressed
    ? esc(report.satisfaction.reason)
    : `${report.satisfaction.average}/5 average from ${report.satisfaction.responses} anonymous ratings`;

  const checkIns = report.checkIns.suppressed
    ? `<p class="muted">${esc(report.checkIns.reason)}</p>`
    : `<p>${report.checkIns.total} check-ins from ${report.checkIns.participants} students · average ${report.checkIns.averageScore}/5</p>
       ${bars(Object.entries(report.checkIns.levels).map(([label, v]) => ({ label, value: typeof v === 'number' ? v : 0 })))}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #112E3C; margin: 0; padding: 24px; font-size: 11px; }
    h1 { font-size: 22px; margin: 0 0 2px; }
    h2 { font-size: 14px; margin: 18px 0 6px; border-bottom: 2px solid #FF7E5C; padding-bottom: 3px; }
    .sub { color: #55707D; margin: 0 0 14px; font-size: 11px; line-height: 1.5; }
    .muted { color: #55707D; }
    .kpis { display: flex; flex-wrap: wrap; gap: 8px; }
    .kpi { flex: 1 1 22%; border: 1px solid #D9E3E7; border-radius: 8px; padding: 8px 10px; }
    .kpi b { display: block; font-size: 20px; }
    .kpi span { color: #55707D; font-size: 9px; text-transform: uppercase; font-weight: 700; }
    .insights { background: #FFF0EC; border-radius: 8px; padding: 8px 12px; }
    .insights li { margin: 3px 0; }
    .bar { display: flex; align-items: center; gap: 8px; margin: 3px 0; page-break-inside: avoid; }
    .bl { width: 80px; color: #55707D; }
    .track { flex: 1; height: 9px; background: #EAF3F7; border-radius: 5px; overflow: hidden; }
    .fill { display: block; height: 9px; background: #FF7E5C; border-radius: 5px; }
    .bv { width: 28px; text-align: right; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    thead { display: table-header-group; }
    th { text-align: left; background: #EAF3F7; padding: 6px 7px; font-size: 9px; text-transform: uppercase; }
    td { padding: 6px 7px; border-bottom: 1px solid #D9E3E7; }
    tr { page-break-inside: avoid; }
    .cols { display: flex; gap: 16px; } .cols > div { flex: 1; }
    .footer { margin-top: 16px; color: #8FA3AD; font-size: 9px; }
  </style></head><body>
    <h1>UniWell usage report</h1>
    <p class="sub">${esc(rangeLabel)} (${esc(day(report.filters.from))} – ${esc(day(report.filters.to))}) · ${esc(sessionTypeLabel)} · ${esc(counsellorLabel)}<br/>
      Generated ${esc(new Date(report.generatedAt || Date.now()).toLocaleString())}</p>

    <div class="kpis">
      <div class="kpi"><b>${t.bookings}</b><span>Bookings</span></div>
      <div class="kpi"><b>${pct(t.completionRate)}</b><span>Completion rate</span></div>
      <div class="kpi"><b>${pct(t.cancellationRate)}</b><span>Cancellations</span></div>
      <div class="kpi"><b>${pct(t.overallUtilisation)}</b><span>Capacity used · ${t.openSlots} open</span></div>
    </div>

    ${report.insights.length ? `<h2>What the numbers suggest</h2><ul class="insights">${report.insights.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}

    <h2>Peak periods</h2>
    <p class="muted">${report.peak ? `Busiest: ${esc(report.peak.weekday)}s, around ${String(report.peak.hour).padStart(2, '0')}:00` : 'No bookings in this period.'}</p>
    <div class="cols">
      <div><b>By weekday</b>${bars(report.byWeekday.map((d) => ({ label: d.label.slice(0, 3), value: d.count })))}</div>
      <div><b>By hour of day</b>${bars(hours)}</div>
    </div>

    <h2>Counsellor workload</h2>
    ${report.workload.length === 0 ? '<p class="muted">No active counsellors.</p>' : `<table>
      <thead><tr><th>Counsellor</th><th>Bookings</th><th>Completed</th><th>Cancelled</th><th>Upcoming</th><th>Open slots</th><th>Capacity used</th></tr></thead>
      <tbody>${report.workload.map((w) => `<tr><td>${esc(w.name)}</td><td>${w.bookings}</td><td>${w.completed}</td><td>${w.cancelled}</td><td>${w.upcoming}</td><td>${w.openSlots}</td><td>${pct(w.utilisationRate)}</td></tr>`).join('')}</tbody>
    </table>`}

    <h2>Session satisfaction</h2>
    <p>${satisfaction}</p>

    <h2>Student wellbeing (aggregate)</h2>
    ${checkIns}

    <p class="footer">${esc(report.anonymisation)} Exported from UniWell. Aggregate figures only; no individual student is identifiable.</p>
  </body></html>`;
};
