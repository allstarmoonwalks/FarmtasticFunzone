/* Farmtastic Fun Zone — reads a rental agreement PDF's text (from pdf.js) into structured contract fields.
   Built for the 2027 agreement layout (shared/contract.js). Anything it can't find is left blank and listed in
   `warnings`, so the CRM review screen can ask the admin to fill it in. Browser global (window.ContractImport) + Node module. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ContractImport = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const Sched = (typeof self !== 'undefined' && self.Schedule) || (typeof require === 'function' ? require('./schedule.js') : null);
  const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const monthIdx = s => { s = String(s || '').toLowerCase().replace(/\./g, ''); const i = MONTHS.findIndex(m => m === s || (s.length >= 3 && m.startsWith(s))); return i; };
  const pad = n => String(n).padStart(2, '0');
  const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const clean = s => String(s || '').replace(/[•⦁▪●·]/g, '•').replace(/[ \t ]+/g, ' ').trim();
  const noUnderscores = s => clean(String(s || '').replace(/_+/g, ' ')).replace(/^[:\-\s]+|[:\-\s]+$/g, '');

  // pdf.js text items -> text lines (grouped by baseline, left to right). PDFs often split words/numbers into separate
  // runs, so a space is only added where there is a real gap between runs.
  function itemsToLines(items) {
    const rows = [];
    for (const it of items) {
      if (!it.str) continue;
      const y = Math.round(it.transform[5]);
      let row = rows.find(r => Math.abs(r.y - y) <= 3);
      if (!row) rows.push(row = { y, parts: [] });
      row.parts.push({ x: it.transform[4], w: it.width || 0, h: Math.abs(it.transform[3]) || it.height || 10, s: it.str });
    }
    rows.sort((a, b) => b.y - a.y);
    return rows.map(r => {
      let out = '', end = null;
      for (const p of r.parts.sort((a, b) => a.x - b.x)) {
        if (end !== null && p.x - end > 0.2 * p.h && !/\s$/.test(out) && !/^\s/.test(p.s)) out += ' ';
        out += p.s; end = p.x + p.w;
      }
      return out.replace(/\s+/g, ' ').trim();
    }).filter(Boolean);
  }

  // "February 24-27, 2027", "Feb 27 - March 2, 2027", "December 30, 2026 - January 2, 2027", "2/24/2027 - 2/27/2027", "October 1st 2026"
  function parseDateRange(str) {
    const t = String(str || '').replace(/(\d)(st|nd|rd|th)\b/gi, '$1').replace(/\s+/g, ' ').trim();
    let m;
    if ((m = /([A-Za-z]{3,9})\.? (\d{1,2}) ?[-–—to]+ ?(\d{1,2}),? (\d{4})/.exec(t)) && monthIdx(m[1]) >= 0)
      return { start: iso(+m[4], monthIdx(m[1]), +m[2]), end: iso(+m[4], monthIdx(m[1]), +m[3]) };
    if ((m = /([A-Za-z]{3,9})\.? (\d{1,2}),? (\d{4}) ?[-–—] ?([A-Za-z]{3,9})\.? (\d{1,2}),? (\d{4})/.exec(t)) && monthIdx(m[1]) >= 0 && monthIdx(m[4]) >= 0)
      return { start: iso(+m[3], monthIdx(m[1]), +m[2]), end: iso(+m[6], monthIdx(m[4]), +m[5]) };
    if ((m = /([A-Za-z]{3,9})\.? (\d{1,2}) ?[-–—] ?([A-Za-z]{3,9})\.? (\d{1,2}),? (\d{4})/.exec(t)) && monthIdx(m[1]) >= 0 && monthIdx(m[3]) >= 0)
      return { start: iso(+m[5], monthIdx(m[1]), +m[2]), end: iso(+m[5], monthIdx(m[3]), +m[4]) };
    if ((m = /(\d{1,2})\/(\d{1,2})\/(\d{4}) ?[-–—to]+ ?(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t)))
      return { start: iso(+m[3], +m[1] - 1, +m[2]), end: iso(+m[6], +m[4] - 1, +m[5]) };
    if ((m = /([A-Za-z]{3,9})\.? (\d{1,2}),? (\d{4})/.exec(t)) && monthIdx(m[1]) >= 0) { const d = iso(+m[3], monthIdx(m[1]), +m[2]); return { start: d, end: d }; }
    if ((m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t))) { const d = iso(+m[3], +m[1] - 1, +m[2]); return { start: d, end: d }; }
    return { start: '', end: '' };
  }
  const parseOneDate = s => parseDateRange(s).start;

  // "7128 E. Saunders St., Loredo, TX 78041" -> {address, city, state, zip}. Handles missing commas ("... St. Loredo TX 78041"),
  // "TX." with a period, full state names, ZIP+4, a missing ZIP, and "Suite/Ste/#" parts.
  const STATES = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia' };
  const stateCode = t => { t = String(t || '').replace(/\./g, '').trim(); if (/^[A-Za-z]{2}$/.test(t) && STATES[t.toUpperCase()]) return t.toUpperCase(); const hit = Object.keys(STATES).find(k => STATES[k].toLowerCase() === t.toLowerCase()); return hit || ''; };
  const STATE_RE = '(' + Object.keys(STATES).join('|') + '|' + Object.values(STATES).join('|') + ')';
  const STREET_END = /^(.*?\b(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Hwy|Highway|Pkwy|Parkway|Way|Ct|Court|Cir|Circle|Loop|Trl|Trail|Pl|Place|Pike|Sq|Square|Fwy|Freeway|Rte|Route|Box\s*\d+)\b\.?(?:,?\s+(?:Suite|Ste|Unit|Apt|Bldg|Building|#)\.?\s*[\w-]+)?)[,\s]+(\S.*)$/i;
  function splitAddress(input) {
    let a = clean(input).replace(/\s*,\s*/g, ', ').replace(/[,\s]+$/, ''), state = '', zip = '', m;
    if ((m = new RegExp('(?:^|[,\\s])\\s*' + STATE_RE + '\\.?,?\\s+(\\d{5})(?:-\\d{4})?$', 'i').exec(a))) { state = stateCode(m[1]); zip = m[2]; a = a.slice(0, m.index); }
    else if ((m = new RegExp('(?:^|[,\\s])\\s*' + STATE_RE + '\\.?$', 'i').exec(a)) && stateCode(m[1])) { state = stateCode(m[1]); a = a.slice(0, m.index); }
    else if ((m = /[,\s]\s*(\d{5})(?:-\d{4})?$/.exec(a))) { zip = m[1]; a = a.slice(0, m.index); }
    a = a.replace(/[,\s]+$/, '');
    let street = a, city = '';
    const parts = a.split(/\s*,\s*/);
    if (parts.length >= 2) { city = parts.pop(); street = parts.join(', '); }
    else if ((m = STREET_END.exec(a))) { street = m[1].trim(); city = m[2].trim(); }
    return { address: street.replace(/,$/, '').trim(), city: city.replace(/^[,\s]+|[,\s.]+$/g, ''), state, zip };
  }
  const money = s => { const m = /(-?)\s*\$?\s*(-?)\s*([\d,]+(?:\.\d{1,2})?)/.exec(s); return m ? (m[1] || m[2] ? -1 : 1) * parseFloat(m[3].replace(/,/g, '')) : null; };
  const between = (text, a, b) => { const i = text.search(a); if (i < 0) return ''; const rest = text.slice(i).replace(a, ''); const j = b ? rest.search(b) : -1; return j < 0 ? rest : rest.slice(0, j); };
  const bullets = block => block.split(/•|\n(?=\s*[-*]\s)/).map(x => clean(x.replace(/\n/g, ' ').replace(/^[-*]\s*/, ''))).filter(Boolean);

  function parse(textOrLines) {
    const lines = (Array.isArray(textOrLines) ? textOrLines : String(textOrLines).split(/\r?\n/)).map(clean).filter(Boolean);
    const text = lines.join('\n'), flat = lines.join(' ');
    const out = { warnings: [] };
    const miss = (cond, msg) => { if (cond) out.warnings.push(msg); };

    const ym = /(\d{4})(?:\s*[-–]\s*(\d{4}))?\s+AGREEMENT/i.exec(text);
    out.year = ym ? ym[1] : ''; out.year_end = ym && ym[2] ? ym[2] : '';
    out.subtitle = clean((/^(\d+\s*-\s*YEAR\s+CONTRACT)\s*$/im.exec(text) || [])[1] || '');
    const ymTail = /make\s+((?:\d{4}(?:,\s*|\s+and\s+|,?\s+and\s+)?)+)\s+a\s+success/i.exec(flat);
    out.closing_years = ymTail ? clean(ymTail[1]) : '';
    out.years = out.year_end ? Array.from({ length: +out.year_end - +out.year + 1 }, (_, i) => +out.year + i) : (out.year ? [+out.year] : []);
    let m = /\band\s+([\s\S]+?)\s*,?\s*here\s*-?\s*in\s*-?\s*after\s+referred\s+to\s+as\s+Contractee/i.exec(flat);
    out.contractee_name = m ? clean(m[1]).replace(/,$/, '') : '';
    miss(!out.contractee_name, 'Could not find the customer name.');

    out.dates_text = clean((/Contracted\s+dates?:\s*([^\n]+)/i.exec(text) || [])[1] || '').replace(/\.$/, '');
    out.dates_note = clean(between(text, /Contracted\s+dates?:[^\n]*\n/i, /Address of Contractee:/i).replace(/\n/g, ' '));
    if (!/determined|tbd|to be/i.test(out.dates_note)) out.dates_note = '';
    const dr = parseDateRange(out.dates_text);
    out.start_date = dr.start; out.end_date = dr.end;
    miss(!out.start_date, 'Could not read the contracted dates.');

    const addr = clean(between(text, /Address of Contractee:/i, /Phone(?: Number)?:|Times of Engagements?:|Type of Entertainment:/i).replace(/\n/g, ' ')).slice(0, 200);
    Object.assign(out, { contractee_address: addr }, (() => { const s = splitAddress(addr); return { street: s.address, city: s.city, state: s.state, zip: s.zip }; })());
    out.contractee_phone = clean((/Phone Number:\s*([^\n]*?)(?:\s+Times of Engagements?:|$)/im.exec(text) || [])[1] || '');
    out.times_text = between(text, /Times of Engagements?:/i, /Type of Entertainment:/i).split('\n').map(clean).filter(Boolean).join('\n');
    out.schedule_rules = Sched ? Sched.parseRules(out.times_text) : [];
    out.schedule = Sched ? Sched.build(out.schedule_rules, out.start_date, out.end_date) : [];

    out.entertainment = bullets(between(text, /Type of Entertainment:/i, /Requirements[^:\n]*:/i));
    const reqHead = /Requirements([^:\n]*):/i.exec(text);
    out.requirements_title = reqHead ? clean('Requirements' + reqHead[1]) : 'Requirements';
    out.requirements = bullets(between(text, /Requirements[^:\n]*:/i, /Price Agreed upon:/i));
    const entText = out.entertainment.join(' ');
    m = /(\d+)\s+Entertainment\s*\/\s*Educational\s+Booths?/i.exec(entText); out.booths = m ? +m[1] : 0;
    m = /(\d+)\s+Days?\s+of\s+Entertainment/i.exec(entText); out.days = m ? +m[1] : 0;
    if (!out.days && out.start_date) out.days = Math.round((new Date(out.end_date) - new Date(out.start_date)) / 864e5) + 1;
    miss(!out.booths, 'Could not find the booth count.');

    // booth names inside the first entertainment bullet: "4 Entertainment/Educational Booths (A, B, C (note))"
    const par = /\((.*)\)\s*$/.exec(out.entertainment.find(e => /Booths?/i.test(e)) || '');
    const extras = out.entertainment.filter(e => !/Booths?\b/i.test(e) && !/Days?\s+of\s+Entertainment/i.test(e)).map(e => clean(e.replace(/\(.*$/, ''))).filter(x => x && x.length <= 60);
    out.booth_names = par ? par[1].split(/,(?![^(]*\))/).map(x => clean(x.replace(/\(.*$/, ''))).filter(x => x && x.length <= 40 && !/\$/.test(x)).concat(extras) : extras;

    // price block
    const block = between(text, /Price Agreed upon:/i, /Contractor agrees to deliver|The parties agree/i);
    out.price_lines = []; out.total = 0; out.retainer = 0; out.final = 0;
    for (const raw0 of block.split('\n').map(clean).filter(Boolean)) {
      const raw = raw0.replace(/(\d)\s+(?=[\d,.])/g, '$1').replace(/([,.])\s+(?=\d)/g, '$1');
      const mm = /^(.*?):?\s*(-?)\s*\$\s*(-?)\s*([\d,]+(?:\.\d{1,2})?)\s*$/.exec(raw);
      if (!mm) continue;
      const label = clean(mm[1]).replace(/:$/, ''), amt = (mm[2] || mm[3] ? -1 : 1) * parseFloat(mm[4].replace(/,/g, ''));
      if (/retainer/i.test(label)) { out.retainer = amt; out.retainer_label = label; }
      else if (/final\s+check|due\s+(?:up)?on\s+completion|at\s+completion|balance/i.test(label)) { out.final = amt; out.final_label = label; }
      else if (/cost\s+of\s+package|package\s+(?:cost|price|total)|sub-?total/i.test(label)) { out.package_total = amt; out.package_label = label; }
      else if (/total\s+cost|final\s+price|price\s+of\s+contract|contract\s+(?:price|total)/i.test(label)) { out.total = amt; out.total_label = label; }
      else out.price_lines.push({ label, amount: amt });
    }
    const sum = Math.round(out.price_lines.reduce((a, l) => a + l.amount, 0) * 100) / 100;
    if (!out.total && out.price_lines.length) out.total = sum;
    miss(!out.price_lines.length, 'Could not find the price lines.');
    miss(out.total && out.price_lines.length && Math.abs(sum - out.total) > 0.01, `The price lines add up to $${sum.toFixed(2)} but the contract total says $${out.total.toFixed(2)}.`);
    if (out.total && !out.retainer) out.retainer = Math.round(out.total / 3 * 100) / 100;
    if (out.total && !out.final) out.final = Math.round((out.total - out.retainer) * 100) / 100;
    out.per_year = /per\s+year/i.test(block);
    out.craft = /craft/i.test(entText + ' ' + block);

    // contractor date + signature
    const cd = /DATE:\s*(.*?)\s*DATE:\s*(.*)$/im.exec(text);
    out.contractor_date = cd ? noUnderscores(cd[2]) : '';
    const pr = /PRINTED:\s*(.*?)\s*PRINTED:\s*(.*)$/im.exec(text);
    let signedName = pr ? noUnderscores(pr[1]) : '', signedDate = cd ? noUnderscores(cd[1]) : '';
    const e = /Signed electronically by\s+(.+?)(?:,\s*([^,]+?))?\s+on\s+([A-Za-z]+ \d{1,2}, \d{4})/i.exec(flat);
    if (e) { signedName = clean(e[1]); signedDate = e[3]; out.signed_title = e[2] ? clean(e[2]) : ''; }
    out.signed_name = /[A-Za-z]{2}/.test(signedName) && !/^(April Speight|Steve Allen)/i.test(signedName) ? signedName : '';
    out.signed_date = out.signed_name ? parseOneDate(signedDate) : '';
    out.signed = !!out.signed_name;
    return out;
  }

  return { itemsToLines, parse, parseDateRange, splitAddress, money, iso };
});
