# CareTrack — Quarantine & Treatment Facility Operations Prototype

CareTrack is a responsive healthcare operations web application built for the FactWise Junior Technical Product Manager assessment. It coordinates the daily care workflow in a 74-bed virus quarantine and treatment facility:

> **Patient admitted** → **Nurse records daily temperature** → **Doctor completes same-day visit** → **System evaluates three-full-day fever-free criterion** → **Doctor endorses readiness** → **Administrator processes discharge & releases bed**

---

## Local Setup & Run Instructions

### Prerequisites
- **Node.js** 20+ (tested on Node v24.15.0)
- **npm** 10+

### Commands
```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev

# 3. Run automated business-rule & workflow unit tests
npm test

# 4. Build for production
npm run build

# 5. Preview the production build locally
npm run preview
```

---

## Vercel Deployment Instructions

CareTrack is a static React + Vite + TypeScript SPA with `vercel.json` pre-configured for client-side routing.

### Option A: Deploy via Vercel Dashboard (Recommended)
1. Push this repository to GitHub, GitLab, or Bitbucket.
2. Log in to [vercel.com](https://vercel.com) and click **Add New → Project**.
3. Import your CareTrack repository.
4. Vercel will auto-detect **Vite**:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Click **Deploy**. No environment variables are required for the demo prototype.

### Option B: Deploy via Vercel CLI
```bash
npm i -g vercel
vercel
# Follow prompts, then deploy to production:
vercel --prod
```

---

## 5–7 Minute Evaluator Demo Script

1. **Overview Dashboard (Initial State — 74/74 Full Occupancy)**
   - Point out `74 / 74` occupancy, `0` available beds, the full-capacity warning banner, today's temperature & doctor visit completion counts, and the discharge-ready count.
2. **Nurse Workflow (`Demo Role: Nurse`)**
   - Open **Daily Workflow** → **Nurse Queue**.
   - Click **Record Temp** for **Patient A (`CT-1001`, Aarav Kulkarni)**, enter `37.1 °C`, and save.
   - Verify the patient moves out of the Nurse Queue and into the **Doctor Queue**.
   - Open `CT-1001` in **Patient Registry** and attempt to record a second primary reading for today → confirm the system blocks duplicate primary readings (amendments with a reason are supported instead).
3. **Doctor Workflow (`Demo Role: Doctor`)**
   - In **Daily Workflow** → **Doctor Queue**, complete a same-day visit for **Patient B (`CT-1002`, Meera Nair)** or `CT-1001` with a required consultation note.
   - Click any patient in the **"Blocked from Doctor Visit (Awaiting Today's Temperature)"** section → confirm the system blocks completion until today's temperature exists.
4. **3-Full-Day Fever-Free Rule & Streak Logic**
   - Inspect **Patient C (`CT-1003`)**: 3 consecutive completed days (`D-3`, `D-2`, `D-1`) below `38.0 °C` → **Discharge-ready**.
   - Inspect **Patient D (`CT-1004`)**: historical fever (`38.6 °C`) reset the streak.
   - Inspect **Patient F (`CT-1005`)**: missing day (`D-2`) reset the streak.
   - Inspect **Patient G (`CT-1006`)**: 2 completed days + partial today → **not** eligible (partial current day does not count).
5. **Administrator Discharge & Admission (`Demo Role: Administrator`)**
   - Open **Admit Patient** while at `74/74` → confirm admission is blocked.
   - Open **Discharge Management**, review **Patient C (`CT-1003`)**'s 3 qualifying dates/readings, and click **Process Discharge**.
   - Confirm occupancy drops to `73 / 74` and `Bed 03` is now free.
   - Return to **Admit Patient** and admit a new patient into `Bed 03` → verify `74 / 74` occupancy updates immediately.
6. **Facility Manager Outcomes & Benchmark (`Demo Role: Facility Manager`)**
   - Open **Outcomes & Analytics** → explain the resolved-outcomes denominator (`Discharged + Deceased`, excluding active patients) and the **>15% Mortality Alert** (`3 / 19 = 15.79%`).
   - Use **Reset Demo → Zero Resolved Outcomes (N/A)** in the top bar to verify `0` resolved outcomes displays `N/A` (not `0%`).
   - Refresh the browser to confirm state persists in `localStorage`.

---

## Key Assumptions & Production Limitations

- **Fever Threshold (Demo Assumption):** Initialized to `38.0 °C` (Celsius). Readings `>= 38.0 °C` count as fever; readings `< 38.0 °C` count as fever-free. Configurable by Administrator in **Rules & Assumptions**, and **must be confirmed by the Head Doctor**.
- **Facility Timezone & Day Cutoff:** Defaults to `Asia/Kolkata` (`YYYY-MM-DD` local calendar day). All temperature and visit uniqueness checks use this single facility-local calendar day.
- **Demo Role Selector vs. Production Auth:** The top-bar role switcher is a **demo-only simulator** for evaluation. Production deployment requires authenticated user accounts and server-side RBAC enforcement on every API endpoint.
- **Persistence & Audit Trail:** Demo state and audit events are stored in browser `localStorage` behind a clean service layer (`src/services/careTrackService.ts`). Production requires a relational database and a tamper-resistant server-side audit log.
- **Clinical Scope:** CareTrack coordinates operational tasks and eligibility rules only; it does not diagnose, prescribe, or replace clinical judgment.
