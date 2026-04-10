import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { apiFetch } from '../api/apiHelper';
import { useAuth } from '../context/AuthContext';
import type { InterventionPlan } from '../types/InterventionPlan';
import type { Resident } from '../types/Resident';
import FormHistoryList from '../components/FormHistoryList';

type RawObj = Record<string, unknown>;

type PlanCategory =
  | 'Safety'
  | 'Psychosocial'
  | 'Education'
  | 'Physical Health'
  | 'Legal'
  | 'Reintegration';

const PLAN_CATEGORIES: PlanCategory[] = [
  'Safety',
  'Psychosocial',
  'Education',
  'Physical Health',
  'Legal',
  'Reintegration',
];

const NEW_PLAN_STATUSES = ['Open', 'In Progress'] as const;
type NewPlanStatus = (typeof NEW_PLAN_STATUSES)[number];

const HISTORY_PAGE_SIZE = 25;

function toIsoDateOnly(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function truncateText(s: string, maxLen: number): { short: string; truncated: boolean } {
  if (s.length <= maxLen) return { short: s, truncated: false };
  return { short: `${s.slice(0, maxLen)}…`, truncated: true };
}

function sortByDateAsc(a: string, b: string): number {
  return a.localeCompare(b);
}

function sortByDateDesc(a: string, b: string): number {
  return b.localeCompare(a);
}

function normalizeInterventionPlan(raw: RawObj): InterventionPlan {
  const targetValueRaw = raw.targetValue ?? raw.TargetValue ?? 0;
  return {
    planId: Number(raw.planId ?? raw.PlanId ?? 0),
    residentId: Number(raw.residentId ?? raw.ResidentId ?? 0),
    planCategory: String(raw.planCategory ?? raw.PlanCategory ?? ''),
    planDescription: String(raw.planDescription ?? raw.PlanDescription ?? ''),
    servicesProvided: String(raw.servicesProvided ?? raw.ServicesProvided ?? ''),
    targetValue: Number(targetValueRaw),
    targetDate: String(raw.targetDate ?? raw.TargetDate ?? ''),
    status: String(raw.status ?? raw.Status ?? ''),
    caseConferenceDate:
      raw.caseConferenceDate != null || raw.CaseConferenceDate != null
        ? String(raw.caseConferenceDate ?? raw.CaseConferenceDate)
        : null,
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
    updatedAt: String(raw.updatedAt ?? raw.UpdatedAt ?? ''),
  };
}

function normalizeResident(raw: RawObj): Resident {
  return {
    residentId: Number(raw.residentId ?? raw.ResidentId ?? 0),
    caseControlNo: String(raw.caseControlNo ?? raw.CaseControlNo ?? ''),
    internalCode: String(raw.internalCode ?? raw.InternalCode ?? ''),
    safehouseId: Number(raw.safehouseId ?? raw.SafehouseId ?? 0),
    caseStatus: String(raw.caseStatus ?? raw.CaseStatus ?? ''),
    sex: String(raw.sex ?? raw.Sex ?? ''),
    dateOfBirth: String(raw.dateOfBirth ?? raw.DateOfBirth ?? ''),
    birthStatus: String(raw.birthStatus ?? raw.BirthStatus ?? ''),
    placeOfBirth: String(raw.placeOfBirth ?? raw.PlaceOfBirth ?? ''),
    religion: String(raw.religion ?? raw.Religion ?? ''),
    caseCategory: String(raw.caseCategory ?? raw.CaseCategory ?? ''),
    subCatOrphaned: Boolean(raw.subCatOrphaned ?? raw.SubCatOrphaned),
    subCatTrafficked: Boolean(raw.subCatTrafficked ?? raw.SubCatTrafficked),
    subCatChildLabor: Boolean(raw.subCatChildLabor ?? raw.SubCatChildLabor),
    subCatPhysicalAbuse: Boolean(raw.subCatPhysicalAbuse ?? raw.SubCatPhysicalAbuse),
    subCatSexualAbuse: Boolean(raw.subCatSexualAbuse ?? raw.SubCatSexualAbuse),
    subCatOsaec: Boolean(raw.subCatOsaec ?? raw.SubCatOsaec),
    subCatCicl: Boolean(raw.subCatCicl ?? raw.SubCatCicl),
    subCatAtRisk: Boolean(raw.subCatAtRisk ?? raw.SubCatAtRisk),
    subCatStreetChild: Boolean(raw.subCatStreetChild ?? raw.SubCatStreetChild),
    subCatChildWithHiv: Boolean(raw.subCatChildWithHiv ?? raw.SubCatChildWithHiv),
    isPwd: Boolean(raw.isPwd ?? raw.IsPwd),
    pwdType:
      raw.pwdType != null || raw.PwdType != null ? String(raw.pwdType ?? raw.PwdType) : null,
    hasSpecialNeeds: Boolean(raw.hasSpecialNeeds ?? raw.HasSpecialNeeds),
    specialNeedsDiagnosis:
      raw.specialNeedsDiagnosis != null || raw.SpecialNeedsDiagnosis != null
        ? String(raw.specialNeedsDiagnosis ?? raw.SpecialNeedsDiagnosis)
        : null,
    familyIs4ps: Boolean(raw.familyIs4ps ?? raw.FamilyIs4ps),
    familySoloParent: Boolean(raw.familySoloParent ?? raw.FamilySoloParent),
    familyIndigenous: Boolean(raw.familyIndigenous ?? raw.FamilyIndigenous),
    familyParentPwd: Boolean(raw.familyParentPwd ?? raw.FamilyParentPwd),
    familyInformalSettler: Boolean(raw.familyInformalSettler ?? raw.FamilyInformalSettler),
    dateOfAdmission: String(raw.dateOfAdmission ?? raw.DateOfAdmission ?? ''),
    ageUponAdmission: String(raw.ageUponAdmission ?? raw.AgeUponAdmission ?? ''),
    presentAge: String(raw.presentAge ?? raw.PresentAge ?? ''),
    lengthOfStay: String(raw.lengthOfStay ?? raw.LengthOfStay ?? ''),
    referralSource:
      raw.referralSource != null || raw.ReferralSource != null
        ? String(raw.referralSource ?? raw.ReferralSource)
        : null,
    referringAgencyPerson:
      raw.referringAgencyPerson != null || raw.ReferringAgencyPerson != null
        ? String(raw.referringAgencyPerson ?? raw.ReferringAgencyPerson)
        : null,
    dateColbRegistered:
      raw.dateColbRegistered != null || raw.DateColbRegistered != null
        ? String(raw.dateColbRegistered ?? raw.DateColbRegistered)
        : null,
    dateColbObtained:
      raw.dateColbObtained != null || raw.DateColbObtained != null
        ? String(raw.dateColbObtained ?? raw.DateColbObtained)
        : null,
    assignedSocialWorker:
      raw.assignedSocialWorker != null || raw.AssignedSocialWorker != null
        ? String(raw.assignedSocialWorker ?? raw.AssignedSocialWorker)
        : null,
    initialCaseAssessment:
      raw.initialCaseAssessment != null || raw.InitialCaseAssessment != null
        ? String(raw.initialCaseAssessment ?? raw.InitialCaseAssessment)
        : null,
    dateCaseStudyPrepared:
      raw.dateCaseStudyPrepared != null || raw.DateCaseStudyPrepared != null
        ? String(raw.dateCaseStudyPrepared ?? raw.DateCaseStudyPrepared)
        : null,
    reintegrationType:
      raw.reintegrationType != null || raw.ReintegrationType != null
        ? String(raw.reintegrationType ?? raw.ReintegrationType)
        : null,
    reintegrationStatus:
      raw.reintegrationStatus != null || raw.ReintegrationStatus != null
        ? String(raw.reintegrationStatus ?? raw.ReintegrationStatus)
        : null,
    initialRiskLevel:
      raw.initialRiskLevel != null || raw.InitialRiskLevel != null
        ? String(raw.initialRiskLevel ?? raw.InitialRiskLevel)
        : null,
    currentRiskLevel:
      raw.currentRiskLevel != null || raw.CurrentRiskLevel != null
        ? String(raw.currentRiskLevel ?? raw.CurrentRiskLevel)
        : null,
    dateEnrolled:
      raw.dateEnrolled != null || raw.DateEnrolled != null
        ? String(raw.dateEnrolled ?? raw.DateEnrolled)
        : null,
    dateClosed:
      raw.dateClosed != null || raw.DateClosed != null ? String(raw.dateClosed ?? raw.DateClosed) : null,
    createdAt:
      raw.createdAt != null || raw.CreatedAt != null ? String(raw.createdAt ?? raw.CreatedAt) : null,
    notesRestricted:
      raw.notesRestricted != null || raw.NotesRestricted != null
        ? String(raw.notesRestricted ?? raw.NotesRestricted)
        : null,
  };
}

function extractItems<T>(raw: unknown): T[] {
  if (!raw || typeof raw !== 'object') return [];
  const o = raw as { items?: T[]; Items?: T[] };
  return o.items ?? o.Items ?? (Array.isArray(raw) ? (raw as T[]) : []);
}

function formatPrettyDate(dateOnly: string): string {
  const d = new Date(`${dateOnly}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function statusBadgeClass(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'open') return 'bg-primary';
  if (normalized === 'in progress') return 'bg-warning text-dark';
  return 'bg-secondary';
}

export default function CaseConferencesPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const role: 'admin' | 'manager' | 'staff' | null = user?.roles.includes('Admin')
    ? 'admin'
    : user?.roles.includes('Manager')
      ? 'manager'
      : user?.roles.includes('SocialWorker')
        ? 'staff'
        : null;

  const safehouseId = user?.safehouseId ?? null;
  const today = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [plans, setPlans] = useState<InterventionPlan[]>([]);

  const [expandedUpcomingDescriptions, setExpandedUpcomingDescriptions] = useState<Set<number>>(
    () => new Set()
  );
  const [expandedHistoryRows, setExpandedHistoryRows] = useState<Set<number>>(() => new Set());

  const [historySearch, setHistorySearch] = useState('');
  const [historyFromDate, setHistoryFromDate] = useState('');
  const [historyToDate, setHistoryToDate] = useState('');
  const [historySortDir, setHistorySortDir] = useState<'asc' | 'desc'>('desc');
  const [historyPage, setHistoryPage] = useState(1);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);

  const [fResidentId, setFResidentId] = useState('');
  const [fResidentSearch, setFResidentSearch] = useState('');
  const [fCategory, setFCategory] = useState<PlanCategory>('Safety');
  const [fDescription, setFDescription] = useState('');
  const [fServices, setFServices] = useState('');
  const [fTargetValue, setFTargetValue] = useState('');
  const [fTargetDate, setFTargetDate] = useState('');
  const [fStatus, setFStatus] = useState<NewPlanStatus>('Open');
  const [fConferenceDate, setFConferenceDate] = useState('');

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch, historyFromDate, historyToDate, historySortDir]);

  useEffect(() => {
    if (role !== 'manager' || safehouseId == null) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [resRaw, plansRaw] = await Promise.all([
          apiFetch<unknown>(
            `/api/Residents/AllResidents?pageSize=200&pageIndex=1&safehouseId=${safehouseId}`
          ),
          apiFetch<unknown>('/api/InterventionPlans/AllPlans?pageSize=500&pageIndex=1'),
        ]);

        if (cancelled) return;
        const rs = extractItems<Record<string, unknown>>(resRaw).map(normalizeResident);
        const safehouseResidentIds = new Set(rs.map((r) => r.residentId));

        const allPlans = extractItems<Record<string, unknown>>(plansRaw).map(normalizeInterventionPlan);
        const filtered = allPlans.filter((p) => {
          const confDate = toIsoDateOnly(p.caseConferenceDate);
          if (!confDate) return false;
          return safehouseResidentIds.has(p.residentId);
        });

        setResidents(rs);
        setPlans(filtered);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load case conferences.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [role, safehouseId]);

  const residentById = useMemo(() => {
    const map = new Map<number, Resident>();
    for (const r of residents) map.set(r.residentId, r);
    return map;
  }, [residents]);

  const upcomingPlans = useMemo(() => {
    return [...plans]
      .filter((p) => {
        const conf = toIsoDateOnly(p.caseConferenceDate);
        return conf != null && conf > today;
      })
      .sort((a, b) =>
        sortByDateAsc(toIsoDateOnly(a.caseConferenceDate) ?? '', toIsoDateOnly(b.caseConferenceDate) ?? '')
      );
  }, [plans, today]);

  const upcomingByDate = useMemo(() => {
    const groups = new Map<string, InterventionPlan[]>();
    for (const p of upcomingPlans) {
      const key = toIsoDateOnly(p.caseConferenceDate);
      if (!key) continue;
      const arr = groups.get(key);
      if (arr) arr.push(p);
      else groups.set(key, [p]);
    }
    return [...groups.entries()].sort((a, b) => sortByDateAsc(a[0], b[0]));
  }, [upcomingPlans]);

  const historyPlansFiltered = useMemo(() => {
    const normalizedSearch = historySearch.trim().toLowerCase();
    const from = historyFromDate.trim() || null;
    const to = historyToDate.trim() || null;

    let rows = plans.filter((p) => {
      const conf = toIsoDateOnly(p.caseConferenceDate);
      if (!conf) return false;
      if (conf > today) return false;
      const resident = residentById.get(p.residentId);
      const internal = (resident?.internalCode ?? '').toLowerCase();
      if (normalizedSearch && !internal.includes(normalizedSearch)) return false;
      if (from && conf < from) return false;
      if (to && conf > to) return false;
      return true;
    });

    rows = rows.sort((a, b) => {
      const aa = toIsoDateOnly(a.caseConferenceDate) ?? '';
      const bb = toIsoDateOnly(b.caseConferenceDate) ?? '';
      return historySortDir === 'desc' ? sortByDateDesc(aa, bb) : sortByDateAsc(aa, bb);
    });

    return rows;
  }, [plans, today, residentById, historySearch, historyFromDate, historyToDate, historySortDir]);

  const historyTotalPages = Math.max(1, Math.ceil(historyPlansFiltered.length / HISTORY_PAGE_SIZE));
  const historyPageSafe = Math.min(historyPage, historyTotalPages);
  const historyStart = (historyPageSafe - 1) * HISTORY_PAGE_SIZE;
  const historyPageRows = historyPlansFiltered.slice(historyStart, historyStart + HISTORY_PAGE_SIZE);

  const residentOptions = useMemo(() => {
    const q = fResidentSearch.trim().toLowerCase();
    const sorted = [...residents].sort((a, b) => a.internalCode.localeCompare(b.internalCode));
    if (!q) return sorted;
    return sorted.filter((r) => r.internalCode.toLowerCase().includes(q));
  }, [residents, fResidentSearch]);

  const toggleUpcomingDesc = (planId: number) => {
    setExpandedUpcomingDescriptions((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) next.delete(planId);
      else next.add(planId);
      return next;
    });
  };

  const toggleHistoryRow = (planId: number) => {
    setExpandedHistoryRows((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) next.delete(planId);
      else next.add(planId);
      return next;
    });
  };

  const openScheduleModal = () => {
    setScheduleError(null);
    setEditingPlanId(null);
    setFResidentId('');
    setFResidentSearch('');
    setFCategory('Safety');
    setFDescription('');
    setFServices('');
    setFTargetValue('');
    setFTargetDate('');
    setFStatus('Open');
    setFConferenceDate('');
    setScheduleOpen(true);
  };

  const submitSchedule = async () => {
    setScheduleError(null);
    if (!fResidentId) {
      setScheduleError('Resident is required.');
      return;
    }
    if (!fDescription.trim()) {
      setScheduleError('Plan description is required.');
      return;
    }
    if (!fServices.trim()) {
      setScheduleError('Services provided is required.');
      return;
    }
    if (!fTargetDate) {
      setScheduleError('Target date is required.');
      return;
    }
    if (!fConferenceDate) {
      setScheduleError('Case conference date is required.');
      return;
    }
    if (editingPlanId == null && fConferenceDate <= today) {
      setScheduleError('Case conference date must be a future date.');
      return;
    }

    const residentId = Number(fResidentId);
    if (!Number.isFinite(residentId) || residentId <= 0) {
      setScheduleError('Please select a valid resident.');
      return;
    }

    const targetValueNum = fTargetValue.trim() === '' ? 0 : Number(fTargetValue);
    if (!Number.isFinite(targetValueNum)) {
      setScheduleError('Target value must be a valid number.');
      return;
    }

    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const payload = {
        planId: editingPlanId ?? undefined,
        residentId,
        planCategory: fCategory,
        planDescription: fDescription.trim(),
        servicesProvided: fServices.trim(),
        targetValue: targetValueNum,
        targetDate: fTargetDate,
        status: fStatus,
        caseConferenceDate: fConferenceDate,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const createdRaw = await apiFetch<Record<string, unknown>>('/api/InterventionPlans/AddPlan', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const created = normalizeInterventionPlan(createdRaw);
      setPlans((prev) => [...prev, created]);
      setScheduleOpen(false);
    } catch (e) {
      setScheduleError(e instanceof Error ? e.message : 'Failed to schedule conference.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container-fluid py-4 px-3 px-md-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  if (role === 'staff') return <Navigate to="/staff" replace />;
  if (role !== 'manager') return <Navigate to="/login" replace />;

  if (safehouseId == null) {
    return (
      <div className="container-fluid py-4 px-3 px-md-4">
        <h1 className="h3 fw-bold mb-3">Case Conferences</h1>
        <div className="alert alert-warning">No safehouse is assigned to your account.</div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="h3 fw-bold mb-0">Case Conferences</h1>
        <button type="button" className="btn btn-primary btn-sm" onClick={openScheduleModal}>
          + Schedule Conference
        </button>
      </div>

      {error && <div className="alert alert-warning">{error}</div>}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      ) : (
        <>
          <section className="mb-4">
            <h2 className="h5 fw-semibold mb-3">Upcoming Case Conferences</h2>
            {upcomingByDate.length === 0 ? (
              <div className="border rounded p-3 bg-white">
                <p className="text-muted mb-0">No upcoming case conferences scheduled.</p>
              </div>
            ) : (
              <div className="vstack gap-3">
                {upcomingByDate.map(([date, datePlans]) => (
                  <div key={date} className="card shadow-sm">
                    <div className="card-header fw-semibold">{formatPrettyDate(date)}</div>
                    <ul className="list-group list-group-flush">
                      {datePlans.map((p) => {
                        const resident = residentById.get(p.residentId);
                        const desc = p.planDescription ?? '';
                        const t = truncateText(desc, 100);
                        const isExpanded = expandedUpcomingDescriptions.has(p.planId);
                        return (
                          <li
                            key={p.planId}
                            className="list-group-item"
                            role="button"
                            style={{ cursor: 'pointer' }}
                            onClick={() => toggleUpcomingDesc(p.planId)}
                          >
                            <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                              <span className="fw-semibold">{resident?.internalCode || `#${p.residentId}`}</span>
                              <span className="badge bg-secondary">{p.planCategory}</span>
                              <span className="text-muted small">
                                Worker: {resident?.assignedSocialWorker || '—'}
                              </span>
                              <span className={`badge ${statusBadgeClass(p.status)}`}>{p.status}</span>
                            </div>
                            <div className="small">
                              {isExpanded ? desc || '—' : t.short}
                            </div>
                            {isExpanded && (
                              <div className="small py-3 px-2 mt-2 border-top">
                                <div className="row g-2">
                                  <div className="col-md-6">
                                    <strong>Plan ID:</strong> {p.planId}
                                  </div>
                                  <div className="col-md-6">
                                    <strong>Resident ID:</strong> {p.residentId}
                                  </div>
                                  <div className="col-md-6">
                                    <strong>Conference Date:</strong> {toIsoDateOnly(p.caseConferenceDate) ?? '—'}
                                  </div>
                                  <div className="col-md-6">
                                    <strong>Target Date:</strong> {toIsoDateOnly(p.targetDate) ?? p.targetDate}
                                  </div>
                                  <div className="col-md-6">
                                    <strong>Target Value:</strong> {p.targetValue}
                                  </div>
                                  <div className="col-12">
                                    <strong>Services Provided:</strong> {p.servicesProvided || '—'}
                                  </div>
                                  <div className="col-md-6">
                                    <strong>Created At:</strong> {p.createdAt || '—'}
                                  </div>
                                  <div className="col-md-6">
                                    <strong>Updated At:</strong> {p.updatedAt || '—'}
                                  </div>
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="h5 fw-semibold mb-3">Conference History</h2>

            <div className="d-flex flex-wrap gap-2 align-items-end mb-3">
              <div>
                <label className="form-label small mb-0">Resident code</label>
                <input
                  className="form-control form-control-sm"
                  placeholder="Search internal code"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label small mb-0">From</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={historyFromDate}
                  onChange={(e) => setHistoryFromDate(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label small mb-0">To</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={historyToDate}
                  onChange={(e) => setHistoryToDate(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label small mb-0">Date sort</label>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm d-block"
                  onClick={() => setHistorySortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                >
                  {historySortDir === 'desc' ? 'Newest first' : 'Oldest first'}
                </button>
              </div>
            </div>

            <div className="table-responsive border rounded shadow-sm">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Resident Code</th>
                    <th>Conference Date</th>
                    <th>Plan Category</th>
                    <th>Assigned Worker</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyPageRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">
                        No conference history for the current filters.
                      </td>
                    </tr>
                  ) : (
                    historyPageRows.map((p) => {
                      const resident = residentById.get(p.residentId);
                      const confDate = toIsoDateOnly(p.caseConferenceDate) ?? '—';
                      const expanded = expandedHistoryRows.has(p.planId);
                      return (
                        <>
                          <tr
                            key={`row-${p.planId}`}
                            role="button"
                            style={{ cursor: 'pointer' }}
                            onClick={() => toggleHistoryRow(p.planId)}
                          >
                            <td>{resident?.internalCode || `#${p.residentId}`}</td>
                            <td>{confDate}</td>
                            <td>{p.planCategory}</td>
                            <td>{resident?.assignedSocialWorker || '—'}</td>
                            <td>
                              <span className={`badge ${statusBadgeClass(p.status)}`}>{p.status}</span>
                            </td>
                          </tr>
                          {expanded && (
                            <tr key={`detail-${p.planId}`} className="table-light">
                              <td colSpan={5}>
                                <div className="small py-3 px-2">
                                  <div className="row g-2">
                                    <div className="col-md-6">
                                      <strong>Plan ID:</strong> {p.planId}
                                    </div>
                                    <div className="col-md-6">
                                      <strong>Resident ID:</strong> {p.residentId}
                                    </div>
                                    <div className="col-md-6">
                                      <strong>Target Date:</strong>{' '}
                                      {toIsoDateOnly(p.targetDate) ?? p.targetDate}
                                    </div>
                                    <div className="col-md-6">
                                      <strong>Target Value:</strong> {p.targetValue}
                                    </div>
                                    <div className="col-12">
                                      <strong>Plan Description:</strong> {p.planDescription || '—'}
                                    </div>
                                    <div className="col-12">
                                      <strong>Services Provided:</strong> {p.servicesProvided || '—'}
                                    </div>
                                    <div className="col-md-6">
                                      <strong>Created At:</strong> {p.createdAt || '—'}
                                    </div>
                                    <div className="col-md-6">
                                      <strong>Updated At:</strong> {p.updatedAt || '—'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="text-muted small">
                {historyPlansFiltered.length} total · page {historyPageSafe} of {historyTotalPages}
              </span>
              <div className="btn-group">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={historyPageSafe <= 1}
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={historyPageSafe >= historyTotalPages}
                  onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </section>

          <section className="mt-4">
            <FormHistoryList basePath="/manager" canManage={false} />
          </section>
        </>
      )}

      {scheduleOpen && (
        <div className="modal d-block" tabIndex={-1} role="dialog" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingPlanId == null ? 'Schedule Conference' : 'Edit Conference'}
                </h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setScheduleOpen(false)} />
              </div>
              <div className="modal-body">
                {scheduleError && <div className="alert alert-warning py-2">{scheduleError}</div>}
                <div className="row g-2">
                  <div className="col-12">
                    <label className="form-label small mb-0">Resident search</label>
                    <input
                      className="form-control form-control-sm"
                      value={fResidentSearch}
                      onChange={(e) => setFResidentSearch(e.target.value)}
                      placeholder="Search by internal code"
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small mb-0">Resident *</label>
                    <select
                      className="form-select form-select-sm"
                      value={fResidentId}
                      onChange={(e) => setFResidentId(e.target.value)}
                    >
                      <option value="">Select resident</option>
                      {residentOptions.map((r) => (
                        <option key={r.residentId} value={r.residentId}>
                          {r.internalCode}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small mb-0">Plan Category *</label>
                    <select
                      className="form-select form-select-sm"
                      value={fCategory}
                      onChange={(e) => setFCategory(e.target.value as PlanCategory)}
                    >
                      {PLAN_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small mb-0">Status *</label>
                    <select
                      className="form-select form-select-sm"
                      value={fStatus}
                      onChange={(e) => setFStatus(e.target.value as NewPlanStatus)}
                    >
                      {NEW_PLAN_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small mb-0">Target Date *</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={fTargetDate}
                      onChange={(e) => setFTargetDate(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small mb-0">Case Conference Date *</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={fConferenceDate}
                      onChange={(e) => setFConferenceDate(e.target.value)}
                      min={today}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small mb-0">Services Provided *</label>
                    <input
                      className="form-control form-control-sm"
                      value={fServices}
                      onChange={(e) => setFServices(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small mb-0">Target Value (optional)</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={fTargetValue}
                      onChange={(e) => setFTargetValue(e.target.value)}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small mb-0">Plan Description *</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={3}
                      value={fDescription}
                      onChange={(e) => setFDescription(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setScheduleOpen(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => void submitSchedule()} disabled={saving}>
                  {saving ? 'Saving…' : editingPlanId == null ? 'Create' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
