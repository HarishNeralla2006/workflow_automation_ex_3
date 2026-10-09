# Workflow Automation - Assignment 3

This repository contains my submission for Assignment 3 in the Workflow Automation course. All workflows, decision tables, and user forms were created in **Camunda Modeler**.

From the assignment sheet, I selected the following two topics:
1. **Assignment 1: Student Project Approval & Allocation System**
2. **Assignment 3: Loan Origination & Approval System**

Below are the complete explanations, screenshots from Camunda Modeler, and details on how the happy paths and all failure cases are handled.

---

## Assignment 1: Student Project Approval & Allocation System

### 1. Process Overview & Participants
This process manages how final-year engineering students submit capstone project proposals, how the department reviews them, and how faculty guides are matched and allocated.

The workflow is modeled in a collaboration pool with 5 lanes:
- **Student / Team**: Submits the proposal, resubmits if validation fails or revisions are needed, and gets the final allocation letter.
- **Project Management System**: Performs automated checks (form field validation, team size 2–4, student uniqueness across teams), runs plagiarism/similarity scans, and executes the guide allocation rules.
- **Project Coordinator**: Screens proposals for prerequisites, reviews similarity flags, approves late submissions, and steps in for manual allocation if automated matching fails.
- **Review Committee (incl. HoD)**: Evaluates the project for novelty and feasibility, and decides whether to approve, request revisions, or reject.
- **Faculty Guide**: Receives the allocation request, reviews team details, and accepts or declines the mentorship within a sub-process.

---

### 2. BPMN Process Diagram
Here is the complete BPMN 2.0 workflow diagram modeled in Camunda Modeler:

![Assignment 1 BPMN Diagram](screenshots/assignment1_workflow.png)

### Walkthrough & Explanation of the Diagram:
- **Starting the Process**: The process starts when a student team initiates a proposal submission. They enter their title, domain, team size, roll numbers, and abstract using a user task (`student_proposal_form.form`).
- **Deadline Boundary Timer (F4)**: A 14-day non-interrupting timer boundary event is attached to the submission task. If the deadline approaches or passes before submission, it flags the team and routes to the coordinator's lane to review and approve late submissions.
- **Form & Team Rule Validation (F1 & F2)**: A system service task validates the input. An exclusive gateway evaluates the result:
  - If team rules are violated (e.g. size < 2 or > 4, or a student is already on another team), it branches to an Error End Event (`Rejected: Invalid Team Composition - F2`).
  - If required fields are missing, it loops back to the student. A retry counter gateway checks if attempts are under 2 (`F1`). If repeated attempts fail, it escalates to the coordinator to resolve the defect.
  - If valid, the proposal proceeds to the coordinator for scope screening.
- **Similarity & Duplicate Check (F3)**: A service task compares the topic against previous years' project archives. If similarity exceeds 30%, the coordinator reviews the match report and either requests a modified topic (looping back to submission) or rejects it.
- **Review Committee Evaluation (F5, F6, F7)**:
  - The review committee evaluates the proposal using `committee_evaluation_form.form`.
  - **SLA Boundary Timers (F7)**: A 3-day non-interrupting timer sends a reminder alert to the panel. A 7-day interrupting timer escalates the evaluation directly to the Head of Department (HoD) for an emergency review and binding verdict.
  - **Committee Verdict Gateway**:
    - **Approved**: Moves directly to the guide allocation sub-process.
    - **Revision Required (F5)**: An exclusive gateway checks if revision cycles are under 2. If so, the team enters a 7-day revision loop. If 2 cycles are already exceeded, it routes to rejection.
    - **Rejected (F6)**: The team is notified with feedback. If it is their first rejection, they are allowed 1 fresh topic resubmission. If they fail again, it terminates at a Terminate End Event.
