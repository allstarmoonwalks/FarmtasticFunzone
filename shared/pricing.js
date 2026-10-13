/* Farmtastic Fun Zone — pricing rules as plain functions. Mirrors pricing.html.
   Works as a browser global (window.FarmPricing) and as a Node module.
   Craft Station add-on: $200/day under 10 days; flat $400 per event at 10+ days (confirmed by owner). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FarmPricing = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const GRID = {
    short: { 4: 1222, 6: 1372, 8: 1522, 10: 1700 },
    long:  { 4: 900,  6: 1050, 8: 1200, 10: 1388 },
  };
  const DEFAULTS = { longMinDays: 10, craftShortPerDay: 200, craftLongFlat: 400, depositPct: 25 };
  const round2 = n => Math.round(n * 100) / 100;

  function quote({ booths, days, craft = false, travelFee = 0, discount = 0 }, cfg) {
    const c = { ...DEFAULTS, ...(cfg || {}) };
    days = Math.max(1, Math.floor(+days || 0));
    const band = days >= c.longMinDays ? 'long' : 'short';
    const perDay = GRID[band][booths];
    if (perDay == null) throw new Error('Unsupported booth count: ' + booths);
    const base = perDay * days;
    const craftFee = craft ? (band === 'long' ? c.craftLongFlat : c.craftShortPerDay * days) : 0;
    const total = round2(base + craftFee + (+travelFee || 0) - (+discount || 0));
    return { band, perDay, days, base, craftFee, travelFee: +travelFee || 0, discount: +discount || 0,
             total, deposit: round2(total * c.depositPct / 100) };
  }
  return { GRID, DEFAULTS, quote };
});
