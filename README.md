# CareTrack

CareTrack is a web application for managing daily patient care, bed occupancy, discharge eligibility, and outcome metrics in a 74-bed quarantine and treatment facility.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Testing:** Vitest
- **Persistence:** Browser `localStorage` behind a modular service layer (`src/services/careTrackService.ts`)
- **Deployment:** Static SPA configured for Vercel (`vercel.json`)

## Core Features

- **Role-Aware Operations:** Supports Nurse, Doctor, Administrator, and Facility Manager views via a demo role selector.
- **Daily Care Workflow:**
  - Enforces one primary temperature reading per active patient per facility-local calendar day (with audited amendments for corrections).
  - Requires today's temperature reading and a consultation note before a Doctor can complete a same-day visit.
- **Discharge Eligibility Engine:**
  - Evaluates the three consecutive completed fever-free days criterion (`< 38.0 °C` default, configurable).
  - Excludes the incomplete current calendar day and resets the streak on any fever reading or missing day.
- **Bed & Capacity Management:** Tracks 74 beds, blocks admissions at full capacity or on occupied beds, and releases beds upon administrative discharge.
- **Outcomes & Audit Trail:** Calculates mortality and success rates over resolved outcomes only (discharged + deceased), displays `N/A` when resolved outcomes are zero, alerts when mortality exceeds `15%`, and logs key operational events.

## Local Setup & Commands

### Prerequisites
- Node.js 20+
- npm 10+

### Run Locally
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run unit tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview
```

## Vercel Deployment

1. Import the repository into [Vercel](https://vercel.com).
2. Use the auto-detected **Vite** configuration:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Deploy (no environment variables required).

Or via Vercel CLI:
```bash
npm i -g vercel
vercel --prod
```

## Technical Notes & Assumptions

- **Fever Threshold:** Defaults to `38.0 °C` (Celsius), configurable by Administrator in **Rules & Assumptions**.
- **Facility Timezone:** Defaults to `Asia/Kolkata` (`YYYY-MM-DD` local calendar day).
- **Prototype Scope:** Uses a client-side demo role switcher and `localStorage` persistence; production deployment would require server-side authentication/RBAC and a relational database with server-side audit logging.