- **Guide Allocation Sub-Process (F8, F9, F11)**:
  - Inside the sub-process, a Business Rule task calls `guide_allocation_rules.dmn`.
  - If an eligible guide with open capacity (< 3 teams) is found, a slot is reserved and an allocation request is sent to the guide.
  - If no guide is available (`F8`), it routes to the coordinator for manual allocation, assigning an external mentor, or placing the team on a priority waitlist.
  - The faculty guide reviews the request via a user task. A 3-day timer boundary event (`F9`) handles non-responsive guides. If declined or timed out, the system excludes that guide and retries matching (up to 3 attempts, after which the coordinator assigns manually).
  - **Withdrawal & Compensation (F11)**: A boundary message event is attached to the sub-process. If the team disbands or the guide goes on leave after approval, a compensation event frees up the guide's quota slot and closes the process as withdrawn.
- **Completion**: The system records the allocation in the master database, dispatches official confirmation letters to the team and guide, and ends at "Project Allocated & Formally Confirmed".

---

### 3. User Forms for Assignment 1

#### Student Proposal Submission Form
Used by the student team at the start of the process:

![Student Proposal Submission Form](screenshots/assignment1_proposal_form.png)

This form captures the project title, domain/specialization (AI/ML, Cloud, IoT, Web Apps), team size (enforcing 2 to 4 members), team lead roll number, member roll numbers, and abstract.

#### Review Committee Evaluation Form
Used by committee members during technical review:

![Review Committee Evaluation Form](screenshots/assignment1_committee_form.png)

This form displays the submitted title and domain (read-only), captures scores for novelty (1–10) and feasibility (1–10), collects the verdict (Approve, Revision Required, Reject), and requires committee feedback notes.

---

### 4. DMN Decision Table: Guide Allocation Rules
Here is the decision table created in Camunda Modeler for guide matching:

![Guide Allocation DMN Table](screenshots/assignment1_dmn.png)

- **Hit Policy**: `FIRST`
- **Inputs**: `projectDomain` (string), `guideCurrentLoad` (integer), `facultyRank` (string)
- **Outputs**: `allocationStatus` (string), `assignedGuideId` (string), `matchScore` (integer)
- Rules 1 to 4 check domain matching for AI/ML, Cloud, and Web/IoT against guide capacity (< 3 teams).
- Rule 5 catches when matching guides are full (>= 3), returning `CAPACITY_FULL`.
- Rule 6 is the fallback for unmatched domains, returning `NO_DOMAIN_MATCH`.
- Both fallback rules route to the coordinator for manual allocation in the BPMN model (`F8`).

---

### 5. Failure Path Register (F1 – F11)

| ID | Failure Point | Cause / Trigger | Solution & BPMN Construct | Limit / SLA |
| :--- | :--- | :--- | :--- | :--- |
| **F1** | Proposal validation | Missing fields or invalid roll numbers | Exclusive gateway returns proposal with error list; student resubmits. Retry counter limits attempts before coordinator escalation. | Max 2 retries |
| **F2** | Team rule check | Team size < 2 or > 4, or student already in another team | Exclusive gateway routes to Error End Event (`Invalid Team`); team must reform. | Immediate stop |
| **F3** | Duplicate / plagiarism | Similarity score > 30% against archive | Exclusive gateway routes match report to coordinator to request topic modification or reject. | > 30% threshold |
| **F4** | Proposal deadline | Team misses submission cutoff | Non-interrupting timer boundary event (14 days) alerts coordinator to review late submission. | 14 days timer |
| **F5** | Revision request | Objectives vague, novelty weak | Exclusive gateway routes to 7-day revision loop. Counter enforces maximum cycles. | Max 2 cycles |
| **F6** | Committee rejection | Topic unfeasible or out of syllabus | Feedback sent to team. Exclusive gateway allows 1 fresh topic resubmission attempt. | 1 resubmission |
| **F7** | Review delayed | Committee misses SLA | Dual boundary timers: 3-day reminder alert; 7-day timer escalates directly to HoD. | 3D / 7D timers |
| **F8** | No guide available | Domain mismatch or all guides at capacity | DMN returns none; exclusive gateway routes to coordinator for manual allocation or waitlist. | Immediate fallback |
| **F9** | Guide declines or silent | Guide declines or misses 3-day window | 3-day timer boundary event + decline path excludes guide and retries allocation (max 3 times). | 3D timer, 3 tries |
| **F10** | System / DB failure | Database error or email failure | Error boundary event triggers retry task (up to 3 times) before logging error for admin. | 3 retries |
| **F11** | Withdrawal | Team disbands or guide takes leave | Boundary message event on sub-process triggers compensation to release guide slot. | Pre-registration |

