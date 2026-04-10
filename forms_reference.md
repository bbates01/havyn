# Forms Reference Guide

> Based on the live database schema (`database_schema.csv`).
> Roles managed via ASP.NET Identity (`AspNetRoles` / `AspNetUserRoles`).
> Worker scope enforced by matching `Residents.AssignedSocialWorker` against `AspNetUsers.SocialWorkerCode`.

---

## Role Definitions

| Role | Scope | Description |
|---|---|---|
| **Admin** | All safehouses | Full read/write access to every form and every resident |
| **Manager** | Own safehouse only | Full read/write access scoped to their safehouse |
| **Worker** | Varies per form | Limited write access — see each form for exact scope |
| **Donor** | None | No access to any form data |

---

## 1. Resident Intake

**Table:** `Residents` | **Primary key:** `ResidentId` | **Volume:** 60 rows

Master record created on admission. Every other clinical form references `ResidentId` as a foreign key. Access is scoped via `AspNetUsers.SafehouseId`.

### Fields

#### Case identifiers

| Column | Type | Nullable | Description |
|---|---|---|---|
| `ResidentId` | integer | NOT NULL | PK — auto-generated |
| `CaseControlNo` | text | YES | Official case control number, e.g. C0043 |
| `InternalCode` | text | YES | Safehouse-assigned code, e.g. LS-0001 |
| `SafehouseId` | integer | YES | FK → `Safehouses.SafehouseId` |
| `CaseStatus` | text | YES | Active / Closed |

#### Personal information

| Column | Type | Nullable | Description |
|---|---|---|---|
| `Sex` | text | YES | Gender of child |
| `DateOfBirth` | date | YES | Child's date of birth |
| `BirthStatus` | text | YES | Marital / Non-marital |
| `PlaceOfBirth` | text | YES | City or municipality of birth |
| `Religion` | text | YES | Child's declared religion |

#### Case classification

| Column | Type | Nullable | Description |
|---|---|---|---|
| `CaseCategory` | text | YES | Neglected / Surrendered / Abandoned / etc. |
| `SubCatOrphaned` | boolean | YES | Orphaned child flag |
| `SubCatTrafficked` | boolean | YES | Victim of trafficking |
| `SubCatChildLabor` | boolean | YES | Child labor involvement |
| `SubCatPhysicalAbuse` | boolean | YES | Victim of physical abuse |
| `SubCatSexualAbuse` | boolean | YES | Victim of sexual abuse |
| `SubCatOsaec` | boolean | YES | Online sexual abuse/exploitation of children |
| `SubCatCicl` | boolean | YES | Child in conflict with the law |
| `SubCatAtRisk` | boolean | YES | At-risk child |
| `SubCatStreetChild` | boolean | YES | Street child |
| `SubCatChildWithHiv` | boolean | YES | Child living with HIV |

#### Disability & special needs

| Column | Type | Nullable | Description |
|---|---|---|---|
| `IsPwd` | boolean | YES | Person with disability flag |
| `PwdType` | text | YES | Type of disability, if applicable |
| `HasSpecialNeeds` | boolean | YES | Requires special support |
| `SpecialNeedsDiagnosis` | text | YES | E.g. Speech Impairment, ADHD |

#### Family background

| Column | Type | Nullable | Description |
|---|---|---|---|
| `FamilyIs4ps` | boolean | YES | Pantawid Pamilyang Pilipino Program beneficiary |
| `FamilySoloParent` | boolean | YES | Solo-parent household |
| `FamilyIndigenous` | boolean | YES | Belongs to an indigenous group |
| `FamilyParentPwd` | boolean | YES | Parent is a PWD |
| `FamilyInformalSettler` | boolean | YES | Family is an informal settler |

#### Admission & referral

| Column | Type | Nullable | Description |
|---|---|---|---|
| `DateOfAdmission` | date | YES | Date child entered the safehouse |
| `AgeUponAdmission` | text | YES | Age at admission, e.g. 15 Years 9 months |
| `PresentAge` | text | YES | Current computed age |
| `LengthOfStay` | text | YES | Duration in care |
| `ReferralSource` | text | YES | E.g. NGO, Government Agency, Court |
| `ReferringAgencyPerson` | text | YES | Name of referring individual or agency |

#### Civil registration

