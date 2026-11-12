# CareTrack --- Prototype Build Brief for Claude / Antigravity

## Your role

Act as a senior full-stack engineer and product-minded technical lead.
Build a polished, functional, deployable web prototype for the FactWise
Junior Technical Product Manager campus assessment described in this
brief.

Do not merely produce wireframes or a plan. Implement the application,
run it, test the core workflows, fix errors, and provide clear local-run
and deployment instructions. Prefer a clean, dependable MVP over
unnecessary complexity.

## 1. Assessment context

The product is for a virus quarantine and treatment facility.

Facts explicitly stated in the assessment: - The facility has capacity
for 74 patients and is currently at full occupancy. - A patient must
have their temperature measured by a nurse daily. - A doctor must visit
each patient at some point on the same day. - The doctor should visit
after the nurse has recorded the temperature, so the doctor does not
need to take it themselves. - A patient is considered cured when they
have reported three full days without a fever. - The doctor informs
administration when a patient could be discharged. - Administration
processes the discharge. - The facility wants to treat as many patients
as possible and reduce avoidable extra days in the facility. - The
facility wants to monitor treatment quality against a 15% mortality
benchmark / 85% success benchmark. - The assessment asks for user roles,
a working prototype with key workflows, logical constraints, and sprint
prioritisation.

Important gaps in the assessment: - It does not define the numerical
fever threshold. - It does not define measurement units, measurement
method, or the exact local-day cutoff. - It does not define a detailed
clinical escalation protocol. Do not present assumptions as facts. Make
the fever threshold configurable and visibly label the initial value as
a demo assumption that must be confirmed by the head doctor. Use Celsius
in the prototype and clearly state this assumption.

## 2. Product objective

Build **CareTrack**, a facility operations application that makes the
daily care workflow visible and enforceable:

Patient admitted → Nurse records daily temperature → Doctor completes
same-day visit → System evaluates the three-full-day fever-free
criterion → Doctor flags patient as potentially discharge-ready →
Administrator confirms and processes discharge → Bed becomes available.

The app coordinates work and calculates operational eligibility. It must
not diagnose, prescribe treatment, or independently make clinical
decisions.

## 3. User roles and permissions

Implement role-aware navigation and actions for these roles:

### Nurse

-   View active patient list.
-   View a queue of patients whose temperature has not been recorded
    today.
-   Record a patient's temperature, with date/time and nurse identity.
-   View temperature history.
-   Be blocked from recording a second primary reading for the same
    patient on the same facility-local day.
-   In a production design, corrections must be amendments with a reason
    and audit history, not silent overwrites.

### Doctor

-   View patients whose temperature is recorded today but who have not
    yet received today's doctor visit.
-   View temperature history and patient notes.
-   Complete and document a same-day doctor visit only after today's
    temperature exists.
-   Review patients who meet the three-full-day fever-free rule and flag
    them as potentially ready for discharge.
-   Do not allow doctor visit completion before today's temperature
    record exists.

### Administrator

-   Register/admit patients.
-   Assign a unique room/bed.
-   View occupancy and available beds.
-   View patients flagged as discharge-ready by the rule.
-   Process discharge after eligibility is met.
-   Discharge action must release the bed and update occupancy.

### Facility Manager

-   Read-only dashboard for census, task completion, discharges,
    mortality, and success rate.
-   See an alert if observed mortality exceeds 15%.
-   Cannot edit clinical data or process discharges.

For a prototype, a role switcher may simulate the roles. Clearly label
it as a demo-only role selector, not secure authentication. In
production, enforce permissions on the server/API, not only in the UI.

## 4. Required screens

Build responsive desktop and mobile screens:

1.  **Overview dashboard**
    -   Active patients / occupancy out of 74.
    -   Available beds.
    -   Today's temperature completion count.
    -   Today's doctor visit completion count.
    -   Number of patients potentially discharge-ready.
    -   Attention queues for pending temperature and pending doctor
        visit.
    -   Clear warning when capacity is full.
2.  **Patient registry**
    -   Search by patient name or ID.
    -   Filter by active / discharged.
    -   Patient ID, name, age, bed, admission date, today's temperature
        status, today's doctor visit status, and discharge eligibility.
    -   Patient details view with temperature history and visit history.
3.  **Admit patient**
    -   Patient name, age, optional sex/demographic fields, admission
        date, room/bed, and notes.
    -   Generate a unique patient ID.
    -   Block admission if 74 active beds are occupied.
    -   Prevent assigning a bed already occupied by another active
        patient.
    -   Validate required fields.
4.  **Daily workflow**
    -   Separate queue for temperature pending.
    -   Separate queue for doctor visit pending.
    -   Nurse can record a temperature from the first queue.
    -   Doctor can complete a visit from the second queue.
    -   The doctor queue must only contain patients with a valid
        temperature recorded today.
5.  **Temperature entry**
    -   Patient identity and bed visible.
    -   Temperature value in °C.
    -   Optional note.
    -   Record actor and timestamp.
    -   Validate plausible input range; use a sensible UI range and
        explain that clinical validation is still required.
    -   Block duplicate primary reading for the same patient/day and
        show a clear message.
