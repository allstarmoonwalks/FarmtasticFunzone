/* Farmtastic Fun Zone — rental agreement. Builds the contract from a customer record + quote + event, and renders it
   to HTML. Browser global (window.ContractDoc) and Node module. The wording below is the owner's 2027 Loredo
   Annual Fair agreement; the merged facts live in `terms` (edited in the CRM before sending).
   The rendered HTML is stored on the contract row when it is created/updated, so later edits to this wording never
   change a contract that was already sent or signed. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ContractDoc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const round2 = n => Math.round((+n || 0) * 100) / 100;
  const usd = n => (n < 0 ? '-' : '') + '$' + Math.abs(+n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const parts = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null; };

  // "February 24-27, 2027" / "February 27 - March 2, 2027" / "December 30, 2026 - January 2, 2027"
  function dateRange(start, end) {
    const a = parts(start), b = parts(end || start);
    if (!a) return '';
    if (!b || (a.y === b.y && a.m === b.m && a.d === b.d)) return `${MONTHS[a.m]} ${a.d}, ${a.y}`;
    if (a.y === b.y && a.m === b.m) return `${MONTHS[a.m]} ${a.d}-${b.d}, ${a.y}`;
    if (a.y === b.y) return `${MONTHS[a.m]} ${a.d} - ${MONTHS[b.m]} ${b.d}, ${a.y}`;
    return `${MONTHS[a.m]} ${a.d}, ${a.y} - ${MONTHS[b.m]} ${b.d}, ${b.y}`;
  }
  const longDate = d => { const p = parts(d); return p ? `${MONTHS[p.m]} ${p.d}, ${p.y}` : ''; };

  const REQUIREMENTS = ['Level areas for set up', 'Electricity', 'Parking for Employees', 'Entry for Employees', 'Discounted Host Hotel Rate Recommended'];
  const PHOTO_NOTE = 'Photo Booth (to dress up and take photos is free to the public. To print out cartoon sheets or coloring sheets there is a cost. $3 for black and white coloring sheet, $7 for the color version cartoon print)';

  // Pull everything the contract needs from the customer record, event and quote.
  function defaults({ org, contact, event, quote, attractions = [] }) {
    const days = quote ? +quote.days : 0, booths = quote ? +quote.booths : +(event && event.booths) || 0;
    const names = attractions.filter(a => a.slug !== 'boots-scoots').map(a => a.name.replace(/!$/, ''));
    const photo = attractions.some(a => a.slug === 'boots-scoots');
    const list = names.concat(photo ? [PHOTO_NOTE] : []);
    const lines = [];
    if (quote) {
      lines.push({ label: `${days} day${days === 1 ? '' : 's'} of educational entertainment`, amount: round2(quote.per_day * days) });
      if (+quote.craft_fee) lines.push({ label: 'Craft Station add-on', amount: round2(quote.craft_fee) });
      if (+quote.travel_fee) lines.push({ label: 'Travel', amount: round2(quote.travel_fee) });
      if (+quote.discount) lines.push({ label: quote.discount_label || 'Discount', amount: -round2(quote.discount) });
    }
    const total = quote ? round2(quote.total) : 0, retainer = round2(total / 3);
    const stZip = [org && org.state, org && org.zip].filter(Boolean).join(' ');
    const addr = [org && org.address, org && org.city, stZip].filter(Boolean).join(', ');
    return {
      contractee_name: (org && org.name) || (contact && contact.name) || '',
      contractee_address: addr,
      contractee_phone: (org && org.phone) || (contact && contact.phone) || '',
      start_date: (event && event.start_date) || '', end_date: (event && event.end_date) || '',
      times_text: 'From open times provided and no later than 10:00 pm',
      entertainment: [
        booths ? `${booths} Entertainment/Educational Booths${list.length ? ' (' + list.join(', ') + ')' : ''}` : '',
        days ? `${days} Day${days === 1 ? '' : 's'} of Entertainment` : '',
      ].filter(Boolean),
      requirements: REQUIREMENTS.slice(),
      price_lines: lines, total, retainer, final: round2(total - retainer),
      contractor_date: longDate(new Date().toISOString().slice(0, 10)),
    };
  }

  const li = a => (a || []).filter(x => String(x).trim()).map(x => `<li>${esc(x)}</li>`).join('');

  function render(t) {
    const year = (parts(t.start_date) || {}).y || '';
    const dates = t.dates_text || dateRange(t.start_date, t.end_date);
    const price = (t.price_lines || []).map(l => `<tr><td>${esc(l.label)}</td><td class="amt">${usd(l.amount)}</td></tr>`).join('');
    return `<div class="contract">
<h1>${year ? esc(year) + ' ' : ''}AGREEMENT</h1>
<p class="center"><b>FarmTastic FunZone</b><br>Steve Allen/April Speight<br>19376 Mary Lane, Montgomery, TX. 77316<br>936-223-1433</p>
<p>This contract is for personal service of entertainment as describes between FarmTastic FunZone, here-in-after referred to as Contractor, and ${esc(t.contractee_name)}, here-in-after referred to as Contractee.</p>
<p><b>Contracted dates:</b> ${esc(dates)}<br><b>Address of Contractee:</b> ${esc(t.contractee_address)}<br><b>Phone Number:</b> ${esc(t.contractee_phone)}<br><b>Times of Engagements:</b> ${esc(t.times_text)}</p>
<p><b>Type of Entertainment:</b></p><ul>${li(t.entertainment)}</ul>
<p><b>Requirements:</b></p><ul>${li(t.requirements)}</ul>
<p><b>Price Agreed upon:</b></p>
<table class="price">${price}<tr class="tot"><td>Total Cost of contract:</td><td class="amt">${usd(t.total)}</td></tr>
<tr><td>Cost of Retainer 1/3 of contract price:</td><td class="amt">${usd(t.retainer)}</td></tr>
<tr><td>Final Check at Completion of Contract:</td><td class="amt">${usd(t.final)}</td></tr></table>
<p>Contractor agrees to deliver educational entertainment on the date, location, time, and of the type of set up above for and in consideration of the contract price. Contractee agrees to pay the full contract price for the services of the Contractor.</p>
<p>The parties agree that the retainer is final and non-refundable unless non-appearance is due to the action of the Contractor.</p>
<p>If the Contractee notifies the Contractor of bad weather prior to the Contractor loading up the equipment for the appearance, no money is due to the Contractor; however, if the Contractor has loaded the equipment for the appearance prior to the Contractee notifying the Contractor, one half (50%) of the contract price is due to the Contractor. IF the Contractor arrives at the occasion and has proceeded to set up for the appearance the contract price is due even if the event is unable to continue due to bad weather. After consultation with the authorized personnel of the Contractee, the Contractor shall make the sole decision regarding weather conditions. The event, if cancelled due to bad weather, shall be rescheduled on the next available date agreed upon by the Contractor and Contractee's engagement.</p>
<p>The Contractor will carry One Million Dollars ($1,000,000.00) in liability insurance during the duration of the contract to insure the equipment, employees, and participants from injuries during the operation of their contract. Contractor will be held responsible for any and all damages to property or persons caused by the result of the operation stated in this contract in which the Contractor or its employees or servants may be negligent. Contractee, its Officers, Directors, Employees, Agents, and/or Affiliates shall be held responsible for any and all damages and/or injuries of any nature to any equipment, personnel, employees, participants, and/or patrons affiliated with the Contractor due to Contractors or patrons’ negligence during or after hours of the event.</p>
<p>The Contractor and/or its employees or servants shall have the exclusive right to control the operation of the entertainment or any acts or functions other than those agreed to by the Contractor, unless approved by the Contractor in advance.</p>
<p>If the Contractee should cancel this agreement outside of twenty (20) days from the engagement, it is agreed upon that the Contractee should pay the Contractor an amount of money as liquidated damages in the sum of, at least, the amount of the retainer, but no less than one-third (1/3) of the contract price. The liquidated damages shall be due and payable on or before ten (10) days from the cancellation date. If cancellation is within twenty (20) days of the engagement the full contract amount shall be due to the Contractor. All cancellations must be in writing.</p>
<p>If the Contractee agrees to the entirety of the contract stated above, sign and return this contract to the Contractor.</p>
<p>Thank you for the opportunity to earn your business. We look forward to working with you to make ${esc(year || 'the season')} a success for your Fair, the County, and the Community.</p>
<table class="sig"><tr><td><b>Contractee-</b><br>${esc(String(t.contractee_name).toUpperCase())}:<div class="sigline" data-sig="contractee"></div></td>
<td><b>Contractor-</b><br>FARMTASTIC FUNZONE:<div class="sigline">April Speight and Steve Allen</div><div class="muted">DATE: ${esc(t.contractor_date)}</div></td></tr></table>
</div>`;
  }

  // The signed block appended under the contract (kept separate from body_html so the stored text never changes).
  function signedBlock({ signed_name, signed_title, signed_at, signed_user_agent }) {
    const imported = /^Imported/i.test(signed_user_agent || '');
    const when = signed_at ? new Date(signed_at).toLocaleString('en-US', imported ? { dateStyle: 'long' } : { dateStyle: 'long', timeStyle: 'short' }) : '';
    return `<div class="signed"><b>${imported ? 'Signed' : 'Signed electronically'}</b> by ${esc(signed_name)}${signed_title ? ', ' + esc(signed_title) : ''} on ${esc(when)}${imported ? ' (from the signed PDF copy)' : ''}.</div>`;
  }

  const CSS = `.contract{font:15px/1.5 Georgia,serif;max-width:760px;margin:auto}.contract h1{text-align:center;font-size:22px;margin:0 0 6px}
.contract .center{text-align:center}.contract ul{margin:4px 0 10px}.contract .price{width:100%;max-width:480px;border-collapse:collapse}
.contract .price td{padding:2px 0}.contract .amt{text-align:right;white-space:nowrap}.contract .tot td{border-top:1px solid #000;font-weight:700}
.contract .sig{width:100%;margin-top:18px}.contract .sig td{width:50%;vertical-align:top;padding-right:12px}
.contract .sigline{border-bottom:1px solid #000;min-height:26px;margin:14px 0 4px}.contract .muted{color:#555;font-size:13px}
.signed{margin:14px auto;max-width:760px;padding:10px 14px;border:2px solid #3f6b2f;border-radius:8px;background:#eef6ea;font:15px system-ui,sans-serif}`;

  return { defaults, render, signedBlock, dateRange, longDate, usd, CSS };
});