| Column | Type | Nullable | Description |
|---|---|---|---|
| `DateColbRegistered` | date | YES | Certificate of Live Birth registration date |
| `DateColbObtained` | date | YES | Date COLB was physically received |

#### Case management

| Column | Type | Nullable | Description |
|---|---|---|---|
| `AssignedSocialWorker` | text | YES | FK → `SocialWorkers.WorkerCode` |
| `InitialCaseAssessment` | text | YES | E.g. For Reunification, For Continued Care |
| `DateCaseStudyPrepared` | date | YES | When formal case study was completed |
| `ReintegrationType` | text | YES | Family Reunification / Foster Care / etc. |
| `ReintegrationStatus` | text | YES | In Progress / Completed / On Hold |
| `InitialRiskLevel` | text | YES | Risk level at admission: Critical / Medium / Low |
| `CurrentRiskLevel` | text | YES | Most recent assessed risk level |
| `DateEnrolled` | date | YES | Date enrolled in programs |
| `DateClosed` | date | YES | Date case was closed, if applicable |
| `CreatedAt` | timestamp | YES | Record creation timestamp |
| `NotesRestricted` | text | YES | Confidential notes — hidden from Worker role |

### Role Access

| Role | Access | Scope |
|---|---|---|
| Admin | Full read/write | All safehouses, all residents |
| Manager | Full read/write | Own safehouse only |
| Worker | **No access** | — |
| Donor | **No access** | — |

---

## 2. Appointments

**Table:** `Appointments` | **Primary key:** `AppointmentId` | **Volume:** system table

Scheduling form for resident appointments — medical, legal, counseling, and other sessions. Links to both `AspNetUsers` (staff) and `Residents`.

### Fields

#### Appointment identifiers

| Column | Type | Nullable | Description |
|---|---|---|---|
| `AppointmentId` | integer | NOT NULL | PK — auto-generated |
| `StaffUserId` | varchar(450) | NOT NULL | FK → `AspNetUsers.Id` — staff member responsible |
| `ResidentId` | integer | NOT NULL | FK → `Residents.ResidentId` |

#### Appointment details

| Column | Type | Nullable | Description |
|---|---|---|---|
| `EventName` | varchar(150) | YES | Optional name or title for the appointment |
| `AppointmentDate` | date | NOT NULL | Date of the appointment |
| `AppointmentTime` | time | NOT NULL | Time of the appointment |
| `AppointmentType` | varchar(30) | NOT NULL | Category: Medical / Legal / Counseling / etc. |
| `SessionFormat` | varchar(30) | NOT NULL | In-person / Remote / Phone |
| `Location` | varchar(200) | YES | Where the appointment takes place |

#### Status & audit

| Column | Type | Nullable | Description |
|---|---|---|---|
| `Status` | varchar(20) | NOT NULL | Scheduled / Completed / Cancelled — default: Scheduled |
| `Notes` | varchar(500) | YES | Optional notes about the appointment |
| `CreatedAt` | timestamptz | NOT NULL | Auto-set on creation |
| `UpdatedAt` | timestamptz | NOT NULL | Auto-updated on save |

### Role Access

| Role | Access | Scope |
|---|---|---|
| Admin | Full read/write | All safehouses, all residents |
| Manager | Full read/write | Own safehouse only |
| Worker | **No access** | — |
| Donor | **No access** | — |

---

## 3. Process Recording

**Table:** `ProcessRecordings` | **Primary key:** `RecordingId` | **Volume:** 2,819 rows

Filed after every individual or group counseling or therapy session. The most frequently completed form in the system. Workers can create and edit recordings for **any resident**.

### Fields

#### Session identifiers

| Column | Type | Nullable | Description |
|---|---|---|---|
| `RecordingId` | integer | NOT NULL | PK — auto-generated |
| `ResidentId` | integer | YES | FK → `Residents.ResidentId` |
| `SessionDate` | date | YES | Date session took place |
| `SocialWorker` | text | YES | FK → `SocialWorkers.WorkerCode` |

#### Session details

| Column | Type | Nullable | Description |
|---|---|---|---|
| `SessionType` | text | YES | Individual / Group |
| `SessionDurationMinutes` | integer | YES | Length of session in minutes |
| `EmotionalStateObserved` | text | YES | Emotional state at session start (Angry, Distressed, Anxious, Hopeful…) |
| `EmotionalStateEnd` | text | YES | Emotional state at session close (Happy, Hopeful, Sad…) |

