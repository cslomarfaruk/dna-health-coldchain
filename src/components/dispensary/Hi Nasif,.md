Hi Nasif,

Thank you for the update and for shortlisting me for the Vibe Coder role at DNA Health.

For the assessment, I chose Case 1: Pharmacy Cold Chain to Inpatient Floor (IPD). I really enjoyed working on this because cold-chain logistics and clinical reconciliation require both high reliability and a clean, intuitive user experience.

Here are the links to review the completed project:

Live Demo: https://medical.devcsl.tech
GitHub Repository: https://github.com/cslomarfaruk/dna-health-coldchain
To make testing easy, you can log in right away with these pre-seeded accounts:

Dispensary Pharmacist: pharm_vance / PharmPass123! (Central dispensary workflow, 3-way reconciliation & dispatch)
Floor Nurse: nurse_elizabeth / NursePass123! (Bedside requisitions & courier tracking)
Hospital Admin: admin_sys / AdminPass123! (Ward oversight)
My Approach
Instead of building a static frontend mock, I wanted this to feel like real hospital software:

Live Healthcare Interoperability: The backend connects to live federal and public APIs—using the NIH NLM RxNav REST API for real-time drug terminology validation and HAPI FHIR R4 for official prescriber orders and electronic chart write-backs.
Deterministic 3-Way Reconciliation: The system automatically checks the bedside nurse’s indent, the doctor’s official FHIR prescription, and the pharmacy HL7 v2.5 (OMP^O09) feed across patient MRN, drug concept, dose, and route. If there is a discrepancy (like a wrong dose), it puts the order on clinical hold so unsafe medication cannot leave the pharmacy.
Sequential Gating: The dispensary workstation enforces a strict, step-by-step pipeline so pharmacists can't skip ahead without validating each clinical checkpoint.
Distributed Consistency & Outbox Pattern: To solve the dual-write problem between the local database and the remote FHIR server, I implemented a transactional outbox with idempotent leasing to prevent duplicate dispenses if a connection drops.
Assumptions Made
Prescriber Authority: I assumed the physician's signed FHIR prescription is the ultimate clinical source of truth. Any mismatch in the nurse’s request triggers a mandatory hold requiring verification.
Cold-Chain Telemetry: Since I don't have physical Bluetooth temperature loggers hooked up to my workstation, I modeled the cooler telemetry as a calibrated real-time data feed (monitoring the strict 2°C–8°C refrigerated biologicals envelope) with automatic violation alerts.
Corridor Privacy (HIPAA Safe Harbor): Assuming nurse alerts appear on shared ward monitors or mobile lock screens in busy hallways, notifications strip all 18 direct HIPAA identifiers (no patient name or exact medication name), displaying only the courier name, ETA, and target lockbox station.
HL7 Delivery: While hospital engines often talk over raw TCP sockets, I ingested the HL7 v2.5 message feed via an authenticated REST endpoint with full ER7 pipe-and-hat validation and message deduplication.
What I’d Improve With More Time
Live Floor Streaming: Add Server-Sent Events (SSE) or WebSockets so floor nurses can watch real-time courier movement and live cooler temperature graphs without refreshing.
Offline PWA Support: Give nurses an offline-capable mobile interface with an encrypted IndexedDB outbox so indents can still be drafted during hospital Wi-Fi dead zones.
SMART on FHIR Launch: Package the tool so it can be launched directly inside Epic Hyperspace or Cerner patient charts as an embedded SMART on FHIR app.
A full technical write-up detailing the architecture, database schema, and test suite (which passes 100% across unit, integration, and E2E scenarios) is also included in the repository’s SUBMISSION_WRITEUP.md.

I’d love to walk you through the architecture or answer any questions you might have. Looking forward to your thoughts and the next steps!

Best regards,
Omar Faruk
devcsl.tech


A full technical write-up detailing the architecture, database schema, and test suite (which passes 100% across unit, integration, and E2E scenarios) is also included in the repository’s SUBMISSION_WRITEUP.md.

I’d love to walk you through the architecture or answer any questions you might have. Looking forward to your thoughts and the next steps!