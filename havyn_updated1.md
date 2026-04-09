## Project Name: Havyn

## Creators: James Corrigan, Brady Bates, Joshua Solano, Will Knudson

## INTEX case context

INTEX is a weeklong, cross‑course capstone assignment for students studying Information Systems in IS 401 (Project Management and Systems Design), IS 413 (Enterprise Application Development), IS 414 (Security), and IS 455 (Machine Learning). Over the course of four intensive sprints, student teams act like a small consulting and product team: understanding a client’s needs, designing a solution, building and deploying a real web application, securing it, and using data and machine learning to support better decisions.

The case centers on a nonprofit modeled after Lighthouse Sanctuary, a US‑based 501(c)(3) that supports safe homes for girls in the Philippines who are survivors of sexual abuse and sex trafficking. The new organization the students are serving will operate safehouses, coordinate with in‑country partners, and rely entirely on local and international donors to fund protection, rehabilitation, education, health services, and reintegration. Students are given a rich, anonymized operational dataset spanning donors, residents, safehouses, social media, and outcomes.

The students’ goal is to successfully design and deliver an end‑to‑end, production‑ready information system that helps this nonprofit retain and grow donors, prevent girls from “falling through the cracks,” and make smarter use of social media—while remaining simple to administer and rigorously protecting privacy and safety. By the end of the week, each team must present a working, deployed application and supporting analytics that convincingly address the client’s core business problems.

## Persona We Are Addressing:

Name: Jennifer

Role: Admin
Demographics:

- Age: 38
- Location: Cebu City, Philippines
- Education: Bachelor's in Social Work, nonprofit leadership certificate
- Family/Life stage: Married with two children, balancing family and high-responsibility work

Behaviors:

- Starts each day checking urgent resident needs, then donor/campaign updates
- Uses spreadsheets, chat apps, and paper notes to bridge data gaps
- Prioritizes resident safety decisions first, donor communication second
- Reviews reports at night because daytime is consumed by operations
- Depends on quick summaries rather than deep manual data pulls
- Checks in with leaders through text

Goals:

- Keep every resident on a safe, trackable care path from intake to reintegration
- Detect regressions and risk early using clear case signals
- Improve donor retention and increase campaign effectiveness
- Show supporters clear, credible impact tied to outcomes
- Run operations with limited staff while keeping data secure
- know when a resident is ready for reintegration and flag who is at risk
- track funding
- track progress of girls
- Predict which safe house needs attention

Frustrations:

- Constant context-switching between casework and fundraising
- Too much manual reporting work and duplicate entry
- Uncertainty about which interventions and outreach tactics are actually effective
- Difficulty preparing board-ready updates quickly
- Checks in with leaders isn’t structured
- Manually does everything

Pain points:

- Case notes, visitation data, and health/education updates are scattered
- Cant connect funding to outcomes for donors
- Donor churn is discovered late instead of predicted early
- Social media activity is hard to connect to donations and long-term support
- Sensitive resident data requires strict role-based protection
- can’t compare safehouse data to each other
Quotes:
- "I need one place to see resident risk today and donor risk this month."
- "If I miss a follow-up, a child can slip through the cracks."
- "I do not need more data. I need clearer decisions from the data."
- "Every donor update should prove where the help went and what changed."

## Problem Statement

As an Executive Admin, I want a unified platform to manage and view global safehouse operations and predict potential crises so that I can eliminate redundant manual work and use data-backed evidence to help the girls’ healing process and track donation impact.

## Tech stack