#### Narrative & interventions

| Column | Type | Nullable | Description |
|---|---|---|---|
| `SessionNarrative` | text | YES | Written summary of what occurred in the session |
| `InterventionsApplied` | text | YES | Comma-separated list: Caring, Legal Services, Healing, Teaching |
| `FollowUpActions` | text | YES | E.g. Referral to specialist, Schedule follow-up session |

#### Flags

| Column | Type | Nullable | Description |
|---|---|---|---|
| `ProgressNoted` | boolean | YES | Positive progress observed during session |
| `ConcernsFlagged` | boolean | YES | Issues or red flags were raised |
| `ReferralMade` | boolean | YES | External referral was initiated |
| `NotesRestricted` | text | YES | Confidential notes — hidden from Worker role |

### Role Access

| Role | Access | Scope |
|---|---|---|
| Admin | Full read/write | All safehouses; `NotesRestricted` visible |
| Manager | Full read/write | Own safehouse only; `NotesRestricted` visible |
| Worker | Write — any resident | Can create/edit for any resident; `NotesRestricted` hidden |
| Donor | **No access** | — |

---

## 4. Home Visitation

**Table:** `HomeVisitations` | **Primary key:** `VisitationId` | **Volume:** 1,337 rows

Completed after every home, community, or placement visit. Workers can only file visitations for their **assigned residents** (enforced via `Residents.AssignedSocialWorker`).

### Fields

#### Visit identifiers

| Column | Type | Nullable | Description |
|---|---|---|---|
| `VisitationId` | integer | NOT NULL | PK — auto-generated |
| `ResidentId` | integer | YES | FK → `Residents.ResidentId` |
| `VisitDate` | date | YES | Date of the visit |
| `SocialWorker` | text | YES | FK → `SocialWorkers.WorkerCode` |

#### Visit details

| Column | Type | Nullable | Description |
|---|---|---|---|
| `VisitType` | text | YES | Routine Follow-Up / Reintegration Assessment / Post-Placement Monitoring |
| `LocationVisited` | text | YES | E.g. Proposed Foster Home, Barangay Office, Church |
| `FamilyMembersPresent` | text | YES | Names and relationships, e.g. Lopez (Parent), Diaz (Sibling) |
| `Purpose` | text | YES | Stated reason for the visit |

#### Observations & outcome

| Column | Type | Nullable | Description |
|---|---|---|---|
| `Observations` | text | YES | Field notes recorded during the visit |
| `FamilyCooperationLevel` | text | YES | Cooperative / Neutral / Uncooperative |
| `SafetyConcernsNoted` | boolean | YES | Safety concerns identified during visit |
| `VisitOutcome` | text | YES | Favorable / Unfavorable / Needs Improvement |

#### Follow-up

| Column | Type | Nullable | Description |
|---|---|---|---|
| `FollowUpNeeded` | boolean | YES | Further visit or action required |
| `FollowUpNotes` | text | YES | Details on required next steps |

### Role Access

| Role | Access | Scope |
|---|---|---|
| Admin | Full read/write | All safehouses, all residents |
| Manager | Full read/write | Own safehouse only |
| Worker | Write — assigned residents only | `ResidentId` must match worker's assigned residents |
| Donor | **No access** | — |

---

## 5. Intervention Plan

**Table:** `InterventionPlans` | **Primary key:** `PlanId` | **Volume:** 180 rows

Goal-setting and service-tracking plan per resident across three categories: Safety, Education, and Physical Health. Workers can only create and edit plans for their **assigned residents**.

### Fields

#### Plan identifiers

| Column | Type | Nullable | Description |
|---|---|---|---|
| `PlanId` | integer | NOT NULL | PK — auto-generated |
| `ResidentId` | integer | YES | FK → `Residents.ResidentId` |
| `PlanCategory` | text | YES | Safety / Education / Physical Health |

#### Plan content