6.  **Doctor consultation**
    -   Show today's recorded temperature.
    -   Require a consultation note.
    -   Prevent completion until today's temperature exists.
    -   Prevent accidental duplicate completion for the same
        patient/day.
7.  **Discharge management**
    -   Show patients meeting the three-full-day fever-free criterion.
    -   Show the three qualifying dates and readings as evidence.
    -   Only Administrator can process discharge.
    -   Require confirmation.
    -   Prevent discharge if patient is not active or eligibility is not
        met.
    -   Release bed and update dashboard after discharge.
    -   Make clear that the system flags operational eligibility;
        authorised staff remain responsible for the discharge decision.
8.  **Outcomes & analytics**
    -   Show deaths, discharges, resolved outcomes, mortality rate, and
        success rate.
    -   Mortality rate = deaths / (deaths + discharges) × 100.
    -   Success rate = discharges / (deaths + discharges) × 100,
        assuming discharge is a successful resolved outcome and death is
        an unsuccessful resolved outcome.
    -   Exclude active patients from resolved-outcome denominator.
    -   If denominator is zero, show N/A, not 0%.
    -   Show numerator, denominator, date range and sample size
        alongside rates.
    -   Trigger a prominent alert only when mortality is greater than
        15%.
    -   State that the alert is a signal for clinical leadership to
        investigate, not proof of treatment failure or causation.
9.  **Rules & assumptions**
    -   Show the configured fever threshold and clearly label it as a
        demo assumption.
    -   Allow an authorised demo configuration change if practical.
    -   Explain key workflow and eligibility rules.

## 5. Business rules and validation

### Temperature / fever

-   Use one primary temperature reading per active patient per
    facility-local calendar day.
-   Duplicate primary reading: block and explain.
-   A reading at or above the configured threshold counts as fever
    (explicitly show this rule).
-   A reading below the threshold counts as fever-free for that recorded
    day.
-   Missing reading means the day cannot count as fever-free.
-   Do not silently overwrite a reading. If editing is implemented, use
    an amendment with old value, new value, reason, actor and timestamp.
-   Store dates/times consistently. For a single-facility MVP, define
    the facility timezone and use it consistently.

### Three full fever-free days

-   Require three consecutive, complete facility-local calendar days
    with valid readings below the configured fever threshold.
-   A fever reading resets the streak.
-   A missing day or gap resets the streak.
-   Do not count the current incomplete day as a full day.
-   Be explicit in the UI about which dates count.
-   Be conservative: eligibility should not be inferred from only two
    completed days plus a partial current day.
-   The assessment does not specify whether additional clinical criteria
    apply; do not invent them. State that the rule is based solely on
    the criterion provided in the brief.

### Doctor visit

-   Doctor visit completion requires today's temperature record.
-   One completed visit per patient per day by default.
-   Require a consultation note.
-   Show separate statuses for temperature and doctor visit.

### Admission / discharge

-   Facility capacity is 74 active patients.
-   One active patient per bed.
-   Admission is blocked when full.
-   Discharge is permitted only for active patients who meet the
    three-full-day rule.
-   Only Administrator processes discharge.
-   Discharge must update occupancy and bed availability immediately.
-   Avoid duplicate discharge actions.

### Permissions / auditability

-   UI should hide or disable actions unavailable to the current role
    and explain why.
-   Record critical events in an audit trail: admission, temperature
    reading, consultation, discharge, configuration change.
-   Demo audit log can be local. Production audit log must be
    server-side and tamper-resistant.

### Mortality benchmark

-   Use resolved outcomes only: discharged + deceased.
-   Mortality rate = deceased / resolved outcomes.
-   Success rate = discharged / resolved outcomes.
-   Do not include currently admitted patients in denominator.
-   If no resolved outcomes, display N/A.
-   Alert when mortality \> 15%, not when it equals 15%.
-   Display sample size because small numbers make the rate volatile.

## 6. UX and design direction

Create a clean, credible healthcare operations dashboard: -
Professional, calm, modern visual design. - Light background, white
cards, restrained blue/teal accents. - Strong typography and readable
data tables. - Clear status chips: Pending, Completed, Discharge-ready,
Discharged, Fever. - Avoid excessive gradients, animations, decorative
illustrations, or overly complex design. - Responsive layout. -
Accessible labels, keyboard-friendly forms, visible validation messages,
and sufficient contrast. - Use realistic fictional demo patients only.
Never include real patient data.

The UI should communicate operational status at a glance. A nurse should
be able to record a temperature in a few clicks; a doctor should
immediately see which patients are ready for review; an administrator
should immediately see discharge-ready patients and free beds.

## 7. Suggested technical implementation

Choose a reliable stack that can be completed quickly. Preferred: -
React + Vite (or Next.js if there is a strong reason). - TypeScript
preferred. - Tailwind CSS or a small consistent CSS system. - For the
assessment prototype, local mock data or localStorage is acceptable if
it works reliably. - Keep data access behind a small service layer so it
can later be replaced by a real API/database. - If adding a backend, use
a straightforward relational schema and document environment
variables. - Do not add complex infrastructure that delays a working
prototype.

