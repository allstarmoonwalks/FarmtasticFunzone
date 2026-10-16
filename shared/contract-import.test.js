const CI = require('./contract-import.js'), assert = require('assert');
const base = `                                 2027 AGREEMENT
                               FarmTastic FunZone
                             Steve Allen/April Speight
                      19376 Mary Lane, Montgomery, TX. 77316
                                   936-223-1433

This contract is for personal service of entertainment as describes between
FarmTastic FunZone, here-in-after referred to as Contractor, and Sample County Fair, here-in-after referred to as Contractee.

Contracted dates: February 24-27, 2027
Address of Contractee: 100 Main St., Sampleton, TX 75001
Phone Number: (555)010-0199
Times of Engagements: From open times provided and no later than 10:00 pm
Type of Entertainment:
     ⦁ 4 Entertainment/Educational Booths
       (Plant-A-Seed, Pollination Station, Corn Box, Photo Booth (to dress up and take photos
       is free to the public. To print out cartoon sheets or coloring sheets there is a cost. $3 for
       black and white coloring sheet, $7 for the color version cartoon print)
     ⦁ 4 Days of Entertainment
Requirements:
     ⦁ Level areas for set up
     ⦁ Electricity
     ⦁ Parking for Employees
     ⦁ Entry for Employees
     ⦁ Discounted Host Hotel Rate Recommended

Price Agreed upon:
      4 days of educational entertainment:            $ 4,488.00
      5% Discount for Bundle with Texan Petting Zoo: -$   224.40
      Total Cost of contract:                         $ 4,263.60

       Cost of Retainer 1/3 of contract price:                         $ 1,421.20
       Final Check at Completion of Contract:                          $ 2,842.40

Contractor agrees to deliver educational entertainment on the date, location, time, and of the type
of set up above for and in consideration of the contract price. Contractee agrees to pay the full
contract price for the services of the Contractor.
The parties agree that the retainer is final and non-refundable unless non-appearance is due to the
action of the Contractor.

If the Contractee notifies the Contractor of bad weather prior to the Contractor loading up the
equipment for the appearance, no money is due to the Contractor; however, if the Contractor has
loaded the equipment for the appearance prior to the Contractee notifying the Contractor, one
half (50%) of the contract price is due to the Contractor. IF the Contractor arrives at the
occasion and has proceeded to set up for the appearance the contract price is due even if the
event is unable to continue due to bad weather. After consultation with the authorized personnel
of the Contractee, the Contractor shall make the sole decision regarding weather conditions. The
event, if cancelled due to bad weather, shall be rescheduled on the next available date agreed
upon by the Contractor and Contractee's engagement.

The Contractor will carry One Million Dollars ($1,000,000.00) in liability insurance during the
duration of the contract to insure the equipment, employees, and participants from injuries during
the operation of their contract. Contractor will be held responsible for any and all damages to
property or persons caused by the result of the operation stated in this contract in which the
Contractor or its employees or servants may be negligent. Contractee, its Officers, Directors,
Employees, Agents, and/or Affiliates shall be held responsible for any and all damages and/or
injuries of any nature to any equipment, personnel, employees, participants, and/or patrons
affiliated with the Contractor due to Contractors or patrons’ negligence during or after hours of
the event.

The Contractor and/or its employees or servants shall have the exclusive right to control the
operation of the entertainment or any acts or functions other than those agreed to by the
Contractor, unless approved by the Contractor in advance.

If the Contractee should cancel this agreement outside of twenty (20) days from the engagement,
it is agreed upon that the Contractee should pay the Contractor an amount of money as liquidated
damages in the sum of, at least, the amount of the retainer, but no less than one-third (1/3) of the
contract price. The liquidated damages shall be due and payable on or before ten (10) days from
the cancellation date. If cancellation is within twenty (20) days of the engagement the full
contract amount shall be due to the Contractor. All cancellations must be in writing.

If the Contractee agrees to the entirety of the contract stated above, sign and return this contract
to the Contractor.

Thank you for the opportunity to earn your business. We look forward to working with you to
make 2027 a success for your Fair, the County, and the Community.

Contractee-                    Contractor-
SAMPLE COUNTY FAIR:            FARMTASTIC FUNZONE:
______________________________ April Speight and Steve Allen
PRINTED:____________________ PRINTED: April Speight and Steve Allen
DATE:________________________ DATE:__October 1st 2026____________
`;
let r = CI.parse(base);
assert.equal(r.contractee_name, 'Sample County Fair'); assert.equal(r.start_date, '2027-02-24'); assert.equal(r.end_date, '2027-02-27');
assert.equal(r.street, '100 Main St.'); assert.equal(r.city, 'Sampleton'); assert.equal(r.state, 'TX'); assert.equal(r.zip, '75001');
assert.equal(r.booths, 4); assert.equal(r.days, 4); assert.equal(r.total, 4263.6); assert.equal(r.retainer, 1421.2); assert.equal(r.final, 2842.4);
assert.deepEqual(r.price_lines.map(l => l.amount), [4488, -224.4]); assert.equal(r.signed, false); assert.deepEqual(r.warnings, []);
assert.deepEqual(r.booth_names.slice(0, 4), ['Plant-A-Seed', 'Pollination Station', 'Corn Box', 'Photo Booth']);
// customer-signed variant (printed name + date on the Contractee side)
const signed = base.replace(/PRINTED:_+ PRINTED:/, 'PRINTED: Maria Lopez PRINTED:').replace(/DATE:_+ DATE:/, 'DATE: November 3, 2026 DATE:');
r = CI.parse(signed); assert.equal(r.signed, true); assert.equal(r.signed_name, 'Maria Lopez'); assert.equal(r.signed_date, '2026-11-03');
// our own electronically signed copy
r = CI.parse(base + '\nSigned electronically by Tess Tester, Fair Manager on October 14, 2026 at 6:30 PM.');
assert.equal(r.signed, true); assert.equal(r.signed_name, 'Tess Tester'); assert.equal(r.signed_title, 'Fair Manager'); assert.equal(r.signed_date, '2026-10-14');
// craft station + travel, long event
r = CI.parse(base.replace('4 Days of Entertainment', '12 Days of Entertainment').replace('Contracted dates: February 24-27, 2027', 'Contracted dates: February 27 - March 10, 2027').replace('Price Agreed upon:', 'Price Agreed upon:\n Craft Station add-on: $ 400.00'));
assert.equal(r.days, 12); assert.equal(r.start_date, '2027-02-27'); assert.equal(r.end_date, '2027-03-10'); assert.equal(r.craft, true);
assert.equal(CI.parseDateRange('12/30/2026 - 1/2/2027').end, '2027-01-02'); assert.equal(CI.parseDateRange('October 1st 2026').start, '2026-10-01');
console.log('contract-import ok');