| Column | Type | Nullable | Description |
|---|---|---|---|
| `PlanDescription` | text | YES | Goal narrative, e.g. Improve nutrition and overall wellbeing |
| `ServicesProvided` | text | YES | Comma-separated: Healing, Legal Services, Teaching, Caring |
| `TargetValue` | numeric | YES | Numeric target, e.g. health score of 4.2 or completion rate of 0.85 |
| `TargetDate` | date | YES | Deadline for achieving the goal |

#### Status & audit

| Column | Type | Nullable | Description |
|---|---|---|---|
| `Status` | text | YES | In Progress / On Hold / Completed |
| `CaseConferenceDate` | date | YES | Date plan was reviewed in a case conference |
| `CreatedAt` | timestamp | YES | Record creation timestamp |
| `UpdatedAt` | timestamp | YES | Last modification timestamp |

### Role Access

| Role | Access | Scope |
|---|---|---|
| Admin | Full read/write | All safehouses, all residents |
| Manager | Full read/write | Own safehouse only |
| Worker | Write — assigned residents only | `ResidentId` must match worker's assigned residents |
| Donor | **No access** | — |

---

## 6. Incident Report

**Table:** `IncidentReports` | **Primary key:** `IncidentId` | **Volume:** 100 rows

Filed whenever a notable incident occurs at a safehouse. Incident types: Medical, Security, Behavioral, RunawayAttempt. Workers can file reports for **any resident**, not just their assigned ones.

### Fields

#### Incident identifiers

| Column | Type | Nullable | Description |
|---|---|---|---|
| `IncidentId` | integer | NOT NULL | PK — auto-generated |
| `ResidentId` | integer | YES | FK → `Residents.ResidentId` |
| `SafehouseId` | integer | YES | FK → `Safehouses.SafehouseId` — where incident occurred |
| `IncidentDate` | date | YES | Date the incident occurred |
| `ReportedBy` | text | YES | FK → `SocialWorkers.WorkerCode` — reporting worker |

#### Incident details

| Column | Type | Nullable | Description |
|---|---|---|---|
| `IncidentType` | text | YES | Medical / Security / Behavioral / RunawayAttempt |
| `Severity` | text | YES | Low / Medium / High |
| `Description` | text | YES | Narrative of what happened |
| `ResponseTaken` | text | YES | Actions taken immediately by staff |

#### Resolution

| Column | Type | Nullable | Description |
|---|---|---|---|
| `Resolved` | boolean | YES | Whether the incident has been resolved |
| `ResolutionDate` | date | YES | Date resolution was achieved, if resolved |
| `FollowUpRequired` | boolean | YES | Whether further follow-up action is still needed |

### Role Access

| Role | Access | Scope |
|---|---|---|
| Admin | Full read/write | All safehouses, all residents |
| Manager | Full read/write | Own safehouse only |
| Worker | Write — any resident | Can file for any resident; scoped to own safehouse |
| Donor | **No access** | — |

---

## 7. Health & Wellbeing

**Table:** `HealthWellbeingRecords` | **Primary key:** `HealthRecordId` | **Volume:** 534 rows

Monthly health monitoring form capturing wellness scores and physical measurements per resident. Workers can only create and edit records for their **assigned residents**.

### Fields

#### Record identifiers

| Column | Type | Nullable | Description |
|---|---|---|---|
| `HealthRecordId` | integer | NOT NULL | PK — auto-generated |
| `ResidentId` | integer | YES | FK → `Residents.ResidentId` |
| `RecordDate` | date | YES | Date of the assessment |

#### Wellness scores

| Column | Type | Nullable | Description |
|---|---|---|---|
| `GeneralHealthScore` | numeric | YES | Overall health rating on numeric scale |
| `NutritionScore` | numeric | YES | Nutritional status score |
| `SleepQualityScore` | numeric | YES | Sleep quality rating |
| `EnergyLevelScore` | numeric | YES | Energy and vitality score |

#### Physical measurements

| Column | Type | Nullable | Description |
|---|---|---|---|
| `HeightCm` | numeric | YES | Height in centimeters |
| `WeightKg` | numeric | YES | Weight in kilograms |
| `Bmi` | numeric | YES | Body mass index — computed from height and weight |

#### Checkup completion

| Column | Type | Nullable | Description |
|---|---|---|---|
| `MedicalCheckupDone` | boolean | YES | General medical checkup completed this period |
| `DentalCheckupDone` | boolean | YES | Dental checkup completed this period |
| `PsychologicalCheckupDone` | boolean | YES | Psychological assessment completed this period |
| `Notes` | text | YES | E.g. Health status: Stable |