---

## Assignment 3: Loan Origination & Approval System

### 1. Process Overview & Participants
This workflow models a bank's retail and secured loan origination process, from customer application through parallel verifications, risk underwriting, offer acceptance, and CBS disbursement.

I modeled this using two collaboration pools:
1. **Bank Loan Origination Engine** (with 6 lanes):
   - **Applicant**: Submits the loan application, uploads missing documents, accepts the sanction offer, and e-signs the agreement.
   - **Loan Officer**: Resolves KYC/biometric mismatches, verifies salary and employment, and structures counter-offers.
   - **Core Banking & Automation Engine**: Handles document checks, orchestrates credit bureau APIs, runs the DMN scoring table, generates offers, and sends notifications.
   - **Underwriter / Credit Committee**: Reviews risk dossiers and makes sanction decisions.
   - **Fraud & Compliance Team**: Investigates sanctions and AML alerts and files regulatory SAR reports.
   - **Operations & Disbursement**: Conducts collateral/property due diligence, performs account penny-drop checks, and executes funds transfer.
2. **External Credit Bureau** (Experian / CIBIL / TransUnion):
   - External pool connected via asynchronous BPMN message flows (`MsgFlow_BureauRequest` and `MsgFlow_BureauResponse`).

---

### 2. BPMN Process Diagram
Here is the complete BPMN 2.0 workflow diagram modeled in Camunda Modeler:

![Assignment 3 BPMN Diagram](screenshots/assignment3_workflow.png)

### Walkthrough & Explanation of the Diagram:
- **Application Submission**: The applicant fills in personal details, loan product type, requested amount, monthly income, and existing debt through a user task form (`loan_application_form.form`).
- **Document Completeness Check (L1)**: A business rule task checks that identity proof, income slips, and bank statements are provided. An exclusive gateway handles incomplete documents by routing back to the applicant with a 7-day timer boundary event (`L1`). If the timer expires without upload, the application lapses.
- **Parallel Verification Streams**: A parallel split gateway forks into 4 concurrent checks:
  1. Automated KYC identity verification service task (`L2`). If biometric or identity details mismatch, it routes to the loan officer for manual verification.
  2. External Credit Bureau score retrieval service task (`L4`). Connected via message flows to the external bureau pool. An error boundary event handles API timeouts with up to 3 automatic retries, falling back to manual officer lookup if the bureau remains down.
  3. Employment & Income verification user task handled by the loan officer (`L6`).
  4. Automated AML & Sanctions screening service task (`L3`). If a hit occurs, it routes to a Fraud Investigation sub-process, files a SAR report, and ends with a Terminate End Event to kill all parallel tokens.
- **Parallel Join**: A parallel join gateway synchronizes all 4 streams before moving forward.
- **DMN Risk Scoring & Routing**: A business rule task evaluates `loan_eligibility_rules.dmn`. An exclusive gateway branches based on policy:
  - **Standard Underwriting**: Routes to the underwriter user task (`underwriter_review_form.form`).
  - **High Value / Borderline (L7)**: Routes to the Senior Credit Committee with a 48-hour SLA timer.
  - **Elevated DTI / Low Credit (L5 & L6)**: Routes to the loan officer to structure a counter-offer (requesting a guarantor or reducing the loan amount). The applicant can accept (loops back to re-scoring, limited to 1 cycle) or decline (rejection).
  - **Direct Reject**: Fails minimum policy; sends adverse action letter.
