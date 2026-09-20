# DNA Health Pharmacy Cold-Chain Interoperability Hub (IPD)

An authentic, production-grade inpatient hospital pharmacy cold-chain dispatch and healthcare interoperability platform connecting nurse medication indents, EHR FHIR prescriptions, legacy HL7 v2 order feeds, NIH RxNorm validation, and de-identified nurse floor delivery alerts.

Built for the **DNA Health Vibe Coder Selection Process (Case 1: Pharmacy Cold Chain to Inpatient Floor)**.

---

## 🏗️ Architecture Overview

The system transitions all clinical authority, standards verification, and access controls to an authenticated backend, backed by PostgreSQL and Prisma:

```
Vite / React UI  <-->  Express Backend API (:3001)  <-->  PostgreSQL (Prisma ORM)
                                |
       +------------------------+------------------------+
       |                        |                        |
       v                        v                        v
 HAPI FHIR R4           NIH NLM RxNav / RxNorm     HL7 v2 Parser Engine
 (MedicationRequest,      (RxCUI, SCD, IN,        (@redoxengine/redox-hl7-v2
  MedicationDispense,      Cold-Chain Biologics)   MSH-9 Strict OMP^O09)
  AuditEvent)
```

### Healthcare Standards & Technical Safeguards Implemented
1. **HL7 FHIR R4 MedicationRequest & MedicationDispense**:
   - Queries live EHR for `MedicationRequest`, extracting coding, dosage, route, and subject reference.
   - Posts authentic `MedicationDispense` to HAPI FHIR server with cold-chain storage (`2°C - 8°C`) and courier tracking extensions.
2. **NIH NLM RxNav / RxNorm API**:
   - Live resolution against official NLM endpoints (`/REST/rxcui.json`, `/allrelated.json`).
   - Deterministic formulation and strength validation.
   - **Clinical Safety Rule**: Unknown medications transition to `NOT_FOUND` / `UNREGISTERED_FORMULATION` and block fulfillment. No dangerous fallbacks.
3. **HL7 v2 OMP^O09 Pharmacy Order Feed**:
   - Uses `@redoxengine/redox-hl7-v2` AST parser.
   - Validates `MSH-9` message type and rejects non-OMP messages (e.g. `ADT^A01`, `ORM^O01`).
   - Enforces required `PID-3` and `ORC-2` identifiers; prevents silent generation of placeholder IDs.
   - Deduplicates messages using `MSH-10` Message Control ID.
4. **Deterministic 3-Way Medication Reconciliation**:
   - Compares Floor Indent, EHR FHIR prescription, and HL7 order feed.
   - Verifies Patient MRN, Drug identity, RxNorm RxCUI, Dose quantity, Strength, and Route.
   - Blocks fulfillment if any discrepancy is detected.
5. **Server-Side RBAC & State Machine**:
   - Roles: `PHARMACIST`, `NURSE`, `AUDITOR`, `ADMIN` with bcrypt-hashed credentials and JWT authentication.
   - Only `PHARMACIST` can authorize fulfillment. Nurse or Auditor attempts receive `403 Forbidden`.
   - Workflows in `RECONCILIATION_FAILED` or invalid states cannot enter fulfillment.
6. **Dispense Idempotency**:
   - Unique constraint on idempotency keys prevents duplicate `MedicationDispense` creation on network retries.
7. **HIPAA Safe Harbor De-Identification (45 CFR § 164.514(b))**:
   - Outbound nurse alerts contain zero direct PHI (no patient name, MRN, diagnosis, room, or medication name).
   - Automated regex and dictionary assertion guarantees zero PHI leakage.
8. **FHIR AuditEvent & Local Audit Trails**:
   - Tracks indent creation, EHR access, RxNorm checks, reconciliation, authorization, dispatch, and unauthorized access attempts.
   - Dispatches FHIR `AuditEvent` to HAPI FHIR and stores local `AuditRecord` in PostgreSQL.

---

## 🚀 Quick Start & Local Setup

### 1. Start Database Container
```bash
docker compose up -d postgres
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize Database & Seed Synthetic Scenarios
```bash
# Push Prisma schema to PostgreSQL
npm run prisma:push

# Seed users (Nurse, Pharmacist, Auditor, Admin) and HAPI FHIR resources
npm run seed
```

### 4. Start the Application
Run both backend and frontend:
```bash
# Terminal 1: Start Backend API (Port 3001)
npm run server

# Terminal 2: Start Frontend Dev Server (Port 5173)
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Comprehensive Verification Suite

Run all automated test suites (Unit, Integration, and End-to-End) with a single command:
```bash
npm test
```

### Individual Test Suites
```bash
# Unit tests: RxNorm safety, HL7 MSH-9 check, 3-way reconciliation, PHI sanitization
npm run test:unit

# Integration tests: Auth/RBAC, live HAPI FHIR queries & writeback, idempotency
npm run test:integration

# End-to-End pipeline: Scenario A (concordance), B (overdose block), C (wrong med), D (ADT rejection)
npm run test:e2e
```

---

## 👥 Default Synthetic Test Credentials

| Role | Username | Password | Permitted Actions |
| :--- | :--- | :--- | :--- |
| **Pharmacist** | `pharm_vance` | `PharmPass123!` | Review reconciliation, authorize fulfillment, dispatch courier |
| **Nurse** | `nurse_elizabeth` | `NursePass123!` | Create floor medication indents, view delivery alerts |
| **Auditor** | `auditor_chen` | `AuditPass123!` | Read clinical audit trails; cannot modify workflows |
| **Admin** | `admin_sys` | `AdminPass123!` | Full system administration and configuration |

---

## 📂 Repository Structure

```
├── server/
│   ├── db.ts                         # Prisma client singleton
│   ├── index.ts                      # Express application & route mounts
│   ├── middleware/
│   │   ├── auth.ts                   # JWT authentication & server-side RBAC guards
│   │   └── phiLogger.ts              # Log sanitizer stripping direct PHI from server logs
│   ├── modules/
│   │   ├── auth/                     # Authentication controller (login, me)
│   │   ├── indent/                   # Nurse floor indent API (POST /api/indents)
│   │   ├── fhir/                     # HAPI FHIR R4 client (MedicationRequest, Dispense, Audit)
│   │   ├── rxnorm/                   # NIH RxNav REST API client with zero-fallback safety
│   │   ├── hl7/                      # HL7 v2 parser with strict MSH-9 validation
│   │   ├── reconciliation/           # Deterministic 3-way reconciliation engine
│   │   ├── dispensing/               # State machine, Pharmacist fulfillment & idempotency
│   │   ├── notification/             # PHI-safe notification service (zero direct PHI)
│   │   └── audit/                    # FHIR AuditEvent dispatch & DB audit trails
│   └── seed/
│       └── seed.ts                   # Database and HAPI FHIR synthetic seed data
├── prisma/
│   └── schema.prisma                 # PostgreSQL database schema (9 domain entities)
├── test/
│   ├── unit/                         # Unit tests (RxNorm, HL7, reconciliation, PHI)
│   ├── integration/                  # Integration tests (RBAC, FHIR writeback, idempotency)
│   └── e2e/                          # End-to-End clinical scenarios (A, B, C, D)
├── src/
│   ├── services/
│   │   └── apiClient.ts              # Frontend client interfacing with Express API
│   ├── components/                   # Clean clinical UI components
│   └── App.tsx                       # Workflow dashboard with RBAC role switcher
├── docker-compose.yml                # PostgreSQL & HAPI FHIR container definitions
└── SUBMISSION_WRITEUP.md             # Detailed engineering write-up for DNA Health
```