Suggested entities: - Patient: id, fullName, age, demographics
(optional), admissionDate, bedId, status, notes, dischargedAt. -
TemperatureReading: id, patientId, measuredAt, localDate, valueCelsius,
recordedBy, note, isAmendment, amendmentReason. - DoctorVisit: id,
patientId, visitedAt, localDate, doctorId, note, status. - Bed: id,
label, activePatientId / occupancy status. - User: id, displayName,
role. - AuditEvent: id, actorId, action, entityType, entityId,
timestamp, metadata. - FacilitySettings: timezone,
feverThresholdCelsius, capacity.

## 8. Seed data and demonstration scenario

Include fictional demo patients that make all key states demonstrable: -
Patient A: active, no temperature today; appears in nurse queue. -
Patient B: active, temperature recorded today but no doctor visit;
appears in doctor queue. - Patient C: active, has three complete
consecutive fever-free days; appears discharge-ready. - Patient D:
active, has a fever reading or a missing day; not discharge-ready. -
Patient E: discharged; bed is free. - At least one patient should have a
historical fever so the streak-reset behaviour can be demonstrated.

Seed data must be internally consistent with the date logic. Include a
reset-demo-data option.

## 9. Acceptance criteria (must test these)

1.  Application starts successfully using documented commands.
2.  Role selector changes available actions and visible queues.
3.  Nurse can record a valid temperature for a pending patient.
4.  Second temperature entry for the same patient/day is blocked.
5.  Doctor can complete a visit after today's temperature is recorded.
6.  Doctor visit before today's temperature is blocked with a clear
    explanation.
7.  Doctor visit requires a note.
8.  A fever reading breaks/resets the fever-free streak.
9.  A missing day breaks the fever-free streak.
10. Three completed consecutive fever-free days cause the patient to be
    flagged as discharge-ready.
11. A partial current day does not count as a completed full day.
12. Administrator can admit a patient when a bed is available.
13. Admission is blocked at 74 active patients.
14. Duplicate active bed assignment is blocked.
15. Administrator can discharge an eligible patient.
16. Discharge is blocked for an ineligible patient.
17. Discharge releases the bed and updates occupancy.
18. Facility Manager can see outcome rates and the \>15% mortality
    alert.
19. Zero resolved outcomes displays N/A.
20. Data remains after refresh in the chosen demo persistence mechanism.

## 10. Deliverables

Produce: - Complete source code in a clean project folder. - A working
application, not screenshots only. - A README with exact setup and run
commands. - A README section with Vercel deployment steps. - A short
demo script (5--7 minutes) showing the key workflow. - A list of
assumptions and known limitations. - If possible, a few basic tests for
the discharge streak and permission rules.

Do not claim the app is deployed unless you actually deploy it. If
deployment requires the user's account, provide exact instructions and
the final build-ready project.

## 11. Suggested 5-minute evaluator demo

1.  Open dashboard and point out 74-bed occupancy, today's task
    completion and discharge-ready count.
2.  Switch to Nurse; record a temperature for a patient in the pending
    queue.
3.  Attempt a duplicate reading; show that the system blocks it.
4.  Switch to Doctor; complete the visit with a note. Show that a
    patient without a reading cannot be marked visited.
5.  Switch to Administrator; show discharge-ready evidence and process
    discharge.
6.  Show the bed count increase.
7.  Switch to Facility Manager; explain mortality denominator and the
    15% alert.
8.  Briefly explain the fever threshold assumption and production
    security gap.

## 12. Sprint prioritisation answer for the assessment

The assessment gives velocity 25 points, with 15 points already
committed, leaving 10 points.

Relative value weights: - Low = 1 - Medium = 3 - High = 6 (High is 2×
Medium; Medium is 3× Low).

The maximum value is 22. A maximum-value, minimum-effort selection is: -
A, B, D, F, G, H, I, J - Effort = 1 + 3 + 2 + 1 + 0.4 + 0.5 + 0.3 + 0.1
= 8.3 points. - Value = 6 + 6 + 3 + 3 + 1 + 1 + 1 + 1 = 22. - Remaining
capacity = 1.7 points.

An alternative A, B, E, F, G, H, I, J also yields value 22 but costs 9.3
points, so the first option achieves the same value with less effort.
Treat this as a 0/1 knapsack problem, assuming features are indivisible,
values are additive, and there are no feature dependencies.

## 13. Build instructions to the AI coding agent

Start by inspecting the repository/workspace. Then: 1. Implement the app
end-to-end. 2. Run it locally and inspect the actual rendered screens.
3. Test every acceptance criterion above; add tests for date streak
logic. 4. Fix all build/runtime errors and broken actions. 5. Ensure
demo seed data is coherent relative to the current date and timezone. 6.
Make the app responsive. 7. Write the README and deployment
instructions. 8. Provide a concise summary of implemented features,
tests run, commands to run locally, and any remaining limitations.

Do not stop after generating a plan. Do not leave placeholder buttons or
non-functional screens. If a requirement cannot be implemented, clearly
identify it and provide the best working alternative.