- **Collateral Due Diligence (L8)**: For secured loans, the underwriter routes the case to operations for property inspection and title verification. Title defects cause immediate rejection. Lower appraisals reduce the loan-to-value (LTV) ratio and return to the underwriter to adjust the loan amount.
- **Offer Generation & Acceptance (L9, L10)**:
  - A script task generates the sanction ID and repayment terms. A send task dispatches the offer letter to the applicant.
  - The applicant receives the offer in a receive task. A 15-day interrupting timer boundary event (`L9`) expires the offer if not accepted in time.
  - **Withdrawal & Compensation (L10)**: A boundary message event allows the applicant to withdraw before disbursement, triggering a compensation event that refunds processing fees and releases collateral holds.
- **E-Signing (L11)**: The applicant digitally signs the agreement. A 48-hour timer boundary event cancels the offer if unsigned.
- **Disbursement Sub-Process (L12)**:
  - Executes penny-drop account validation, creates the loan master account in CBS, and transfers funds via NEFT/RTGS.
  - An error boundary event catches payment gateway failures, holds funds in escrow, halts CBS bookings, and alerts operations to rectify account details.
- **Completion**: The system sends a welcome kit and repayment schedule, ending at "Loan Disbursed & Account Active".

---

### 3. User Forms for Assignment 3

#### Retail & Secured Loan Application Form
Used by the applicant to submit loan details:

![Loan Application Form](screenshots/assignment3_application_form.png)

This form collects applicant legal name, tax ID / SSN, loan product type (personal unsecured, mortgage secured, commercial), requested principal amount, monthly net income, existing debt liabilities, and whether collateral is offered.

#### Credit Underwriter Sanction Assessment Form
Used by the credit underwriter to evaluate the dossier and sanction terms:

![Underwriter Review Form](screenshots/assignment3_underwriter_form.png)

This form displays the applicant name, bureau score, and calculated DTI ratio (read-only), provides decision options (Sanction & Approve, Require Collateral Inspection, Decline Application), and captures approved loan amount, interest rate, and underwriter notes.

---

### 4. DMN Decision Table: Loan Eligibility & Risk Policy
Here is the decision table created for loan underwriting:

![Loan Eligibility DMN Table](screenshots/assignment3_dmn.png)

- **Hit Policy**: `FIRST`
- **Inputs**: `bureauScore` (integer), `dtiRatio` (integer), `requestedLoanAmount` (integer), `collateralProvided` (boolean)
- **Outputs**: `policyRoute` (string), `riskTier` (string), `maxLtv` (integer), `sanctionNotice` (string)
- Prime credit scores (>= 750) with low DTI (<= 35%) route to standard underwriting (`TIER_1_PRIME`).
- High quantum loans (> $100k) route to the Senior Credit Committee (`L7`).
- High DTI (> 45%) routes to a counter-offer to reduce principal or extend tenure (`L6`).
- Low bureau scores (< 650) with collateral trigger a secured counter-offer (`L5`), while low scores without collateral result in an outright rejection.

---

### 5. Failure Path Register (L1 – L12)

