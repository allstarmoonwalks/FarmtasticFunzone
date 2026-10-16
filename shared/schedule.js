/* Farmtastic Fun Zone — event times. Turns contract wording like "Wednesday and Thursday 4pm-10pm, Friday and Saturday 4pm-12am"
   into a per-day schedule [{date:'2026-10-21', start:'16:00', end:'22:00'}], and formats a schedule for display.
   Times are 'HH:MM' strings; midnight as an end time is '24:00'. Browser global (window.Schedule) and Node module. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Schedule = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad = n => String(n).padStart(2, '0');
  const dayOf = w => WD.findIndex(d => w.toLowerCase().startsWith(d.toLowerCase()));
  const at = d => new Date(d + 'T12:00:00');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const T = '(\\d{1,2}(?::\\d{2})?\\s*(?:[ap]\\.?m\\.?)?|noon|midnight)';
  const RANGE = new RegExp(T + '\\s*(?:-|–|—|to|until)\\s*' + T, 'i');

  // one time -> {min, mer}; mer is 'am' | 'pm' | '' (unspecified)
  function one(s) {
    s = String(s).trim().toLowerCase();
    if (s === 'noon') return { min: 720, mer: 'pm' };
    if (s === 'midnight') return { min: 0, mer: 'am', mid: true };
    const m = /^(\d{1,2})(?::(\d{2}))?\s*([ap])?\.?m?\.?$/.exec(s);
    if (!m) return null;
    let h = +m[1]; const mi = +(m[2] || 0), mer = m[3] ? m[3] + 'm' : '';
    if (h > 24 || mi > 59) return null;
    if (mer === 'pm' && h < 12) h += 12; if (mer === 'am' && h === 12) h = 0;
    return { min: h * 60 + mi, mer };
  }
  const hhmm = min => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

  // "4pm-10pm", "4-10pm", "10:30 am to 6 pm", "6pm-12am" -> {start:'16:00', end:'22:00'} or null
  function parseRange(text) {
    const m = RANGE.exec(String(text || '')); if (!m) return null;
    const a = one(m[1]), b = one(m[2]); if (!a || !b) return null;
    if (!a.mer && !b.mer && !/:/.test(m[1] + m[2]) && !a.mid && !b.mid) return null; // "21-24" is not a time range
    let s = a.min, e = b.min;
    if (!a.mer && b.mer) { // "4-10pm": start inherits the end's am/pm, unless that would run backwards
      const h = Math.floor(a.min / 60) % 12;
      s = (b.mer === 'pm' ? h + 12 : h) * 60 + (a.min % 60);
      if (s >= e && !(e === 0)) s = h * 60 + (a.min % 60);
    }
    if (e <= s) e += 24 * 60; // 6pm-12am runs to midnight (24:00)
    if (e > 24 * 60) e = 24 * 60;
    return { start: hhmm(s), end: e === 24 * 60 ? '24:00' : hhmm(e) };
  }

  // contract wording -> rules [{days:[0-6]|null, start, end}]  (null days = every day)
  function parseRules(text) {
    const rules = [];
    for (const line of String(text || '').split(/\n|;/)) {
      const r = parseRange(line); if (!r) continue;
      const before = line.slice(0, line.search(RANGE));
      const days = [], tokens = [...before.matchAll(/\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\.?(?:\s*(?:-|–|—|through|thru|to)\s*(sun|mon|tue|wed|thu|fri|sat)[a-z]*)?/gi)];
      for (const t of tokens) {
        const a = dayOf(t[1]);
        if (t[2]) { const b = dayOf(t[2]); for (let d = a; ; d = (d + 1) % 7) { days.push(d); if (d === b) break; } } else days.push(a);
      }
      rules.push({ days: days.length ? [...new Set(days)] : null, ...r });
    }
    return rules;
  }

  // rules + date range -> [{date, start, end}]
  function build(rules, start, end) {
    const out = []; if (!start || !rules || !rules.length) return out;
    const a = at(start), b = at(end || start), n = Math.min(400, Math.round((b - a) / 864e5) + 1);
    for (let i = 0; i < n; i++) {
      const d = new Date(a); d.setDate(a.getDate() + i);
      const r = rules.find(x => x.days && x.days.includes(d.getDay())) || rules.find(x => !x.days);
      if (r) out.push({ date: iso(d), start: r.start, end: r.end });
    }
    return out;
  }

  const fmtTime = t => { let [h, m] = String(t).split(':').map(Number); if (h === 24 || h === 0) return m ? `12:${pad(m)}am` : '12am'; const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return m ? `${h}:${pad(m)}${ap}` : `${h}${ap}`; };
  const fmtRange = s => `${fmtTime(s.start)}–${fmtTime(s.end)}`;
  // compact display: "Wed–Thu 4pm–10pm · Fri–Sat 4pm–12am"
  function format(sched) {
    if (!sched || !sched.length) return '';
    const long = sched.length > 8, label = d => long ? `${MON[at(d).getMonth()]} ${at(d).getDate()}` : WD[at(d).getDay()];
    const runs = [];
    for (const s of sched) {
      const last = runs[runs.length - 1];
      if (last && last.start === s.start && last.end === s.end && Math.round((at(s.date) - at(last.to)) / 864e5) === 1) last.to = s.date;
      else runs.push({ from: s.date, to: s.date, start: s.start, end: s.end });
    }
    return runs.map(r => `${r.from === r.to ? label(r.from) : label(r.from) + '–' + label(r.to)} ${fmtRange(r)}`).join(' · ');
  }
  // editable text: one line per day, "2026-10-21 4pm-10pm"
  const toLines = sched => (sched || []).map(s => `${s.date} ${fmtTime(s.start)}-${fmtTime(s.end)}`).join('\n');
  function fromLines(text) {
    const out = [];
    for (const line of String(text || '').split('\n')) {
      const m = /(\d{4}-\d{2}-\d{2})\s+(.*)$/.exec(line.trim()); if (!m) continue;
      const r = parseRange(m[2]); if (r) out.push({ date: m[1], ...r });
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }
  return { parseRange, parseRules, build, format, fmtTime, fmtRange, toLines, fromLines };
});