Frontend: React + TypeScript
Acts as the "Command Center" UI. TypeScript provides strict typing for your resident data models, ensuring that data flows correctly and bugs are caught early.
Backend API: ASP.NET Core 10 (C#)
Functions as the "Brain." It manages complex business logic and role-based security while serving data to your React frontend via a clean API.
Database: Azure Postgres Database
Serves as the "Memory." As a relational database, it is perfectly suited to handle the 17 different CSV structures (Residents, Donations, etc.) and their relationships.
Auth & Identity: ASP.NET Core Identity
Handles the "Gatekeeping." It manages secure logins and password hashing for the four specific user roles: Admin, Manager, Worker, and Donor.

## Architecture flow

Logins, Privacy/Cookie Use, and MFA:
Log-in:
4 Role types (in order from highest to lowest access level in the company-- all logins have MFA as described below) :

- Executive Admin
- Regional Manager
- Social Worker
- Donor

How account creation works:
Donors create an account on the sign up page. Sign up page is for donors and says something like “before donating…”
Other accounts need their next higher up to create them an account. For example, a social worker needs their regional manager to create them an account. A regional Manager needs an executive to create them an account. Executives can create other executive accounts.
How log ins work:
All log-ins are on the same page. DB stores users table and stores the role and different access is based on authorization/authentication. Different roles lead to different views (as described below in the pages)
Privacy/Cookie Use:
Privacy Policy:
When a donor creates an account, the account creation page has a check box that they must have checked to create an account. If the box is not checked it will not let them create an account. The text says “I Agree to the Privacy Policy”. The text “Privacy Policy” is an href to the privacy policy
On first log in for Social Workers or Regional Managers, or Executive Admin, there is a different view called “FirstView” where it's a welcome page and makes them accept privacy policy before continuing. Database saves this info of if they accepted privacy policy on first log in or not.
Cookies:
Landing page for unlogged in user has a pop up on the bottom as a component for accept or decline cookies. Also has an “x” out button.
On first log in for users, they see the same cookie pop up but once they accept cookies, its stored in the users table as their user record as cookies saved in a field so they don't see that pop up ever again.

Multi-Factor Authentication (MFA):
The application implements MFA using time-based one-time passwords (TOTP) via authenticator apps. After a user successfully logs in (either through standard email/password or external providers like Google OAuth), the system checks if MFA is enabled for the account. If enabled, the user is prompted to enter a verification code generated by their authenticator app before access is granted.

MFA is enforced server-side using ASP.NET Core Identity, ensuring that authentication is not considered complete until the second factor is validated. Secrets (e.g., client IDs, client secrets, and MFA-related configuration) are securely stored using the .NET User Secrets Manager during development and are expected to be managed via a secure secrets provider in production.

This approach ensures compatibility with both traditional authentication and third-party OAuth providers while maintaining a consistent, secure verification flow.

Password Hashing:
All passwords are hashed using ASP.NET Core Identity's built-in password hasher, which uses PBKDF2 with HMAC-SHA256, a 128-bit salt, and 10,000 iterations by default. Plain-text passwords are never stored or logged at any point. Password policy is configured to require stronger-than-default complexity: minimum length of 12 characters, at least one uppercase letter, one lowercase letter, one digit, and one non-alphanumeric character. These settings are enforced both on the frontend (real-time validation) and server-side (Identity PasswordOptions).

HTTP → HTTPS Redirect:
All HTTP traffic is automatically redirected to HTTPS at the application middleware level using ASP.NET Core's UseHttpsRedirection() middleware. The backend is configured to enforce TLS for all public connections. The deployed environment uses a valid TLS certificate provided by the cloud provider. HTTP Strict Transport Security (HSTS) headers are also configured so that browsers remember to always use HTTPS for this domain.

Content Security Policy (CSP) Header:
The application sets a Content-Security-Policy HTTP response header server-side (not via a meta tag) on all responses. The policy is configured to be as restrictive as possible while allowing the application to function. Defined directives include:
- default-src 'self' — only allow resources from the same origin by default
- script-src 'self' — no inline scripts or external script sources beyond what is needed
- style-src 'self' — stylesheets from same origin only
- img-src 'self' data: — images from same origin plus inline data URIs for UI icons
- font-src 'self' — fonts from same origin
- connect-src 'self' — API calls only to the same origin backend
- frame-ancestors 'none' — prevent the app from being embedded in iframes (clickjacking protection)
The CSP header must be verifiable in browser developer tools under the Network tab response headers.

Cookie Consent (Fully Functional):
The cookie consent banner is fully functional, not cosmetic. When a user declines cookies, no non-essential cookies (analytics, preference, tracking) are set. When a user accepts, their preference is stored in a browser-accessible cookie (not httponly) so the banner does not reappear. For logged-in users, cookie preference is additionally saved in the users table so the preference persists across devices and sessions. The consent state is checked by the React frontend before setting any non-essential cookies, and the backend respects the consent flag stored in the user record. The banner appears on the landing page for unauthenticated users and on first login for authenticated users who have not yet consented.

Data Sanitization and Input Encoding:
All incoming data from API requests is sanitized server-side before being processed or stored. String inputs are trimmed and validated against expected formats (e.g., enums, date formats, numeric ranges). The backend uses parameterized queries via Entity Framework Core for all database operations, preventing SQL injection. On the frontend, React's default JSX rendering handles output encoding, preventing XSS by not rendering raw HTML from user-supplied content. Any field that could contain rich text is explicitly encoded before rendering. Form inputs are validated both client-side (React) and server-side (.NET) to enforce type, length, and format constraints.

## Public facing page

MAIN PAGE: Main page is a Landing Page with these tabs. Professional Page about general info

### TAB 1 Compliance page (Privacy Policy)

Make a good privacy policy page that is GDPR Compliant and is for a real company, not a “project”

### TAB 2 Login page

Same log in page for all users, roles are stored in users table

### TAB 3 Donor impact page

Aggregated general donor metrics

## Executive Admin Dashboard

Page 1: Dashboard with aggregated metrics for all girls (Active cases only — closed cases excluded from all counts and charts), aggregated donor info, upcoming events + to do list.

### TAB 1 Events page specific to Admin

If you're an admin, show a calendar for upcoming events (ie, speaking events, charity events, team meetings, marketing meetings, or awareness events). Past events shown in a list below the calendar, paginated (default 25 per page), sortable by date.

### TAB 2 Safehouses page with metrics by them. You can click into one and see more info.

You click on specific safehouse locations, when you click on one you see that safehouse's metrics dashboard. There is a sub tab to see their caseload (as described in the regional manager TAB 2). Safehouses list sortable by name, region, occupancy, and status. Shows only Active safehouses by default with a toggle to include Inactive.

### TAB 3 Donors page with all donors and info about them

Include history of all donors as well and where money is going across all safehouses. Should be able to filter by safehouse, donors, sort by, and have pagination. Staff can create and edit supporter profiles and record new donations (monetary, in-kind, time, skills, social media) from this page. See the Donors & Contributions section below for full field details.

### TAB 4 Partners page

View and manage all partner organizations and individuals across all safehouses.

- Partners list: shows all rows from the partners table with columns for partner name, partner type, role type, region, status, start date, end date, and primary contact. Sortable by any column, with pagination (default 25 per page).
- Click into a partner to see their full profile: all fields from the partners table plus a list of their partner_assignments (which safehouse, program area, assignment start/end, whether primary, and status).
- Admin can create a new partner (all fields from partners table), edit an existing partner's details, and mark a partner as Inactive (soft delete — no hard deletes).
- Admin can also create and edit partner_assignments from within a partner's profile: select safehouse, program area, start date, end date, primary flag, responsibility notes.
- Filter partners by: role type, region, status, safehouse assignment. Sortable by name, status, start date. Pagination on all lists (default 25 per page).

### TAB 5 Reports & Analytics

Displays aggregated insights and trends to support decision-making across all safehouses. Structured to align with the Annual Accomplishment Report format used by Philippine social welfare agencies (tracking services provided under Caring, Healing, Teaching, and Legal Services; beneficiary counts; and program outcomes). Date range filter applies globally across all sections (default: current year). All resident metrics exclude closed cases unless the "Include Closed Cases" toggle is enabled.

RESIDENT OUTCOMES
- Total active residents across all safehouses, broken down by safehouse, case category, and risk level.
- Risk level distribution chart (Low / Medium / High / Critical) with trend over time.
- Education progress: average progress_percent across all active residents, trend line over months, broken down by safehouse. Sourced from education_records.
- Health improvement: average general_health_score trend over time per safehouse. Sourced from health_wellbeing_records.
- Reintegration success rates: count and percentage of residents who reached reintegration_status = Completed, broken down by reintegration_type (Family Reunification, Foster Care, Adoption, etc.).
- Closed cases count by month and outcome type.

SERVICES PROVIDED (Annual Accomplishment Report format)
- Caring: count of home visitations by visit type and outcome, per safehouse per month. Sourced from home_visitations.
- Healing: count of process recordings (counseling sessions) by session type, per safehouse per month. Emotional state improvement rate (sessions where emotional_state_end is more positive than emotional_state_observed). Sourced from process_recordings.
- Teaching: count of education records by program and completion status, attendance rate trends. Sourced from education_records.
- Legal Services: count of referrals made (referral_made = true on process_recordings) and intervention plans with plan_category = Legal. Sourced from process_recordings and intervention_plans.

SAFEHOUSE PERFORMANCE COMPARISONS
- Side-by-side comparison of all safehouses: active residents, avg education progress, avg health score, incident count, process recording count, home visitation count. Sourced from safehouse_monthly_metrics.
- Incident breakdown by type and severity per safehouse. Sourced from incident_reports.
- Occupancy rate (current_occupancy / capacity_girls) per safehouse.

DONATION TRENDS
- Total donations over time (monthly bar chart), broken down by donation type.
- Donations by campaign: which campaigns generated the most value.
- Donation allocations by safehouse and program area (where money is going).
- Recurring vs. one-time donor ratio and trend.
- New donors acquired per month by acquisition channel.

All charts and tables on this page are exportable as CSV.

## Regional Manager Dashboard

Page 1: Dashboard with aggregated metrics for safehouse girls, aggregated donor info, upcoming events + to do list

### TAB 1 Events page specific to safehouse

Regional manger events similar to the admin (ie. meetings with safehouse leaders, social workers, etc.)

### TAB 2 Caseload page with all girls and info when you click

Caseload is a list of all the girls. 1 Case = 1 girl. By default, only Active and Transferred cases are shown — closed cases are hidden. Regional Managers have a filter option "Include Closed Cases" to show girls whose case_status is Closed. You can click on a girl to see all her info. Should be able to sort by any column and have pagination (default 25 per page). Filter options: case status (Active/Transferred/Closed), safehouse, case category, risk level, assigned staff member.

From within a girl's case profile, the Regional Manager can:
- Update reintegration_type and reintegration_status (dropdown fields, saved directly to the residents table). Status options: Not Started / In Progress / Completed / On Hold.
- Close a case: sets case_status to Closed and records date_closed. Requires a confirmation dialog ("Are you sure you want to close this case? This will remove the resident from active caseload views."). Once closed, the girl no longer appears in default caseload or dashboard views for any role.
- Reopen a closed case: sets case_status back to Active and clears date_closed. Also requires confirmation.

### TAB 3 Donors page with donors specific to safehouse and info about them

Same as the admin page but specific to only the donors of that safehouse. Should be able to filter by donor name, donation type, campaign, sort by, and have pagination (default 25 per page).

### TAB 4: View Appointments

Regional manager can see all staff appointments that have occurred. Include filter by girl, staff member, appointment types, and pagination (default 25 per page). More about appointments is described below.

### TAB 5 Partners page

View all partners and assignments relevant to this safehouse.

- Partners list scoped to the regional manager's safehouse: shows partner name, role type, program area, assignment status, start/end dates. Sortable, with pagination (default 25 per page).
- Click into a partner to see their full profile and assignment details for this safehouse.
- Regional Manager can view only — create and edit of partners and assignments is Admin only.
- Filter by: role type, program area, assignment status.

### TAB 6: Case Conferences

View and log case conferences for residents assigned to this safehouse.

- List view of all case conferences (sourced from the case_conference_date field on intervention_plans, grouped by resident and date). Shows resident internal code, conference date, plan categories discussed, and assigned staff member. Sortable by date. Pagination (default 25 per page). Filter by resident and date range.
- Click into a conference date to see all intervention plans that were created or reviewed on that date for that resident.
- Regional Manager can schedule an upcoming case conference by creating a new intervention plan entry with a future case_conference_date, status of Open or In Progress, and all required plan fields.
- Upcoming case conferences (future case_conference_date) surface on the Regional Manager dashboard as an upcoming event.

## Staff Dashboard

Page 1: Dashboard with aggregated metrics for the girls they are specifically assigned to according to the residents table (Active cases only — closed cases do not appear). Shows recommended sessions (populated from ML model results via API). To-do list (they can add, check off, or remove things — stored in the to_do_list table by their userID, see schema below).

### TAB 1 Events and Appointments

Upcoming appointments the staff member has for Healing, Teaching, Caring, Legal Services (group or one-on-one) displayed as a schedule/calendar with resident names. Staff can add a new appointment from this page (see appointments table schema below). Past appointments are also viewable in a list below the calendar, sortable by date, with pagination (default 25 per page). Upcoming case conferences where this staff member is involved also surface here.

### TAB 2 Caseload page with all girls assigned to staff member with progress

Same caseload format as regional manager but only for the girls assigned to this staff member. Active cases only by default — no option to view closed cases at the staff level. Sortable by name, risk level, education progress, health score. Pagination (default 25 per page).

### TAB 3 Forms completed and new forms

Staff can view all forms they have previously submitted for the girls assigned to them, and submit new forms. Each form type maps to a database table. Forms are listed chronologically per girl with the most recent at the top. Pagination on the forms list (default 25 per page), sortable by date submitted and form type.

A "New Form" button opens a modal or new page to select which form type to fill out, then presents that form. Staff cannot edit a submitted form — if a correction is needed, a new entry is submitted and a note is added. This preserves audit integrity.

  INTAKE FORM: Resident Admission Record (maps to residents table)
  - Purpose: Create a new resident case record when a girl is admitted to a safehouse. This is the first form completed for any new resident and establishes her full case profile. Only completed once per resident at admission.
  - Fields:
    BASIC DEMOGRAPHICS
    - Safehouse (dropdown — select which safehouse she is being admitted to, required)
    - Case Control Number (text input, auto-generated or manually entered, required)
    - Internal Code (text input — anonymized identifier, required)
    - Date of Birth (date picker, required)
    - Birth Status (dropdown: Marital / Non-Marital, required)
    - Place of Birth (text input, required)
    - Religion (text input, optional)
    CASE CLASSIFICATION
    - Case Category (dropdown: Abandoned / Foundling / Surrendered / Neglected, required)
    - Sub-Categories (multi-select checkboxes — check all that apply):
      □ Orphaned
      □ Trafficked
      □ Child Labor
      □ Physical Abuse
      □ Sexual Abuse
      □ OSAEC/CSAEM
      □ CICL (Child in Conflict with the Law)
      □ At Risk (CAR)
      □ Street Child
      □ Child with HIV
    DISABILITY & SPECIAL NEEDS
    - Person with Disability? (yes/no toggle)
    - If yes: PWD Type (text input)
    - Has Special Needs? (yes/no toggle)
    - If yes: Special Needs Diagnosis (text input)
    FAMILY SOCIO-DEMOGRAPHIC PROFILE
    - Family is 4Ps Beneficiary? (yes/no toggle)
    - Solo Parent Household? (yes/no toggle)
    - Indigenous Family? (yes/no toggle)
    - Parent is PWD? (yes/no toggle)
    - Informal Settler / Homeless Family? (yes/no toggle)
    ADMISSION & REFERRAL
    - Date of Admission (date picker, required — also sets date_enrolled)
    - Referral Source (dropdown: Government Agency / NGO / Police / Self-Referral / Community / Court Order, required)
    - Referring Agency or Person (text input, required)
    - Assigned Staff Member (dropdown — select from active staff members, required)
    CIVIL REGISTRATION
    - Date COLB Registered (date picker, optional)
    - Date COLB Obtained (date picker, optional)
    INITIAL ASSESSMENT
    - Initial Case Assessment (text input — e.g., For Reunification, For Foster Care, required)
    - Date Case Study Prepared (date picker, optional)
    - Initial Risk Level (dropdown: Low / Medium / High / Critical, required)
    - Current Risk Level (dropdown: Low / Medium / High / Critical, required — at intake this typically matches initial risk level)
    REINTEGRATION PLAN (can be filled later but captured at intake if known)
    - Reintegration Type (dropdown: Family Reunification / Foster Care / Adoption (Domestic) / Adoption (Inter-Country) / Independent Living / None, optional)
    - Reintegration Status (dropdown: Not Started / In Progress / Completed / On Hold, optional — defaults to Not Started)
    NOTES
    - Initial Notes (textarea, optional — non-restricted general notes)
  - On submit: creates a new row in the residents table. The resident immediately appears in the caseload list for the assigned staff member and their regional manager. Case status defaults to Active. The case_control_no and internal_code are used throughout all other forms to reference this resident without exposing identifying information.
  - This form is accessible to Staff, Regional Managers, and Executive Admins. Donors cannot access this form.

  FORM 1: Process Recording (maps to process_recordings table)
  - Purpose: Document each counseling session (individual or group) with a resident. This is the primary tool for recording the therapeutic and healing journey of each girl and is completed after every session.
  - Fields:
    - Resident (dropdown, required) — select from assigned girls
    - Session Date (date picker, required)
    - Session Type (dropdown: Individual / Group, required)
    - Session Duration in Minutes (number input, required)
    - Emotional State at Start (dropdown: Calm / Anxious / Sad / Angry / Hopeful / Withdrawn / Happy / Distressed, required)
    - Emotional State at End (same dropdown, required)
    - Session Narrative (textarea — what was discussed and observed, required)
    - Interventions Applied (textarea — techniques or approaches used, required)
    - Follow-Up Actions (textarea — planned next steps, required)
    - Progress Noted? (yes/no toggle, required)
    - Concerns Flagged? (yes/no toggle, required)
    - Referral Made? (yes/no toggle — e.g., referral to psychologist or legal, required)
  - On submit: saves to process_recordings table linked to resident_id and social_worker (auto-populated from the logged-in user). Visible in the girl's case profile under Regional Manager and Admin views. If Concerns Flagged is yes, the entry is visually highlighted in the caseload dashboard.

  FORM 2: Home Visitation Report (maps to home_visitations table)
  - Purpose: Document a home or field visit to a resident's family or guardian. Used to assess family readiness, home environment safety, and reintegration suitability.
  - Fields:
    - Resident (dropdown, required) — select from assigned girls
    - Visit Date (date picker, required)
    - Visit Type (dropdown: Initial Assessment / Routine Follow-Up / Reintegration Assessment / Post-Placement Monitoring / Emergency, required)
    - Location Visited (text input, required)
    - Family Members Present (text input — describe who was there, required)
    - Purpose of Visit (textarea, required)
    - Observations (textarea — home environment, family dynamics, required)
    - Family Cooperation Level (dropdown: Highly Cooperative / Cooperative / Neutral / Uncooperative, required)
    - Safety Concerns Noted? (yes/no toggle, required)
    - Follow-Up Needed? (yes/no toggle, required)
    - Follow-Up Notes (textarea — only required if Follow-Up Needed is yes)
    - Visit Outcome (dropdown: Favorable / Needs Improvement / Unfavorable / Inconclusive, required)
  - On submit: saves to home_visitations table linked to resident_id and social_worker (auto-populated from logged-in user). Visible in the girl's case profile and in the Regional Manager's TAB 4 Appointments view. If an appointment exists for this visit, staff may optionally link the form to that appointment, which sets the appointment status to Completed.

  FORM 3: Education Record (maps to education_records table)
  - Purpose: Log a monthly education progress update for a resident. Tracks attendance, program progress, and academic performance over time.
  - Fields:
    - Resident (dropdown, required) — select from assigned girls
    - Record Date (date picker, required)
    - Program Name (dropdown: Bridge Program / Secondary Support / Vocational Skills / Literacy Boost, required)
    - Course Name (dropdown: Math / English / Science / Life Skills / Computer Basics / Livelihood, required)
    - Education Level (dropdown: Primary / Secondary / Vocational / CollegePrep, required)
    - Attendance Status (dropdown: Present / Late / Absent, required)
    - Attendance Rate (number 0.0–1.0, required)
    - Progress Percent (number 0–100, required)
    - Completion Status (dropdown: NotStarted / InProgress / Completed, required)
    - GPA-Like Score (number 1.0–5.0, required)
    - Notes (textarea, optional)
  - On submit: saves to education_records table linked to resident_id. Progress data feeds into the education progress metrics visible on the caseload dashboards and is included in the avg_education_progress aggregation for safehouse_monthly_metrics.

  FORM 4: Health & Wellbeing Record (maps to health_wellbeing_records table)
  - Purpose: Log a monthly physical health and wellbeing update for a resident. Tracks anthropometrics, wellness scores, and whether checkups have been completed.
  - Fields:
    - Resident (dropdown, required) — select from assigned girls
    - Record Date (date picker, required)
    - Weight in kg (decimal, required)
    - Height in cm (decimal, required)
    - BMI (auto-calculated from weight and height, display only)
    - Nutrition Score (number 1.0–5.0, required)
    - Sleep Score (number 1.0–5.0, required)
    - Energy Score (number 1.0–5.0, required)
    - General Health Score (number 1.0–5.0, required)
    - Medical Checkup Done? (yes/no toggle, required)
    - Dental Checkup Done? (yes/no toggle, required)
    - Psychological Checkup Done? (yes/no toggle, required)
    - Notes (textarea, optional — non-restricted field; restricted medical notes are not surfaced in this form for security reasons)
  - On submit: saves to health_wellbeing_records table linked to resident_id. Health scores feed into the caseload dashboards and risk model inputs. General Health Score contributes to avg_health_score in safehouse_monthly_metrics.

  FORM 5: Intervention Plan (maps to intervention_plans table)
  - Purpose: Create or update a structured care goal for a resident, typically created or reviewed during a case conference. Each plan represents one goal in a specific category (Safety, Education, etc.).
  - Fields:
    - Resident (dropdown, required) — select from assigned girls
    - Plan Category (dropdown: Safety / Psychosocial / Education / Physical Health / Legal / Reintegration, required)
    - Plan Description (textarea — describe the goal or intervention, required)
    - Services Provided (text input — e.g., Caring, Healing, Teaching, Legal Services, required)
    - Target Value (number, optional — numeric target if applicable, e.g., a health score threshold)
    - Target Date (date picker, required)
    - Status (dropdown: Open / In Progress / Achieved / On Hold / Closed, required)
    - Case Conference Date (date picker, optional — date this plan was created or reviewed in a case conference)
  - On submit: saves to intervention_plans table linked to resident_id. Existing plans can be updated by submitting a new status or adjusted target date — the updated_at timestamp is refreshed automatically. All plans for a resident are visible in her full case profile under Regional Manager and Admin views. Plans with a future case_conference_date surface as upcoming case conferences on the Regional Manager TAB 6 and on staff TAB 1 calendars.

  FORM 6: Incident Report (maps to incident_reports table)
  - Purpose: Document a safety or behavioral incident involving a resident. Used for risk monitoring, staff response logging, and escalation tracking.
  - Fields:
    - Resident (dropdown, required) — select from assigned girls
    - Safehouse (auto-filled based on resident's assigned safehouse, display only)
    - Incident Date (date picker, required)
    - Incident Type (dropdown: Behavioral / Medical / Security / RunawayAttempt / SelfHarm / ConflictWithPeer / PropertyDamage, required)
    - Severity (dropdown: Low / Medium / High, required)
    - Description (textarea — narrative of what happened, required)
    - Response Taken (textarea — how staff responded, required)
    - Resolved? (yes/no toggle, required)
    - Resolution Date (date picker — only required if Resolved is yes)
    - Follow-Up Required? (yes/no toggle, required)
  - On submit: saves to incident_reports table linked to resident_id and safehouse_id. reported_by is auto-populated from the logged-in staff member's name. High-severity incidents (Severity = High) visually flag on the staff dashboard and escalate as a highlighted alert in the Regional Manager's caseload view. Unresolved High-severity incidents remain flagged until Resolved is toggled to yes.

  DISPLAY: Forms List View
  - Shows a list of all submitted forms for each assigned girl, grouped by form type or sorted by date (toggle between views).
  - Each row shows: girl's internal code (anonymized), form type, date submitted, submitted by.
  - Staff can click any past form to view it in read-only mode.
  - Staff cannot edit a submitted form — if a correction is needed, a new entry is submitted and a note is added. This preserves audit integrity.
  - A "New Form" button opens a modal or a new page to select which form type to fill out, then presents that form.
  - Pagination on all form lists (default 25 per page), sortable by date and form type.

  

## Supporting Table Schemas

### to_do_list table

Stores personal to-do items for each staff user. Scoped entirely to the individual — no other role can see another user's to-do list.

Fields:
- todo_id (integer, primary key, auto-increment)
- user_id (string, FK → ASP.NET Identity users table — the staff member who owns this item)
- task_text (string, required — the to-do item description, max 500 characters)
- is_completed (boolean, default false)
- created_at (datetime, auto-set on insert)
- completed_at (datetime, nullable — set when is_completed is toggled to true)
- display_order (integer — allows drag-to-reorder; defaults to insertion order)

Behavior:
- Staff can add a new item (text input + add button, inline on the dashboard).
- Staff can check off an item (toggles is_completed, records completed_at, visually strikes through the text).
- Staff can uncheck a completed item (clears completed_at, sets is_completed back to false).
- Staff can delete any item (requires a single click confirm — "Remove this task?"). Hard delete is acceptable here since to-do items are low-stakes personal notes.
- Completed items are shown below uncompleted items in the list. A "Clear completed" button bulk-deletes all completed items after confirmation.
- The to-do list widget appears on the staff dashboard homepage, not in a tab.

### appointments table

Stores scheduled upcoming sessions and visits for staff members. This is separate from the process_recordings and home_visitations tables, which store completed session records. The appointments table stores what is planned; the form tables store what happened.

Fields:
- appointment_id (integer, primary key, auto-increment)
- staff_user_id (string, FK → ASP.NET Identity users table — the staff member responsible)
- resident_id (integer, FK → residents.resident_id — which girl the appointment is for)
- appointment_date (date, required)
- appointment_time (time, required)
- appointment_type (string, required — enum: Healing, Teaching, Caring, Legal Services)
- session_format (string, required — enum: Individual, Group)
- location (string, optional — where the session or visit will occur)
- notes (string, optional — any prep notes, max 500 characters)
- status (string, required — enum: Scheduled, Completed, Cancelled; default Scheduled)
- created_at (datetime, auto-set on insert)
- updated_at (datetime, auto-updated on any change)

Behavior:
- Staff add appointments from TAB 1 of their dashboard. A simple form modal collects the fields above.
- Appointments with status Scheduled and appointment_date in the future appear on the calendar view.
- Past appointments (appointment_date < today) are shown in a list below the calendar, paginated (default 25 per page), sortable by date.
- When a staff member submits a Form 1 (Process Recording) or Form 2 (Home Visitation), they may optionally link it to an existing appointment, which automatically updates that appointment's status to Completed.
- Regional Managers see all appointments for staff under their safehouse in TAB 4.
- Appointments with status Cancelled are hidden from the calendar but remain visible in the past list with a "Cancelled" badge.

## Donors & Contributions Page

Accessible to Executive Admin (all safehouses) and Regional Manager (their safehouse only). This page is the staff-facing management interface for all supporter and donation data. It is separate from the public-facing Donor Impact page.

### Supporters List

- Lists all rows from the supporters table. Columns: display name, supporter type, relationship type, region, country, status, first donation date, acquisition channel.
- Filter by: supporter type, relationship type, status, region, country, acquisition channel.
- Sort by: display name, first donation date, status. Pagination (default 25 per page).
- Click into a supporter to see their full profile and all associated donations.
- Staff can create a new supporter profile with the following fields:
  - Supporter Type (dropdown: MonetaryDonor / InKindDonor / Volunteer / SkillsContributor / SocialMediaAdvocate / PartnerOrganization, required)
  - Display Name (text, required)
  - Organization Name (text, optional — for org supporters)
  - First Name / Last Name (text, optional — for individual supporters)
  - Relationship Type (dropdown: Local / International / PartnerOrganization, required)
  - Region (text, optional)
  - Country (text, required)
  - Email (email input, required)
  - Phone (text, optional)
  - Status (dropdown: Active / Inactive, default Active)
  - Acquisition Channel (dropdown: Website / SocialMedia / Event / WordOfMouth / PartnerReferral / Church, required)
- Staff can edit any supporter profile field. Status can be toggled Active/Inactive. No hard deletes — supporters are marked Inactive only.

### Donation Recording

From within a supporter's profile, staff can record a new donation with the following fields:
- Donation Type (dropdown: Monetary / InKind / Time / Skills / SocialMedia, required)
- Donation Date (date picker, required)
- Is Recurring? (yes/no toggle)
- Campaign Name (dropdown or free text: Year-End Hope / Back to School / Summer of Safety / GivingTuesday, optional)
- Channel Source (dropdown: Campaign / Event / Direct / SocialMedia / PartnerReferral, required)
- Currency Code (auto-filled to PHP, shown only for Monetary type)
- Amount (decimal, required for Monetary donations)
- Estimated Value (decimal, required for non-monetary — value in pesos equivalent)
- Impact Unit (dropdown: pesos / items / hours / campaigns — auto-suggested based on donation type)
- Notes (textarea, optional)

For InKind donations, staff can add line items after saving the donation record (maps to in_kind_donation_items):
- Item Name, Item Category (dropdown: Food / Supplies / Clothing / SchoolMaterials / Hygiene / Furniture / Medical), Quantity, Unit of Measure, Estimated Unit Value, Intended Use (dropdown: Meals / Education / Shelter / Hygiene / Health), Received Condition (dropdown: New / Good / Fair).
- Multiple items can be added per donation.

### Donation Allocation

After recording a donation, staff can allocate it across safehouses and program areas (maps to donation_allocations):
- Select safehouse (dropdown)
- Select program area (dropdown: Education / Wellbeing / Operations / Transport / Maintenance / Outreach)
- Enter amount allocated (decimal)
- Allocation date (date picker, auto-filled to today)
- Multiple allocations can be added per donation until the full amount is allocated. Running total of allocated vs. unallocated amount is shown.

### Donation History View

- All donations listed in reverse chronological order. Columns: supporter name, donation type, date, amount/estimated value, campaign, channel, recurring flag.
- Filter by: supporter, donation type, campaign, channel, date range, recurring flag.
- Sort by: date, amount, supporter name. Pagination (default 25 per page).
- Click into a donation to see its full detail including allocation breakdown and (for InKind) item list.

## Donor Dashboard

Total Donations and individual impact of donor (ALL CHANGED UPDATE TO DB)

Button to create new donation with option as one time or recurring. 

### TAB 1 Donation history

See all their donations

### TAB 2 Manage donations

Cancel or change recurring donations

## Data Given

Here’s a concise description of each CSV (by name), based on the data dictionary.

### safehouses

One row per safehouse the organization operates. Stores where each home is (region, city, province, country), when it opened, whether it’s active, and its capacity and current occupancy. Used to understand safehouse locations and scale.

### partners

One row per external partner organization or individual. Tracks who they are, their role (education, logistics, maintenance, etc.), contact info, regions served, contract dates, and status. Used to manage service providers.

### partner_assignments

One row per partner × safehouse × program area. Describes which partner is assigned to which safehouse and in what program area (Education, Wellbeing, etc.), with start/end dates, whether they’re primary, and status. Used to coordinate partner coverage.

### supporters

One row per donor or supporter. Includes donor type (monetary, in‑kind, volunteer, etc.), names, contact details, relationship type (local/international), acquisition channel, status, and first donation date. Used as the master supporter/donor list.

### donations

One row per donation event across all types. Captures supporter ID, donation type (money, in‑kind, time, skills, social media), date, channel, amounts/estimated value, campaign, recurring flag, and links to partner or referring social post. Used to track all contributions.

### in_kind_donation_items

One row per item line under an in‑kind donation. Describes each item’s name, category (food, clothing, etc.), quantity, unit, estimated unit value, intended use, and condition. Used to understand detailed non‑cash support.

### donation_allocations

One row per donation × safehouse × program area. Shows how each donation’s value is allocated across safehouses and program areas, with allocation date and notes. Enables connecting donor money to specific work and locations.

### residents

One row per girl served. Contains demographic information, case category and sub‑categories (e.g., trafficked, physical abuse), disability and family socio‑economic flags, admission and referral details, assigned social worker, reintegration plan and status, risk levels, and case dates. This is the core case record.

### process_recordings

One row per counseling session. Tracks resident, session date, social worker, session type, duration, observed and ending emotional states, narrative, interventions, follow‑up actions, progress/concerns flags, referrals, and restricted notes. Used to document the therapeutic journey.

### home_visitations

One row per home or field visit. Includes resident, visit date, social worker, visit type (initial, follow‑up, reintegration, etc.), location, who was present, purpose, observations, family cooperation level, safety concerns, follow‑up needs, and visit outcome. Supports reintegration readiness and family assessments.

### education_records

One row per resident per month of education tracking. Stores date, program and course (e.g., Bridge Program – Math), education level, attendance status, rolling attendance rate, progress percent, completion status, GPA‑like score, and notes. Used to monitor education outcomes.

### health_wellbeing_records

One row per resident per month of health and wellbeing. Includes date, anthropometrics (weight, height, BMI), scores for nutrition, sleep, energy, and general health, plus whether medical/dental/psychological checkups happened and restricted medical notes. Used to track physical and wellbeing progress.

### intervention_plans

One row per intervention/goal for a resident. Describes category (Safety, Psychosocial, Education, etc.), plan description, services provided, numeric target (if any), target date, status, related case conference date, and timestamps. Used to manage and monitor structured care plans.

### incident_reports

One row per safety or behavioral incident. Includes resident and safehouse, date, incident type (behavioral, medical, security, self‑harm, etc.), severity, narrative description, response taken, resolution status and date, reporter, and whether follow‑up is required. Used for risk and safety monitoring.

### social_media_posts

One row per social media post across platforms (Facebook, Instagram, etc.). Captures platform metadata, content details (type, media, caption, hashtags, tone, call to action), campaign link, boosting and spend, and detailed engagement metrics (impressions, reach, likes, comments, shares, click‑throughs, donation referrals, etc.). Used to analyze what content drives engagement and donations.

### safehouse_monthly_metrics

One row per safehouse per month. Provides pre‑aggregated metrics: active resident count, average education progress and health score, counts of process recordings, home visits, incidents, and notes. Used for internal performance and operations monitoring.

### public_impact_snapshots

One row per month of organization‑wide, anonymized impact. Includes a date, public‑facing headline and summary text, a JSON payload of aggregated metrics, and publication flags/dates. Designed to power public/donor dashboards and storytelling about impact.

## Requirements By Class

### IS 401 – Project Management and Systems Design

In IS 401, the focus is on understanding the client problem and planning the solution. Teams work in four one‑day sprints (Mon–Thu), each with a defined sprint backlog and burndown chart. Students identify Scrum roles (Scrum Master, Product Owner), create key customer personas and journey maps, write a clear problem statement, and organize all functional and nonfunctional needs in a MoSCoW requirements table. They maintain a product backlog and daily sprint backlogs, and sketch Figma wireframes for the most important screens. Throughout the week they iteratively refine scope, track progress, and close with a retrospective and a primary OKR‑style metric that defines success.

### IS 413 – Enterprise Application Development

In IS 413, the emphasis is on building and deploying a working web application. Using .NET 10 / C# on the backend, React + TypeScript (Vite) on the frontend, and a relational database (e.g., Azure SQL), teams must implement all core pages: a public home/landing page, an impact / donor‑facing dashboard, login, privacy policy + cookie consent, a donor dashboard (with fake but persisted donations and history), and an authenticated admin/staff portal. The admin portal must support donors and contributions management, caseload inventory, process recordings, home visitations and case conferences, and reports & analytics. The app and database must be fully deployed and production‑like, with solid validation, error handling, consistency, and UX polish.

### IS 414 – Security

In IS 414, the same system must be hardened and operated securely. Requirements include enforcing HTTPS/TLS and HTTP→HTTPS redirects, implementing username/password authentication (e.g., ASP.NET Identity) with stronger‑than‑default password policies, and locking down API endpoints and pages via proper authentication and role‑based authorization. Only admins can create/update/delete sensitive data; donors can see only their own history and impact; visitors see limited public content. Credentials must be handled safely (e.g., secrets manager, env vars), and the app needs a GDPR‑aligned privacy policy plus a real cookie consent mechanism. Teams also configure a Content‑Security‑Policy HTTP header, ensure public availability of the site, and implement at least one additional security or privacy feature beyond the baseline.

### IS 455 – Machine Learning

In IS 455, teams use the provided Lighthouse‑style dataset to build complete end‑to‑end ML pipelines that support the nonprofit’s decisions. Each pipeline starts with problem framing (clear business question, predictive vs. explanatory goals and metrics), then moves through data acquisition and preparation (joins, cleaning, feature engineering), exploration, modeling and feature selection, and rigorous evaluation. Each notebook must include both a causal/explanatory model and a predictive model, with discussion of feature importance and what decisions the organization can make from the results. Finally, selected models are deployed or surfaced in the web app (e.g., via an API endpoint or dashboard), so that predictions and insights are actually used by staff or donors.