| ID | Failure Point | Cause / Trigger | Solution & BPMN Construct | Limit / SLA |
| :--- | :--- | :--- | :--- | :--- |
| **L1** | Document check | Missing or blurred documents | Exclusive gateway returns to applicant with 7-day timer. Expires to `Application Lapsed`. | 7 days timer |
| **L2** | KYC verification | Identity mismatch | Exclusive gateway routes to loan officer for manual verification. | 24h review |
| **L3** | Fraud / AML screening | Sanctions hit or forged docs | Exclusive gateway routes to compliance sub-process, files SAR, ends with Terminate End Event. | Immediate abort |
| **L4** | Credit bureau call | Bureau API timeout / outage | Error boundary event triggers retry task (up to 3 times); falls back to officer manual lookup. | 3 retries (10s, 30s, 90s) |
| **L5** | Credit score below cutoff | Bureau score too low | Exclusive gateway routes to counter-offer (guarantor/collateral) or formal rejection. | Score < 580: reject |
| **L6** | Income / DTI | DTI > 45% | Counter-offer offers lower loan or longer tenure; loops to re-scoring (limited to 1 attempt). | 1 retry loop |
| **L7** | High-value case | Loan > $100k | DMN routes to Senior Credit Committee with 48h SLA timer. | 48h SLA |
| **L8** | Collateral valuation | Defective title or low appraisal | Title defect causes rejection; low appraisal reduces LTV and returns to underwriter. | Max 80% prime LTV |
| **L9** | Offer acceptance | Applicant doesn't respond in time | 15-day interrupting timer boundary event on receive task cancels offer. | 15 days timer |
| **L10** | Withdrawal | Applicant cancels application | Boundary message event triggers compensation to refund fees and release liens. | Pre-disbursement |
| **L11** | E-signature | Agreement unsigned in 48 hours | 48-hour boundary timer on signing task revokes offer. | 48h timer |
| **L12** | Disbursement failure | Invalid account or gateway failure | Error boundary event on disbursement sub-process holds funds in escrow and alerts operations. | 4h ops SLA |

---

## Why Specific BPMN Task Types Were Used

Across both models, BPMN task types were chosen based on whether a step requires human decision-making or is automated:
- **User Task**: Used whenever a person interacts through a form (e.g., student proposal submission, committee scoring, loan application, underwriter sanction, loan officer manual reviews).
- **Service Task**: Used for automated background jobs (e.g., input validation rules, semantic similarity checks, KYC API lookups, database persistence, and payment gateway calls).
- **Business Rule Task**: Used specifically where DMN decision tables are executed (`guide_allocation_rules.dmn` and `loan_eligibility_rules.dmn`).
- **Send Task & Receive Task**: Used for asynchronous messaging (dispatching the loan sanction letter and waiting for the applicant's acceptance message).
- **Script Task**: Used for quick local variable calculation (generating the sanction ID and setting interest rate variables).

---

## Project Structure

```text
├── README.md
├── .gitignore
│
├── screenshots/
│   ├── assignment1_workflow.png
│   ├── assignment1_proposal_form.png
│   ├── assignment1_committee_form.png
│   ├── assignment1_dmn.png
│   ├── assignment3_workflow.png
│   ├── assignment3_application_form.png
│   ├── assignment3_underwriter_form.png
│   └── assignment3_dmn.png
│
├── assignment-1-student-project-approval/
│   ├── student_project_approval.bpmn
│   ├── guide_allocation_rules.dmn
│   └── forms/
│       ├── student_proposal_form.form
│       └── committee_evaluation_form.form
│
└── assignment-3-loan-origination-system/
    ├── loan_origination_system.bpmn
    ├── loan_eligibility_rules.dmn
    └── forms/
        ├── loan_application_form.form
        └── underwriter_review_form.form
```

---

## How to Open the Files in Camunda Modeler

1. Download and open **Camunda Modeler** (v5.0 or later).
2. Go to `File` -> `Open File...` and select:
   - `assignment-1-student-project-approval/student_project_approval.bpmn`
   - `assignment-3-loan-origination-system/loan_origination_system.bpmn`
3. Both files contain complete diagram interchange (`bpmndi`) coordinates, so they open with proper visual layout, lanes, pools, and sequence flows.
4. Open the `.dmn` files in Camunda Modeler to inspect the decision tables.
5. Open the `.form` files in Camunda Modeler's Form Editor to view the form layouts.