### Role Access

| Role | Access | Scope |
|---|---|---|
| Admin | Full read/write | All safehouses, all residents |
| Manager | Full read/write | Own safehouse only |
| Worker | Write — assigned residents only | `ResidentId` must match worker's assigned residents |
| Donor | **No access** | — |

---

## 8. Education Record

**Table:** `EducationRecords` | **Primary key:** `EducationRecordId` | **Volume:** 534 rows

Monthly academic tracking form per resident covering enrollment, attendance, and curriculum progress. Workers can only create and edit records for their **assigned residents**.

### Fields

#### Record identifiers

| Column | Type | Nullable | Description |
|---|---|---|---|
| `EducationRecordId` | integer | NOT NULL | PK — auto-generated |
| `ResidentId` | integer | YES | FK → `Residents.ResidentId` |
| `RecordDate` | date | YES | Date of the record |

#### Enrollment details

| Column | Type | Nullable | Description |
|---|---|---|---|
| `EducationLevel` | text | YES | Primary / Secondary / Vocational |
| `SchoolName` | text | YES | Name or code of school enrolled in |
| `EnrollmentStatus` | text | YES | Enrolled / Not Enrolled |

#### Progress tracking

| Column | Type | Nullable | Description |
|---|---|---|---|
| `AttendanceRate` | numeric | YES | Attendance as proportion, e.g. 0.966 = 96.6% |
| `ProgressPercent` | numeric | YES | Curriculum completion percentage |
| `CompletionStatus` | text | YES | NotStarted / InProgress / Completed |
| `Notes` | text | YES | E.g. Progress: InProgress |

### Role Access

| Role | Access | Scope |
|---|---|---|
| Admin | Full read/write | All safehouses, all residents |
| Manager | Full read/write | Own safehouse only |
| Worker | Write — assigned residents only | `ResidentId` must match worker's assigned residents |
| Donor | **No access** | — |

---

## Worker Permission Summary

| Form | Worker Access | Resident Scope |
|---|---|---|
| Resident intake | No access | — |
| Appointments | No access | — |
| Process recording | Write | Any resident |
| Incident report | Write | Any resident (own safehouse) |
| Home visitation | Write | Assigned residents only |
| Intervention plan | Write | Assigned residents only |
| Health & wellbeing | Write | Assigned residents only |
| Education record | Write | Assigned residents only |

> "Assigned residents only" is enforced by checking `Residents.AssignedSocialWorker` against the logged-in user's `AspNetUsers.SocialWorkerCode` before allowing a write operation.

---

## Key Foreign Keys

| Table | Column | References |
|---|---|---|
| `Residents` | `SafehouseId` | `Safehouses.SafehouseId` |
| `Residents` | `AssignedSocialWorker` | `SocialWorkers.WorkerCode` |
| `Appointments` | `StaffUserId` | `AspNetUsers.Id` |
| `Appointments` | `ResidentId` | `Residents.ResidentId` |
| `ProcessRecordings` | `ResidentId` | `Residents.ResidentId` |
| `ProcessRecordings` | `SocialWorker` | `SocialWorkers.WorkerCode` |
| `HomeVisitations` | `ResidentId` | `Residents.ResidentId` |
| `HomeVisitations` | `SocialWorker` | `SocialWorkers.WorkerCode` |
| `InterventionPlans` | `ResidentId` | `Residents.ResidentId` |
| `IncidentReports` | `ResidentId` | `Residents.ResidentId` |
| `IncidentReports` | `SafehouseId` | `Safehouses.SafehouseId` |
| `IncidentReports` | `ReportedBy` | `SocialWorkers.WorkerCode` |
| `HealthWellbeingRecords` | `ResidentId` | `Residents.ResidentId` |
| `EducationRecords` | `ResidentId` | `Residents.ResidentId` |
| `AspNetUsers` | `SafehouseId` | `Safehouses.SafehouseId` |
| `SocialWorkerUsers` | `UserId` | `AspNetUsers.Id` |
| `SocialWorkerUsers` | `SocialWorkerId` | `SocialWorkers.SocialWorkerId` |
