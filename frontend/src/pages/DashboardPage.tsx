import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { apiFetch } from '../api/apiHelper';
import { useAuth } from '../context/AuthContext';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ─── Types (all backed by real DB tables) ────────────────────────────────────

interface Resident {
  residentId: number;
  internalCode: string;
  safehouseId: number;
  caseStatus: string;
  currentRiskLevel: string | null;
  assignedSocialWorker: string | null;
  reintegrationStatus: string | null;
  reintegrationType: string | null;
  sex: string;
  dateOfBirth: string;
  presentAge: string;
  lengthOfStay: string;
  dateOfAdmission: string;
  caseCategory: string;
  initialRiskLevel: string | null;
  referralSource: string | null;
  isPwd: boolean;
  hasSpecialNeeds: boolean;
  specialNeedsDiagnosis: string | null;
  subCatOrphaned: boolean;
  subCatTrafficked: boolean;
  subCatChildLabor: boolean;
  subCatPhysicalAbuse: boolean;
  subCatSexualAbuse: boolean;
  subCatOsaec: boolean;
  subCatCicl: boolean;
  subCatAtRisk: boolean;
  subCatStreetChild: boolean;
  subCatChildWithHiv: boolean;
}

interface ResidentPrediction {
  residentId: number;
  healthProb: number | null;
  educationProb: number | null;
  emotionalProb: number | null;
  overallScore: number | null;
  healthTag: string | null;
  predictedAt: string | null;
  modelVersion: string | null;
}

interface Donation {
  donationId: number;
  supporterId: number;
  donationType: string;
  donationDate: string;
  isRecurring: boolean;
  campaignName: string | null;
  channelSource: string;
  currencyCode: string | null;
  amount: number | null;
  estimatedValue: number;
  impactUnit: string;
  notes: string | null;
  referralPostId: number | null;
}

interface IncidentReport {
  incidentId: number;
  residentId: number;
  safehouseId: number;
  incidentDate: string;
  incidentType: string;
  severity: string;
  description: string;
  responseTaken: string;
  resolved: boolean;
  resolutionDate: string | null;
  reportedBy: string;
  followUpRequired: boolean;
}

interface DonationAllocation {
  allocationId: number;
  donationId: number;
  safehouseId: number;
  programArea: string;
  amountAllocated: number;
  allocationDate: string;
}

interface SafehouseComparisonRow {
  safehouseId: number;
  avgActiveResidents: number;
  avgEducationProgress: number;
  avgHealthScore: number;
  totalIncidents: number;
  totalProcessRecordings: number;
  totalHomeVisitations: number;
}

interface Safehouse {
  safehouseId: number;
  safehouseCode: string;
  name: string;
  region: string;
  city: string;
  province: string;
  country: string;
  openDate: string;
  status: string;
  capacityGirls: number;
  capacityStaff: number;
  currentOccupancy: number;
  notes: string | null;
}

/** User-facing label: prefer city over internal name or numeric id. */
function safehouseCityLabel(
  safehouses: Safehouse[],
  safehouseId: number
): string {
  const sh = safehouses.find((s) => s.safehouseId === safehouseId);
  if (!sh) return 'Unknown location';
  const city = sh.city?.trim();
  if (city) return city;
  const name = sh.name?.trim();
  if (name) return name;
  return 'Unknown location';
}

interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
}

interface DashboardData {
  residents: Resident[];
  predictions: ResidentPrediction[];
  donations: Donation[];
  donationAllocations: DonationAllocation[];
  incidents: IncidentReport[];
  safehouseComparison: SafehouseComparisonRow[];
  safehouses: Safehouse[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPeso(value: number): string {
  return (
    '₱' +
    value.toLocaleString('en-PH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function pct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return 'N/A';
  return `${Math.round(value * 100)}%`;
}

function getScopeParams(role: string | null, safehouseId: number | null): string {
  if (role === 'manager' && safehouseId) {
    return `&safehouseId=${safehouseId}`;
  }
  return '';
}

const RISK_COLORS: Record<string, string> = {
  Low: '#5C8A6B',
  Medium: '#E9C46A',
  High: '#C47A5A',
  Critical: '#C65B5B',
};

const RISK_ORDER = ['Low', 'Medium', 'High', 'Critical'];

// ─── Data Hook ───────────────────────────────────────────────────────────────

function useDashboardData(
  safehouseFilterIds: number[],
  role: string | null,
  safehouseId: number | null,
  workerCode: string | null,
) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const filterKey = safehouseFilterIds.join(',');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErrors([]);

    const scope = getScopeParams(role, safehouseId);
    const filterScope =
      safehouseFilterIds.length === 1
        ? `&safehouseId=${safehouseFilterIds[0]}`
        : scope;

    const results: Partial<DashboardData> = {};
    const errs: string[] = [];

    const calls: [string, (d: unknown) => void][] = [
      [
        `/api/Residents/AllResidents?pageSize=200&pageIndex=1${filterScope}`,
        (d) => {
          results.residents =
            (d as PaginatedResponse<Resident>).items ?? [];
        },
      ],
      [
        '/api/ml/predictions',
        (d) => {
          results.predictions = (d as ResidentPrediction[]) ?? [];
        },
      ],
      [
        `/api/Donations/AllDonations?pageSize=200&pageIndex=1${filterScope}`,
        (d) => {
          results.donations =
            (d as PaginatedResponse<Donation>).items ?? [];
        },
      ],
      [
        `/api/IncidentReports/AllIncidents?pageSize=200&pageIndex=1${filterScope}`,
        (d) => {
          results.incidents =
            (d as PaginatedResponse<IncidentReport>).items ?? [];
        },
      ],
      [
        '/api/DonationAllocations/All',
        (d) => {
          results.donationAllocations =
            (d as DonationAllocation[]) ?? [];
        },
      ],
      [
        '/api/Safehouses/AllSafehouses?pageSize=100&pageIndex=1',
        (d) => {
          results.safehouses =
            (d as PaginatedResponse<Safehouse>).items ?? [];
        },
      ],
      [
        '/api/Reports/SafehouseComparison',
        (d) => {
          results.safehouseComparison =
            (d as SafehouseComparisonRow[]) ?? [];
        },
      ],
    ];

    await Promise.all(
      calls.map(async ([endpoint, setter]) => {
        try {
          const d = await apiFetch<unknown>(endpoint);
          setter(d);
        } catch (err) {
          errs.push(
            `${endpoint.split('?')[0]}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      })
    );

    const finalData: DashboardData = {
      residents: results.residents ?? [],
      predictions: results.predictions ?? [],
      donations: results.donations ?? [],
      donationAllocations: results.donationAllocations ?? [],
      incidents: results.incidents ?? [],
      safehouseComparison: results.safehouseComparison ?? [],
      safehouses: results.safehouses ?? [],
    };

    if (safehouseFilterIds.length > 1) {
      const idSet = new Set(safehouseFilterIds);
      finalData.residents = finalData.residents.filter((r) =>
        idSet.has(r.safehouseId)
      );
      finalData.incidents = finalData.incidents.filter((inc) =>
        idSet.has(inc.safehouseId)
      );
      finalData.safehouseComparison = finalData.safehouseComparison.filter(
        (row) => idSet.has(row.safehouseId)
      );
    }

    if (safehouseFilterIds.length > 0) {
      // Predictions don't carry safehouseId — filter by resident membership
      const residentIds = new Set(
        finalData.residents.map((r) => r.residentId)
      );
      finalData.predictions = finalData.predictions.filter((p) =>
        residentIds.has(p.residentId)
      );

      // Donations are linked to safehouses via DonationAllocations
      const idSet = new Set(safehouseFilterIds);
      const donationIdsForSafehouses = new Set(
        finalData.donationAllocations
          .filter((a) => idSet.has(a.safehouseId))
          .map((a) => a.donationId)
      );
      finalData.donations = finalData.donations.filter((d) =>
        donationIdsForSafehouses.has(d.donationId)
      );
    }

    // Staff only sees residents assigned to them (matched by worker code)
    // TODO: backend does not yet accept ?workerCode on /api/Residents/AllResidents;
    // filtering is client-side for now. Pass workerCode once backend support is added.
    if (role === 'staff' && workerCode) {
      finalData.residents = finalData.residents.filter(
        (r) => r.assignedSocialWorker === workerCode
      );
      const staffResidentIds = new Set(
        finalData.residents.map((r) => r.residentId)
      );
      finalData.predictions = finalData.predictions.filter((p) =>
        staffResidentIds.has(p.residentId)
      );
      finalData.incidents = finalData.incidents.filter((inc) =>
        staffResidentIds.has(inc.residentId)
      );
    }

    setData(finalData);
    setErrors(errs);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, role, safehouseId, workerCode]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { data, loading, errors, refetch: fetchAll };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  warning,
  onClick,
}: {
  label: string;
  value: string | number;
  warning?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="col-6 col-md-4 col-xl-2 mb-3">
      <div
        className="card h-100 border-0 shadow-sm"
        style={{
          ...(warning ? { backgroundColor: '#fff5f5' } : {}),
          ...(onClick ? { cursor: 'pointer' } : {}),
        }}
        onClick={onClick}
      >
        <div className="card-body text-center py-3">
          <div
            className="fs-3 fw-bold text-nowrap"
            style={{ color: '#000' }}
          >
            {value}
          </div>
          <small className="text-muted" style={{ whiteSpace: 'pre-line' }}>{label}</small>
        </div>
      </div>
    </div>
  );
}

function DomainBar({ value }: { value: number | null }) {
  if (value == null)
    return <span className="badge bg-secondary">Insufficient Data</span>;

  const pctVal = Math.round(value * 100);
  const cls =
    pctVal >= 65 ? 'bg-success' : pctVal >= 40 ? 'bg-warning' : 'bg-danger';
  return (
    <div className="d-flex align-items-center gap-2">
      <div className="progress flex-grow-1" style={{ height: 10 }}>
        <div
          className={`progress-bar ${cls}`}
          style={{ width: `${pctVal}%` }}
        />
      </div>
      <small className="fw-bold text-nowrap" style={{ minWidth: 40 }}>
        {pctVal}%
      </small>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const cls =
    severity === 'High'
      ? 'bg-danger'
      : severity === 'Medium'
        ? 'bg-warning text-dark'
        : 'bg-success';
  return <span className={`badge ${cls} me-1`}>{severity}</span>;
}

type ProgressBand = 'improving' | 'uncertain' | 'attention' | 'insufficient';

function DistBadge({
  label,
  count,
  total,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  const pctVal = total > 0 ? Math.round((count / total) * 100) : 0;
  const tintByColor: Record<string, string> = {
    success: '92, 138, 107',
    warning: '233, 196, 106',
    danger: '198, 91, 91',
    secondary: '129, 140, 151',
  };
  const tintRgb = tintByColor[color] ?? '129, 140, 151';
  const bgAlpha = active ? 0.26 : 0.14;
  const borderAlpha = active ? 0.55 : 0.38;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
      className={`d-flex align-items-center gap-2 border rounded px-3 py-2 ${active ? 'border-2' : ''}`}
      style={{
        cursor: 'pointer',
        transition: 'all 0.15s',
        backgroundColor: `rgba(${tintRgb}, ${bgAlpha})`,
        borderColor: `rgba(${tintRgb}, ${borderAlpha})`,
      }}
    >
      <div>
        <div className="fw-bold">
          {count}{' '}
          <small className="fw-normal text-muted">({pctVal}%)</small>
        </div>
        <small>{label}</small>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const role: 'admin' | 'manager' | 'staff' | null = user?.roles.includes('Admin')
    ? 'admin'
    : user?.roles.includes('Manager')
      ? 'manager'
      : user?.roles.includes('SocialWorker')
        ? 'staff'
        : null;

  const safehouseId = user?.safehouseId ?? null;
  const workerCode = user?.socialWorkerCode ?? null;

  const [selectedSafehouses, setSelectedSafehouses] = useState<Set<number>>(
    new Set()
  );

  const safehouseFilterIds = useMemo(() => {
    if (role !== 'admin') {
      return safehouseId != null ? [safehouseId] : [];
    }
    return [...selectedSafehouses];
  }, [selectedSafehouses, role, safehouseId]);

  const { data, loading, errors } = useDashboardData(safehouseFilterIds, role, safehouseId, workerCode);
  const [progressBandFilter, setProgressBandFilter] =
    useState<ProgressBand | null>(null);

  const toggleBand = (band: ProgressBand) => {
    setProgressBandFilter((prev) => (prev === band ? null : band));
  };

  const [selectedResident, setSelectedResident] = useState<number | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<number | null>(null);
  const [selectedDonation, setSelectedDonation] = useState<number | null>(null);
  const [showIncidentSummary, setShowIncidentSummary] = useState(false);
  const [showDonationSummary, setShowDonationSummary] = useState(false);
  const [selectedSafehouse, setSelectedSafehouse] = useState<number | null>(null);
  const [showSafehouseList, setShowSafehouseList] = useState(false);
  const [showUnresolvedHigh, setShowUnresolvedHigh] = useState(false);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (selectedResident != null) setSelectedResident(null);
      else if (selectedIncident != null) setSelectedIncident(null);
      else if (selectedDonation != null) setSelectedDonation(null);
      else if (showIncidentSummary) setShowIncidentSummary(false);
      else if (showDonationSummary) setShowDonationSummary(false);
      else if (selectedRiskLevel != null) setSelectedRiskLevel(null);
      else if (showUnresolvedHigh) setShowUnresolvedHigh(false);
      else if (showSafehouseList) setShowSafehouseList(false);
      else if (selectedSafehouse != null) setSelectedSafehouse(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedResident, selectedIncident, selectedDonation, showIncidentSummary, showDonationSummary, selectedRiskLevel, showUnresolvedHigh, showSafehouseList, selectedSafehouse]);

  const toggleSafehouse = (id: number) => {
    setSelectedSafehouses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const derived = useMemo(() => {
    if (!data) return null;

    const activeResidents = data.residents.filter(
      (r) => r.caseStatus === 'Active'
    );

    // ML predictions (ResidentPredictions table — real)
    const validScores = data.predictions.filter(
      (p) => p.overallScore != null && Number.isFinite(p.overallScore)
    );
    const avgProgress =
      validScores.length > 0
        ? Math.round(
            (validScores.reduce((s, p) => s + (p.overallScore ?? 0), 0) /
              validScores.length) *
              100
          )
        : 0;

    const totalDonations = data.donations.reduce(
      (s, d) => s + (d.amount ?? d.estimatedValue ?? 0),
      0
    );

    const sixtyDaysAgoDon = new Date();
    sixtyDaysAgoDon.setDate(sixtyDaysAgoDon.getDate() - 60);
    const donations60 = [...data.donations]
      .filter((d) => new Date(d.donationDate).getTime() >= sixtyDaysAgoDon.getTime())
      .sort((a, b) => new Date(b.donationDate).getTime() - new Date(a.donationDate).getTime());
    const donations60Total = donations60.reduce(
      (s, d) => s + (d.amount ?? d.estimatedValue ?? 0),
      0
    );

    const unresolvedHighList = data.incidents
      .filter((inc) => inc.severity === 'High' && !inc.resolved)
      .sort((a, b) => new Date(b.incidentDate).getTime() - new Date(a.incidentDate).getTime())
      .map((inc) => {
        const resident = data.residents.find((r) => r.residentId === inc.residentId);
        return { ...inc, internalCode: resident?.internalCode ?? `#${inc.residentId}` };
      });
    const unresolvedHighSeverity = unresolvedHighList.length;

    // Attach resident codes to predictions for display
    const residents = data.residents;
    function withCode(p: ResidentPrediction) {
      const resident = residents.find(
        (r) => r.residentId === p.residentId
      );
      return {
        ...p,
        internalCode: resident?.internalCode ?? `#${p.residentId}`,
      };
    }

    // Residents with at least one null domain score (insufficient session data)
    const insufficientDataList = data.predictions
      .filter(
        (p) =>
          p.healthProb == null ||
          p.educationProb == null ||
          p.emotionalProb == null
      )
      .sort((a, b) => (a.overallScore ?? 0) - (b.overallScore ?? 0))
      .map(withCode);

    // Progress distribution bands (only residents with all three domain scores)
    const improvingList = validScores
      .filter((p) => (p.overallScore ?? 0) > 0.65)
      .sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0))
      .map(withCode);
    const uncertainList = validScores
      .filter(
        (p) => (p.overallScore ?? 0) >= 0.4 && (p.overallScore ?? 0) <= 0.65
      )
      .sort((a, b) => (a.overallScore ?? 0) - (b.overallScore ?? 0))
      .map(withCode);
    const needsAttentionList = validScores
      .filter((p) => (p.overallScore ?? 0) < 0.4)
      .sort((a, b) => (a.overallScore ?? 0) - (b.overallScore ?? 0))
      .map(withCode);

    // Default: top 5 most improving by overallScore (highest first)
    const top5 = [...data.predictions]
      .filter((p) => p.overallScore != null)
      .sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0))
      .slice(0, 5)
      .map(withCode);

    // Risk level donut (from Residents.currentRiskLevel — real)
    const riskCounts: Record<string, number> = {};
    for (const r of activeResidents) {
      const lvl = r.currentRiskLevel ?? 'Unknown';
      riskCounts[lvl] = (riskCounts[lvl] ?? 0) + 1;
    }
    const riskDonut = RISK_ORDER.filter((k) => riskCounts[k]).map((k) => ({
      name: k,
      value: riskCounts[k],
    }));

    // Safehouse comparison chart — compute avg domain scores from predictions
    const predsBySafehouse: Record<number, ResidentPrediction[]> = {};
    for (const p of data.predictions) {
      const resident = data.residents.find((r) => r.residentId === p.residentId);
      if (!resident) continue;
      const shId = resident.safehouseId;
      if (!predsBySafehouse[shId]) predsBySafehouse[shId] = [];
      predsBySafehouse[shId].push(p);
    }

    const residentSafehouseIds = new Set(data.residents.map((r) => r.safehouseId));
    const safehouseChart = data.safehouses
      .filter((s) => s.status === 'Active' && residentSafehouseIds.has(s.safehouseId))
      .map((sh) => {
        const preds = predsBySafehouse[sh.safehouseId] ?? [];
        const avg = (getter: (p: ResidentPrediction) => number | null) => {
          const vals = preds.map(getter).filter((v): v is number => v != null && Number.isFinite(v));
          return vals.length > 0 ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) : 0;
        };
        return {
          safehouseId: sh.safehouseId,
          name: sh.city?.trim() || sh.name?.trim() || 'Unknown location',
          Health: avg((p) => p.healthProb),
          Education: avg((p) => p.educationProb),
          Emotional: avg((p) => p.emotionalProb),
          Overall: avg((p) => p.overallScore),
          residentCount: preds.length,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    // Incidents in last 60 days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const incidents60 = data.incidents.filter(
      (inc) => new Date(inc.incidentDate).getTime() >= sixtyDaysAgo.getTime()
    );
    const incidentTypeCounts: { type: string; count: number }[] = [];
    const typeMap: Record<string, number> = {};
    for (const inc of incidents60) {
      typeMap[inc.incidentType] = (typeMap[inc.incidentType] ?? 0) + 1;
    }
    for (const [type, count] of Object.entries(typeMap)) {
      incidentTypeCounts.push({ type, count });
    }
    incidentTypeCounts.sort((a, b) => b.count - a.count);

    // Recent incidents (top 5 by date — from IncidentReports table — real)
    const recentIncidents = [...data.incidents]
      .sort(
        (a, b) =>
          new Date(b.incidentDate).getTime() -
          new Date(a.incidentDate).getTime()
      )
      .slice(0, 5)
      .map((inc) => {
        const resident = data.residents.find(
          (r) => r.residentId === inc.residentId
        );
        return {
          ...inc,
          internalCode: resident?.internalCode ?? `#${inc.residentId}`,
        };
      });

    // Recent donations (top 3 — from Donations table — real)
    const recentDonations = [...data.donations]
      .sort(
        (a, b) =>
          new Date(b.donationDate).getTime() -
          new Date(a.donationDate).getTime()
      )
      .slice(0, 3);

    return {
      activeResidents,
      avgProgress,
      totalDonations,
      donations60,
      donations60Total,
      unresolvedHighSeverity,
      unresolvedHighList,
      improvingList,
      uncertainList,
      needsAttentionList,
      insufficientDataList,
      top5,
      riskDonut,
      safehouseChart,
      recentIncidents,
      recentDonations,
      incidents60Count: incidents60.length,
      incidentTypeCounts,
      totalIncidents: data.incidents.length,
      totalPredictions: data.predictions.length,
      validScoresTotal: validScores.length,
    };
  }, [data]);

  // ─── Auth guards ──────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center"
           style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || role === null) {
    return <Navigate to="/login" replace />;
  }

  // ─── Loading / Error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="container py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" role="status" />
          <p className="text-muted">Loading dashboard data…</p>
        </div>
      </div>
    );
  }

  if (!data || !derived) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">
          Failed to load dashboard data.
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 px-3 px-md-4 dashboard-theme">
      {/* Error banner */}
      {errors.length > 0 && (
        <div className="alert alert-warning alert-dismissible mb-3">
          <strong>Some data could not be loaded:</strong>
          <ul className="mb-0 mt-1">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Role Context Header ────────────────────────────────────────── */}
      <div className="mb-4">
        <h4 className="mb-1 fw-bold">
          Welcome back, {user?.displayName ?? user?.userName ?? user?.email ?? 'User'}!
        </h4>
        <p className="text-muted mb-0">
          {role === 'admin' &&
            (selectedSafehouses.size > 0
              ? `${selectedSafehouses.size} Safehouse${selectedSafehouses.size > 1 ? 's' : ''} Selected — Filtered View`
              : 'All Safehouses — Aggregated View')}
          {role === 'manager' &&
            (safehouseId != null
              ? `${safehouseCityLabel(data.safehouses, safehouseId)} — Your Safehouse`
              : 'Your Safehouse')}
          {role === 'staff' &&
            `Your Caseload — Worker ${workerCode}`}
        </p>
      </div>

      <div className="d-flex gap-4 align-items-start">
      {/* ── Main content column ──────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>

      {/* ── Section 1: Stat Cards ──────────────────────────────────────── */}
      <div className="row justify-content-center">
        <StatCard
          label={role === 'staff' ? 'Assigned Residents' : 'Active Residents'}
          value={derived.activeResidents.length}
        />
        <StatCard
          label="Avg Progress Score"
          value={`${derived.avgProgress}%`}
        />
        {role !== 'staff' && (
          <StatCard
            label="Total Donations"
            value={formatPeso(derived.totalDonations)}
            onClick={() => setShowDonationSummary(true)}
          />
        )}
        {role !== 'staff' && (
          <StatCard
            label={"Incidents\n(Last 60 Days)"}
            value={derived.incidents60Count}
            onClick={() => setShowIncidentSummary(true)}
          />
        )}
        {role !== 'staff' && (
          <StatCard
            label="Unresolved High Severity"
            value={derived.unresolvedHighSeverity}
            warning={derived.unresolvedHighSeverity > 0}
            onClick={() => setShowUnresolvedHigh(true)}
          />
        )}
        <StatCard
          label="Total Safehouses"
          value={data.safehouses.filter((s) => s.status === 'Active').length}
          onClick={() => setShowSafehouseList(true)}
        />
      </div>

      {/* ── Section 2: ML Insights Panel ───────────────────────────────── */}
      <div
        className="card mb-4 shadow-sm border-0"
        style={{ backgroundColor: '#fcf9f4' }}
      >
        <div className="card-body">
          <h5
            className="card-title fw-bold mb-3"
            style={{ color: 'var(--primary-dark)' }}
          >
            60 Day Improvement Forecast
          </h5>

          {/* Distribution bands — click to filter */}
          <div className="d-flex flex-wrap gap-3 mb-4">
            <DistBadge
              label="Likely Improving"
              count={derived.improvingList.length}
              total={derived.totalPredictions}
              color="success"
              active={progressBandFilter === 'improving'}
              onClick={() => toggleBand('improving')}
            />
            <DistBadge
              label="Uncertain"
              count={derived.uncertainList.length}
              total={derived.totalPredictions}
              color="warning"
              active={progressBandFilter === 'uncertain'}
              onClick={() => toggleBand('uncertain')}
            />
            <DistBadge
              label="Needs Attention"
              count={derived.needsAttentionList.length}
              total={derived.totalPredictions}
              color="danger"
              active={progressBandFilter === 'attention'}
              onClick={() => toggleBand('attention')}
            />
            <DistBadge
              label="Insufficient Data"
              count={derived.insufficientDataList.length}
              total={derived.totalPredictions}
              color="secondary"
              active={progressBandFilter === 'insufficient'}
              onClick={() => toggleBand('insufficient')}
            />
          </div>

          {/* Resident list — filtered by band or default bottom 5 */}
          {(() => {
            const bandLabel =
              progressBandFilter === 'improving'
                ? 'Likely Improving'
                : progressBandFilter === 'uncertain'
                  ? 'Uncertain'
                  : progressBandFilter === 'attention'
                    ? 'Needs Attention'
                    : progressBandFilter === 'insufficient'
                      ? 'Insufficient Data'
                      : null;

            const displayList =
              progressBandFilter === 'improving'
                ? derived.improvingList
                : progressBandFilter === 'uncertain'
                  ? derived.uncertainList
                  : progressBandFilter === 'attention'
                    ? derived.needsAttentionList
                    : progressBandFilter === 'insufficient'
                      ? derived.insufficientDataList
                      : derived.top5;

            const heading = bandLabel
              ? `${bandLabel} — ${displayList.length} Resident${displayList.length !== 1 ? 's' : ''}`
              : 'Top 5 Most Improving:';

            return (
              <>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="fw-bold mb-0">{heading}</h6>
                  {progressBandFilter && (
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setProgressBandFilter(null)}
                    >
                      Clear filter
                    </button>
                  )}
                </div>
                {displayList.length === 0 ? (
                  <p className="text-muted">
                    {bandLabel
                      ? `No residents in the "${bandLabel}" band.`
                      : 'No prediction data available.'}
                  </p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Resident</th>
                          <th>Health</th>
                          <th>Education</th>
                          <th>Emotional</th>
                          <th className="text-end">Overall Improvement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayList.map((r) => {
                          const missingDomains: string[] = [];
                          if (r.healthProb == null) missingDomains.push('Health');
                          if (r.educationProb == null) missingDomains.push('Education');
                          if (r.emotionalProb == null) missingDomains.push('Emotional');
                          return (
                            <React.Fragment key={r.residentId}>
                              <tr
                                style={{ cursor: 'pointer' }}
                                className="table-hover-row"
                                onClick={() => setSelectedResident(r.residentId)}
                                title="Click for details"
                              >
                                <td className="fw-semibold">{r.internalCode}</td>
                                <td>
                                  <DomainBar value={r.healthProb} />
                                </td>
                                <td>
                                  <DomainBar value={r.educationProb} />
                                </td>
                                <td>
                                  <DomainBar value={r.emotionalProb} />
                                </td>
                                <td className="fw-bold text-end">{pct(r.overallScore)}</td>
                              </tr>
                              {progressBandFilter === 'insufficient' && missingDomains.length > 0 && (
                                <tr>
                                  <td colSpan={5} className="border-0 pt-0 pb-2">
                                    <small className="text-muted fst-italic">
                                      Note: Missing {missingDomains.join(', ')} score{missingDomains.length > 1 ? 's' : ''} — fewer than 3 counseling sessions recorded in {missingDomains.length === 1 ? 'this domain' : 'these domains'}
                                    </small>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* ── Reusable section blocks (order depends on role) ────────────── */}
      {(() => {
        const riskDistribution = (
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h6 className="card-title fw-bold">Risk Level Distribution</h6>
                {derived.riskDonut.length === 0 ? (
                  <p className="text-muted">
                    No active residents with risk data.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={420}>
                    <PieChart>
                      <Pie
                        data={derived.riskDonut}
                        cx="50%"
                        cy="48%"
                        innerRadius={70}
                        outerRadius={120}
                        dataKey="value"
                        paddingAngle={2}
                        label={// eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (props: any) => {
                          const { name: _name, value: _value, cx: _cx, cy: _cy, midAngle, outerRadius: _or } = props;
                          const name = String(_name ?? '');
                          const value = Number(_value ?? 0);
                          const cx = Number(_cx ?? 0);
                          const cy = Number(_cy ?? 0);
                          const or = Number(_or ?? 120);
                          const angle = Number(midAngle ?? 0);
                          const RADIAN = Math.PI / 180;
                          const radius = or + 30;
                          const x = cx + radius * Math.cos(-angle * RADIAN);
                          const y = cy + radius * Math.sin(-angle * RADIAN);
                          const isRight = x > cx;
                          const color = RISK_COLORS[name] ?? '#6c757d';
                          const labelText = `${name}: ${value}`;
                          const textW = labelText.length * 7.5 + 12;
                          const rectX = isRight ? x - 6 : x - textW + 6;
                          return (
                            <g>
                              <rect
                                x={rectX}
                                y={y - 12}
                                width={textW}
                                height={24}
                                rx={6}
                                fill={color}
                                fillOpacity={0.12}
                              />
                              <text
                                x={x}
                                y={y}
                                textAnchor={isRight ? 'start' : 'end'}
                                dominantBaseline="central"
                                fontSize={13}
                                fontWeight={600}
                                fill="#000"
                              >
                                {labelText}
                              </text>
                            </g>
                          );
                        }}
                        labelLine={{ strokeWidth: 1 }}
                      >
                        {derived.riskDonut.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={RISK_COLORS[entry.name] ?? '#6c757d'}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedRiskLevel(entry.name)}
                          />
                        ))}
                      </Pie>
                      <Legend
                        formatter={(value) => (
                          <span style={{ color: '#000' }}>{String(value)}</span>
                        )}
                      />
                      <text
                        x="50%"
                        y="46%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fw-bold"
                        fontSize={30}
                      >
                        {derived.activeResidents.length}
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        );

        const recentIncidents = (
          <div className="col-12 col-lg-6 mt-3 mt-lg-0">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h6 className="card-title fw-bold">Recent Incidents</h6>
                {derived.recentIncidents.length === 0 ? (
                  <p className="text-muted mb-0">No incidents recorded.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Type</th>
                          <th>Urgency</th>
                          <th>Case Number</th>
                          <th>Date</th>
                          <th>Resolved</th>
                        </tr>
                      </thead>
                      <tbody>
                        {derived.recentIncidents.map((inc) => (
                          <tr
                            key={inc.incidentId}
                            className={inc.resolved ? 'text-muted' : ''}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedIncident(inc.incidentId)}
                          >
                            <td className="fw-semibold">{inc.incidentType}</td>
                            <td><SeverityBadge severity={inc.severity} /></td>
                            <td>{inc.internalCode}</td>
                            <td>{formatDate(inc.incidentDate)}</td>
                            <td>
                              {inc.resolved ? (
                                <span className="badge bg-secondary">Resolved</span>
                              ) : (
                                <span className="text-muted">No</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

        const performanceTitle =
          role === 'staff'
            ? 'Performance of Assigned Residents'
            : role === 'manager'
              ? 'Safehouse Performance'
              : 'Safehouse Performance Comparison';

        const safehousePerformance = (
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-body">
                <h6 className="card-title fw-bold">{performanceTitle}</h6>
                <small className="text-muted d-block mb-2">
                  Click a bar group to view safehouse details
                </small>
                {derived.safehouseChart.length === 0 ? (
                  <p className="text-muted">No safehouse comparison data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={derived.safehouseChart}
                      style={{ cursor: 'pointer' }}
                    >
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} label={{ value: 'Score (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6c757d' } }} />
                      <Tooltip
                        formatter={(value: unknown, name: unknown) => [`${value}%`, String(name)]}
                        itemStyle={{ color: '#000' }}
                        labelStyle={{ color: '#000' }}
                      />
                      <Legend
                        formatter={(value) => (
                          <span style={{ color: '#000' }}>{String(value)}</span>
                        )}
                      />
                      <Bar dataKey="Health" fill="#5C8A6B" onClick={(d: unknown) => setSelectedSafehouse((d as { safehouseId: number }).safehouseId)} />
                      <Bar dataKey="Education" fill="#4A6FA5" onClick={(d: unknown) => setSelectedSafehouse((d as { safehouseId: number }).safehouseId)} />
                      <Bar dataKey="Emotional" fill="#E9C46A" onClick={(d: unknown) => setSelectedSafehouse((d as { safehouseId: number }).safehouseId)} />
                      <Bar dataKey="Overall" fill="#C47A5A" onClick={(d: unknown) => setSelectedSafehouse((d as { safehouseId: number }).safehouseId)} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        );

        if (role === 'admin') {
          return (
            <>
              {/* Admin: Risk + Incidents side-by-side, then Performance full-width */}
              <div className="row mb-4">
                {riskDistribution}
                {recentIncidents}
              </div>
              <div className="row mb-4">{safehousePerformance}</div>
            </>
          );
        }
        return (
          <>
            {/* Manager / Staff: Risk + Performance side-by-side, then Incidents full-width */}
            <div className="row mb-4">
              {riskDistribution}
              <div className="col-12 col-lg-6 mt-3 mt-lg-0">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <h6 className="card-title fw-bold">{performanceTitle}</h6>
                    <small className="text-muted d-block mb-2">
                      Click a bar group to view details
                    </small>
                    {derived.safehouseChart.length === 0 ? (
                      <p className="text-muted">No comparison data.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={340}>
                        <BarChart
                          data={derived.safehouseChart}
                          style={{ cursor: 'pointer' }}
                        >
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 100]} label={{ value: 'Score (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6c757d' } }} />
                          <Tooltip
                            formatter={(value: unknown, name: unknown) => [`${value}%`, String(name)]}
                            itemStyle={{ color: '#000' }}
                            labelStyle={{ color: '#000' }}
                          />
                          <Legend
                            formatter={(value) => (
                              <span style={{ color: '#000' }}>{String(value)}</span>
                            )}
                          />
                          <Bar dataKey="Health" fill="#5C8A6B" onClick={(d: unknown) => setSelectedSafehouse((d as { safehouseId: number }).safehouseId)} />
                          <Bar dataKey="Education" fill="#4A6FA5" onClick={(d: unknown) => setSelectedSafehouse((d as { safehouseId: number }).safehouseId)} />
                          <Bar dataKey="Emotional" fill="#E9C46A" onClick={(d: unknown) => setSelectedSafehouse((d as { safehouseId: number }).safehouseId)} />
                          <Bar dataKey="Overall" fill="#C47A5A" onClick={(d: unknown) => setSelectedSafehouse((d as { safehouseId: number }).safehouseId)} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="row mb-4">
              <div className="col-12">
                <div className="card shadow-sm">
                  <div className="card-body">
                    <h6 className="card-title fw-bold">
                      {role === 'staff' ? "Havyn's Recent Incidents" : 'Recent Incidents'}
                    </h6>
                    {derived.recentIncidents.length === 0 ? (
                      <p className="text-muted mb-0">No incidents recorded.</p>
                    ) : (
                      <div className="list-group list-group-flush">
                        {derived.recentIncidents.map((inc) => (
                          <div
                            key={inc.incidentId}
                            className={`list-group-item px-0 ${inc.resolved ? 'text-muted' : ''}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedIncident(inc.incidentId)}
                          >
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <span className="fw-semibold me-2">
                                  {inc.incidentType}
                                </span>
                                <SeverityBadge severity={inc.severity} />
                                <small className="text-muted">
                                  — {inc.internalCode}
                                </small>
                              </div>
                              <div className="text-end">
                                <small className="text-muted">
                                  {formatDate(inc.incidentDate)}
                                </small>
                                {inc.resolved && (
                                  <span className="badge bg-secondary ms-2">
                                    Resolved
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── Section 5: Recent Donations (full width, hidden for staff) ── */}
      {role !== 'staff' && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-body">
                <h6 className="card-title fw-bold">Recent Donations</h6>
                {derived.recentDonations.length === 0 ? (
                  <p className="text-muted mb-0">No donations recorded.</p>
                ) : (
                  <div className="list-group list-group-flush">
                    {derived.recentDonations.map((don) => (
                      <div
                        key={don.donationId}
                        className="list-group-item d-flex justify-content-between align-items-center px-0"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedDonation(don.donationId)}
                      >
                        <div>
                          <span className="fw-semibold">
                            Supporter #{don.supporterId}
                          </span>
                          <span
                            className="badge ms-2"
                            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                          >
                            {don.donationType}
                          </span>
                        </div>
                        <div className="text-end">
                          <div className="fw-bold">
                            {formatPeso(don.amount ?? don.estimatedValue)}
                          </div>
                          <small className="text-muted">
                            {formatDate(don.donationDate)}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      </div>{/* end main content column */}

      {/* ── Safehouse Filter Sidebar (admin only) ────────────────────── */}
      {role === 'admin' && (
        <div
          style={{ width: 220, flexShrink: 0, alignSelf: 'flex-start' }}
          className="d-none d-lg-block"
        >
          <div className="card shadow-sm dashboard-filter-sticky">
            <div className="card-body py-3 px-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <small className="fw-bold">Filter Safehouses</small>
                {selectedSafehouses.size > 0 && (
                  <button
                    className="btn btn-link btn-sm p-0 text-danger"
                    onClick={() => setSelectedSafehouses(new Set())}
                  >
                    Clear
                  </button>
                )}
              </div>
              {data.safehouses
                .filter((s) => s.status === 'Active')
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((s) => (
                  <div className="form-check mb-1" key={s.safehouseId}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`sh-${s.safehouseId}`}
                      checked={selectedSafehouses.has(s.safehouseId)}
                      onChange={() => toggleSafehouse(s.safehouseId)}
                    />
                    <label
                      className="form-check-label small"
                      htmlFor={`sh-${s.safehouseId}`}
                    >
                      {s.city?.trim() || s.name}
                    </label>
                  </div>
                ))}
              {selectedSafehouses.size > 0 && (
                <div className="mt-2 pt-2 border-top">
                  <small className="text-muted">
                    {selectedSafehouses.size} selected
                  </small>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>{/* end d-flex row */}

      {/* ── Resident Detail Modal ─────────────────────────────────────── */}
      {selectedResident != null && (() => {
        const resident = data.residents.find(
          (r) => r.residentId === selectedResident
        );
        const prediction = data.predictions.find(
          (p) => p.residentId === selectedResident
        );
        const safehouse = resident
          ? data.safehouses.find((s) => s.safehouseId === resident.safehouseId)
          : null;
        if (!resident) return null;

        const subCategories = [
          resident.subCatOrphaned && 'Orphaned',
          resident.subCatTrafficked && 'Trafficked',
          resident.subCatChildLabor && 'Child Labor',
          resident.subCatPhysicalAbuse && 'Physical Abuse',
          resident.subCatSexualAbuse && 'Sexual Abuse',
          resident.subCatOsaec && 'OSAEC',
          resident.subCatCicl && 'CICL',
          resident.subCatAtRisk && 'At Risk',
          resident.subCatStreetChild && 'Street Child',
          resident.subCatChildWithHiv && 'Child with HIV',
        ].filter(Boolean) as string[];

        const riskColor: Record<string, string> = {
          High: 'danger',
          Medium: 'warning',
          Low: 'success',
        };

        return (
          <div
            className="modal d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedResident(null);
            }}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header border-bottom-0 pb-0">
                  <div>
                    <h5 className="modal-title fw-bold mb-0">
                      {resident.internalCode}
                    </h5>
                    <small className="text-muted">
                      Resident #{resident.residentId}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setSelectedResident(null)}
                  />
                </div>

                <div className="modal-body pt-3">
                  <div className="row g-3">
                    {/* Left column — Demographics & Case Info */}
                    <div className="col-md-6">
                      <h6 className="fw-bold text-muted text-uppercase small mb-2">
                        Demographics
                      </h6>
                      <table className="table table-sm table-borderless mb-3">
                        <tbody>
                          <tr>
                            <td className="text-muted" style={{ width: '40%' }}>Age</td>
                            <td className="fw-semibold">{resident.presentAge}</td>
                          </tr>
                          <tr>
                            <td className="text-muted">Sex</td>
                            <td className="fw-semibold">{resident.sex}</td>
                          </tr>
                          <tr>
                            <td className="text-muted">Date of Birth</td>
                            <td className="fw-semibold">{formatDate(resident.dateOfBirth)}</td>
                          </tr>
                          {resident.isPwd && (
                            <tr>
                              <td className="text-muted">PWD</td>
                              <td><span className="badge bg-info text-dark">Yes</span></td>
                            </tr>
                          )}
                          {resident.hasSpecialNeeds && (
                            <tr>
                              <td className="text-muted">Special Needs</td>
                              <td className="fw-semibold">{resident.specialNeedsDiagnosis ?? 'Yes'}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                      <h6 className="fw-bold text-muted text-uppercase small mb-2">
                        Case Information
                      </h6>
                      <table className="table table-sm table-borderless mb-3">
                        <tbody>
                          <tr>
                            <td className="text-muted" style={{ width: '40%' }}>Status</td>
                            <td>
                              <span className={`badge bg-${resident.caseStatus === 'Active' ? 'success' : 'secondary'}`}>
                                {resident.caseStatus}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="text-muted">Category</td>
                            <td className="fw-semibold">{resident.caseCategory}</td>
                          </tr>
                          {subCategories.length > 0 && (
                            <tr>
                              <td className="text-muted">Flags</td>
                              <td>
                                <div className="d-flex flex-wrap gap-1">
                                  {subCategories.map((sc) => (
                                    <span key={sc} className="badge bg-warning text-dark">
                                      {sc}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                          <tr>
                            <td className="text-muted">Admitted</td>
                            <td className="fw-semibold">{formatDate(resident.dateOfAdmission)}</td>
                          </tr>
                          <tr>
                            <td className="text-muted">Length of Stay</td>
                            <td className="fw-semibold">{resident.lengthOfStay}</td>
                          </tr>
                          {resident.referralSource && (
                            <tr>
                              <td className="text-muted">Referral</td>
                              <td className="fw-semibold">{resident.referralSource}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Right column — Safehouse, Risk, ML scores */}
                    <div className="col-md-6">
                      <h6 className="fw-bold text-muted text-uppercase small mb-2">
                        Safehouse & Placement
                      </h6>
                      <table className="table table-sm table-borderless mb-3">
                        <tbody>
                          <tr>
                            <td className="text-muted" style={{ width: '40%' }}>Safehouse</td>
                            <td className="fw-semibold">
                              {safehouse
                                ? `${safehouse.city?.trim() || safehouse.name}${safehouse.region ? `, ${safehouse.region}` : ''}`
                                : safehouseCityLabel(data.safehouses, resident.safehouseId)}
                            </td>
                          </tr>
                          {resident.assignedSocialWorker && (
                            <tr>
                              <td className="text-muted">Social Worker</td>
                              <td className="fw-semibold">{resident.assignedSocialWorker}</td>
                            </tr>
                          )}
                          {resident.reintegrationType && (
                            <tr>
                              <td className="text-muted">Reintegration</td>
                              <td className="fw-semibold">{resident.reintegrationType}</td>
                            </tr>
                          )}
                          {resident.reintegrationStatus && (
                            <tr>
                              <td className="text-muted">Reint. Status</td>
                              <td className="fw-semibold">{resident.reintegrationStatus}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                      <h6 className="fw-bold text-muted text-uppercase small mb-2">
                        Risk Assessment
                      </h6>
                      <table className="table table-sm table-borderless mb-3">
                        <tbody>
                          {resident.initialRiskLevel && (
                            <tr>
                              <td className="text-muted" style={{ width: '40%' }}>Initial Risk</td>
                              <td>
                                <span className={`badge bg-${riskColor[resident.initialRiskLevel] ?? 'secondary'}`}>
                                  {resident.initialRiskLevel}
                                </span>
                              </td>
                            </tr>
                          )}
                          <tr>
                            <td className="text-muted">Current Risk</td>
                            <td>
                              <span className={`badge bg-${riskColor[resident.currentRiskLevel ?? ''] ?? 'secondary'}`}>
                                {resident.currentRiskLevel ?? 'Unknown'}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {prediction && (
                        <>
                          <h6 className="fw-bold text-muted text-uppercase small mb-2">
                            ML Improvement Scores
                          </h6>
                          <div className="mb-2">
                            <div className="d-flex justify-content-between small mb-1">
                              <span>Health</span>
                              <span className="fw-bold">{pct(prediction.healthProb)}</span>
                            </div>
                            <DomainBar value={prediction.healthProb} />
                          </div>
                          <div className="mb-2">
                            <div className="d-flex justify-content-between small mb-1">
                              <span>Education</span>
                              <span className="fw-bold">{pct(prediction.educationProb)}</span>
                            </div>
                            <DomainBar value={prediction.educationProb} />
                          </div>
                          <div className="mb-2">
                            <div className="d-flex justify-content-between small mb-1">
                              <span>Emotional</span>
                              <span className="fw-bold">{pct(prediction.emotionalProb)}</span>
                            </div>
                            <DomainBar value={prediction.emotionalProb} />
                          </div>
                          <div className="mt-3 p-2 rounded" style={{ backgroundColor: '#f0fdf4' }}>
                            <div className="d-flex justify-content-between">
                              <span className="fw-bold">Overall Improvement</span>
                              <span className="fw-bold fs-5">{pct(prediction.overallScore)}</span>
                            </div>
                          </div>
                          {prediction.predictedAt && (
                            <small className="text-muted d-block mt-1">
                              Predicted: {formatDate(prediction.predictedAt)}
                            </small>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Incident Detail Modal ─────────────────────────────────────── */}
      {selectedIncident != null && (() => {
        const inc = data.incidents.find(
          (i) => i.incidentId === selectedIncident
        );
        if (!inc) return null;
        const resident = data.residents.find(
          (r) => r.residentId === inc.residentId
        );
        const safehouse = data.safehouses.find(
          (s) => s.safehouseId === inc.safehouseId
        );
        const sevColor: Record<string, string> = {
          High: 'danger',
          Medium: 'warning',
          Low: 'success',
        };
        return (
          <div
            className="modal d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedIncident(null);
            }}
          >
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title fw-bold mb-0">
                      Incident #{inc.incidentId}
                    </h5>
                    <small className="text-muted">{inc.incidentType}</small>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setSelectedIncident(null)}
                  />
                </div>
                <div className="modal-body">
                  <table className="table table-sm table-borderless mb-3">
                    <tbody>
                      <tr>
                        <td className="text-muted" style={{ width: '35%' }}>Severity</td>
                        <td>
                          <span className={`badge bg-${sevColor[inc.severity] ?? 'secondary'}`}>
                            {inc.severity}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">Date</td>
                        <td className="fw-semibold">{formatDate(inc.incidentDate)}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">Resident</td>
                        <td className="fw-semibold">
                          {resident?.internalCode ?? `#${inc.residentId}`}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">Safehouse</td>
                        <td className="fw-semibold">
                          {safehouse
                            ? `${safehouse.city?.trim() || safehouse.name}${safehouse.region ? `, ${safehouse.region}` : ''}`
                            : safehouseCityLabel(data.safehouses, inc.safehouseId)}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">Reported By</td>
                        <td className="fw-semibold">{inc.reportedBy}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">Status</td>
                        <td>
                          {inc.resolved ? (
                            <span className="badge bg-secondary">Resolved</span>
                          ) : (
                            <span className="badge bg-danger">Unresolved</span>
                          )}
                          {inc.followUpRequired && (
                            <span className="badge bg-warning text-dark ms-2">Follow-up Required</span>
                          )}
                        </td>
                      </tr>
                      {inc.resolutionDate && (
                        <tr>
                          <td className="text-muted">Resolved On</td>
                          <td className="fw-semibold">{formatDate(inc.resolutionDate)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <h6 className="fw-bold text-muted text-uppercase small mb-2">Description</h6>
                  <p className="mb-3" style={{ whiteSpace: 'pre-wrap' }}>{inc.description}</p>

                  <h6 className="fw-bold text-muted text-uppercase small mb-2">Response Taken</h6>
                  <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{inc.responseTaken}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Donation Detail Modal ─────────────────────────────────────── */}
      {selectedDonation != null && (() => {
        const don = data.donations.find(
          (d) => d.donationId === selectedDonation
        );
        if (!don) return null;
        const allocations = data.donationAllocations.filter(
          (a) => a.donationId === don.donationId
        );
        return (
          <div
            className="modal d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedDonation(null);
            }}
          >
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title fw-bold mb-0">
                      Donation #{don.donationId}
                    </h5>
                    <small className="text-muted">{don.donationType}</small>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setSelectedDonation(null)}
                  />
                </div>
                <div className="modal-body">
                  <table className="table table-sm table-borderless mb-3">
                    <tbody>
                      <tr>
                        <td className="text-muted" style={{ width: '35%' }}>Supporter</td>
                        <td className="fw-semibold">#{don.supporterId}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">Date</td>
                        <td className="fw-semibold">{formatDate(don.donationDate)}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">Amount</td>
                        <td className="fw-bold fs-5">{formatPeso(don.amount ?? don.estimatedValue)}</td>
                      </tr>
                      {don.amount != null && don.amount !== don.estimatedValue && (
                        <tr>
                          <td className="text-muted">Estimated Value</td>
                          <td className="fw-semibold">{formatPeso(don.estimatedValue)}</td>
                        </tr>
                      )}
                      <tr>
                        <td className="text-muted">Channel</td>
                        <td className="fw-semibold">{don.channelSource}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">Recurring</td>
                        <td>
                          {don.isRecurring ? (
                            <span className="badge bg-success">Yes</span>
                          ) : (
                            <span className="badge bg-secondary">No</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">Impact Unit</td>
                        <td className="fw-semibold">{don.impactUnit}</td>
                      </tr>
                      {don.campaignName && (
                        <tr>
                          <td className="text-muted">Campaign</td>
                          <td className="fw-semibold">{don.campaignName}</td>
                        </tr>
                      )}
                      {don.currencyCode && (
                        <tr>
                          <td className="text-muted">Currency</td>
                          <td className="fw-semibold">{don.currencyCode}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {don.notes && (
                    <>
                      <h6 className="fw-bold text-muted text-uppercase small mb-2">Notes</h6>
                      <p className="mb-3" style={{ whiteSpace: 'pre-wrap' }}>{don.notes}</p>
                    </>
                  )}

                  {allocations.length > 0 && (
                    <>
                      <h6 className="fw-bold text-muted text-uppercase small mb-2">
                        Safehouse Allocations
                      </h6>
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Safehouse</th>
                            <th>Program Area</th>
                            <th className="text-end">Amount</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allocations.map((a) => {
                            return (
                              <tr key={a.allocationId}>
                                <td>{safehouseCityLabel(data.safehouses, a.safehouseId)}</td>
                                <td>{a.programArea}</td>
                                <td className="text-end fw-semibold">
                                  {formatPeso(a.amountAllocated)}
                                </td>
                                <td>{formatDate(a.allocationDate)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Incident Summary Modal (from stat card click) ─────────────── */}
      {showIncidentSummary && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowIncidentSummary(false);
          }}
        >
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Incident Summary</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowIncidentSummary(false)}
                />
              </div>
              <div className="modal-body">
                <div className="row text-center mb-4">
                  <div className="col-6">
                    <div className="fs-2 fw-bold text-primary">
                      {derived.incidents60Count}
                    </div>
                    <small className="text-muted">Last 60 Days</small>
                  </div>
                  <div className="col-6">
                    <div className="fs-2 fw-bold text-secondary">
                      {derived.totalIncidents}
                    </div>
                    <small className="text-muted">All Time Total</small>
                  </div>
                </div>

                {derived.incidentTypeCounts.length > 0 ? (
                  <>
                    <h6 className="fw-bold text-muted text-uppercase small mb-2">
                      Most Common Types (Last 60 Days)
                    </h6>
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Incident Type</th>
                          <th className="text-end">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {derived.incidentTypeCounts.map(({ type, count }) => (
                          <tr key={type}>
                            <td className="fw-semibold">{type}</td>
                            <td className="text-end">{count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <p className="text-muted text-center mb-0">
                    No incidents in the last 60 days.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Donation Summary Modal ────────────────────────────────────── */}
      {showDonationSummary && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDonationSummary(false);
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Donation Summary</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDonationSummary(false)}
                />
              </div>
              <div className="modal-body">
                <div className="row text-center mb-4">
                  <div className="col-4">
                    <div className="fs-4 fw-bold text-primary">
                      {formatPeso(derived.donations60Total)}
                    </div>
                    <small className="text-muted">Last 60 Days</small>
                  </div>
                  <div className="col-4">
                    <div className="fs-4 fw-bold text-secondary">
                      {formatPeso(derived.totalDonations)}
                    </div>
                    <small className="text-muted">All Time Total</small>
                  </div>
                  <div className="col-4">
                    <div className="fs-4 fw-bold">{derived.donations60.length}</div>
                    <small className="text-muted">Donations (60d)</small>
                  </div>
                </div>

                {derived.donations60.length > 0 ? (
                  <>
                  <h6 className="fw-bold text-muted text-uppercase small mb-2">Last 60 Days:</h6>
                  <div className="table-responsive" style={{ maxHeight: 350 }}>
                    <table className="table table-sm table-hover">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Channel</th>
                          <th>Campaign</th>
                          <th className="text-end">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {derived.donations60.map((don) => (
                          <tr
                            key={don.donationId}
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              setShowDonationSummary(false);
                              setSelectedDonation(don.donationId);
                            }}
                          >
                            <td>{formatDate(don.donationDate)}</td>
                            <td>
                              <span className="badge bg-info text-dark">
                                {don.donationType}
                              </span>
                            </td>
                            <td className="small">{don.channelSource}</td>
                            <td className="small text-muted">
                              {don.campaignName ?? '—'}
                            </td>
                            <td className="text-end fw-semibold">
                              {formatPeso(don.amount ?? don.estimatedValue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  </>
                ) : (
                  <p className="text-muted text-center mb-0">
                    No donations in the last 60 days.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Safehouse Detail Modal ────────────────────────────────────── */}
      {selectedSafehouse != null && (() => {
        const sh = data.safehouses.find(
          (s) => s.safehouseId === selectedSafehouse
        );
        if (!sh) return null;

        const chartRow = derived.safehouseChart.find(
          (c) => c.safehouseId === selectedSafehouse
        );
        const compRow = data.safehouseComparison.find(
          (c) => c.safehouseId === selectedSafehouse
        );
        const shResidents = data.residents.filter(
          (r) => r.safehouseId === selectedSafehouse && r.caseStatus === 'Active'
        );
        const shIncidents = data.incidents.filter(
          (i) => i.safehouseId === selectedSafehouse
        );
        const shUnresolved = shIncidents.filter((i) => !i.resolved).length;
        const occupancyPct = sh.capacityGirls > 0
          ? Math.round((sh.currentOccupancy / sh.capacityGirls) * 100)
          : 0;

        return (
          <div
            className="modal d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedSafehouse(null);
            }}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title fw-bold mb-0">
                      {sh.city?.trim() || sh.name}
                    </h5>
                    <small className="text-muted">
                      {sh.name} &middot; {sh.safehouseCode}
                      {sh.province || sh.region
                        ? ` · ${[sh.province, sh.region].filter(Boolean).join(', ')}`
                        : ''}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setSelectedSafehouse(null)}
                  />
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    {/* Left — General Info */}
                    <div className="col-md-6">
                      <h6 className="fw-bold text-muted text-uppercase small mb-2">
                        General
                      </h6>
                      <table className="table table-sm table-borderless mb-3">
                        <tbody>
                          <tr>
                            <td className="text-muted" style={{ width: '45%' }}>Status</td>
                            <td>
                              <span className={`badge bg-${sh.status === 'Active' ? 'success' : 'secondary'}`}>
                                {sh.status}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="text-muted">Open Since</td>
                            <td className="fw-semibold">{formatDate(sh.openDate)}</td>
                          </tr>
                          <tr>
                            <td className="text-muted">Country</td>
                            <td className="fw-semibold">{sh.country}</td>
                          </tr>
                        </tbody>
                      </table>

                      <h6 className="fw-bold text-muted text-uppercase small mb-2">
                        Capacity
                      </h6>
                      <table className="table table-sm table-borderless mb-3">
                        <tbody>
                          <tr>
                            <td className="text-muted" style={{ width: '45%' }}>Girls Capacity</td>
                            <td className="fw-semibold">{sh.capacityGirls}</td>
                          </tr>
                          <tr>
                            <td className="text-muted">Staff Capacity</td>
                            <td className="fw-semibold">{sh.capacityStaff}</td>
                          </tr>
                          <tr>
                            <td className="text-muted">Current Occupancy</td>
                            <td>
                              <span className="fw-semibold">{sh.currentOccupancy}</span>
                              <span className={`badge ms-2 bg-${occupancyPct > 90 ? 'danger' : occupancyPct > 70 ? 'warning' : 'success'}`}>
                                {occupancyPct}%
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="text-muted">Active Residents</td>
                            <td className="fw-semibold">{shResidents.length}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Right — Performance & Incidents */}
                    <div className="col-md-6">
                      <h6 className="fw-bold text-muted text-uppercase small mb-2">
                        ML Improvement Scores (Avg)
                      </h6>
                      {chartRow ? (
                        <table className="table table-sm table-borderless mb-3">
                          <tbody>
                            {[
                              { label: 'Health', val: chartRow.Health, color: '#0d6efd' },
                              { label: 'Education', val: chartRow.Education, color: '#5C8A6B' },
                              { label: 'Emotional', val: chartRow.Emotional, color: '#6f42c1' },
                              { label: 'Overall', val: chartRow.Overall, color: '#C47A5A' },
                            ].map(({ label, val, color }) => (
                              <tr key={label}>
                                <td className="text-muted" style={{ width: '35%' }}>{label}</td>
                                <td>
                                  <div className="d-flex align-items-center gap-2">
                                    <div className="progress flex-grow-1" style={{ height: 8 }}>
                                      <div
                                        className="progress-bar"
                                        style={{ width: `${val}%`, backgroundColor: color }}
                                      />
                                    </div>
                                    <small className="fw-bold text-nowrap" style={{ minWidth: 36 }}>
                                      {val}%
                                    </small>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-muted small">No prediction data.</p>
                      )}

                      <h6 className="fw-bold text-muted text-uppercase small mb-2">
                        Incidents
                      </h6>
                      <table className="table table-sm table-borderless mb-3">
                        <tbody>
                          <tr>
                            <td className="text-muted" style={{ width: '45%' }}>Total Incidents</td>
                            <td className="fw-semibold">{shIncidents.length}</td>
                          </tr>
                          <tr>
                            <td className="text-muted">Unresolved</td>
                            <td>
                              <span className={`fw-semibold ${shUnresolved > 0 ? 'text-danger' : ''}`}>
                                {shUnresolved}
                              </span>
                            </td>
                          </tr>
                          {compRow && (
                            <>
                              <tr>
                                <td className="text-muted">Process Recordings</td>
                                <td className="fw-semibold">{compRow.totalProcessRecordings}</td>
                              </tr>
                              <tr>
                                <td className="text-muted">Home Visitations</td>
                                <td className="fw-semibold">{compRow.totalHomeVisitations}</td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {sh.notes && (
                    <>
                      <h6 className="fw-bold text-muted text-uppercase small mb-2">Notes</h6>
                      <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{sh.notes}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Risk Level Residents Modal ─────────────────────────────────── */}
      {selectedRiskLevel != null && (() => {
        const residents = data.residents
          .filter((r) => r.caseStatus === 'Active' && (r.currentRiskLevel ?? 'Unknown') === selectedRiskLevel)
          .sort((a, b) => a.internalCode.localeCompare(b.internalCode));
        const color = RISK_COLORS[selectedRiskLevel] ?? '#6c757d';
        return (
          <div
            className="modal d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedRiskLevel(null);
            }}
          >
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    <span className="badge me-2" style={{ backgroundColor: color }}>
                      {selectedRiskLevel}
                    </span>
                    Risk — {residents.length} Resident{residents.length !== 1 ? 's' : ''}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setSelectedRiskLevel(null)}
                  />
                </div>
                <div className="modal-body p-3">
                  {residents.length === 0 ? (
                    <p className="text-muted text-center py-4 mb-0">No residents.</p>
                  ) : (
                    <table className="table table-hover table-sm mb-0">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th>Resident</th>
                          <th>Safehouse</th>
                          <th>Social Worker</th>
                          <th>Age</th>
                        </tr>
                      </thead>
                      <tbody>
                        {residents.map((r) => (
                            <tr
                              key={r.residentId}
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                setSelectedRiskLevel(null);
                                setSelectedResident(r.residentId);
                              }}
                            >
                              <td className="fw-semibold">{r.internalCode}</td>
                              <td>{safehouseCityLabel(data.safehouses, r.safehouseId)}</td>
                              <td className="small">{r.assignedSocialWorker ?? '—'}</td>
                              <td>{r.presentAge}</td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Unresolved High Severity Modal ─────────────────────────────── */}
      {showUnresolvedHigh && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowUnresolvedHigh(false);
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Unresolved High Severity Incidents</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowUnresolvedHigh(false)}
                />
              </div>
              <div className="modal-body p-3">
                {derived.unresolvedHighList.length === 0 ? (
                  <p className="text-muted text-center py-4 mb-0">
                    No unresolved high severity incidents.
                  </p>
                ) : (
                  <table className="table table-hover table-sm mb-0">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Resident</th>
                        <th>Reported By</th>
                        <th>Follow-up</th>
                      </tr>
                    </thead>
                    <tbody>
                      {derived.unresolvedHighList.map((inc) => (
                        <tr
                          key={inc.incidentId}
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            setShowUnresolvedHigh(false);
                            setSelectedIncident(inc.incidentId);
                          }}
                        >
                          <td>{formatDate(inc.incidentDate)}</td>
                          <td className="fw-semibold">{inc.incidentType}</td>
                          <td>{inc.internalCode}</td>
                          <td className="small">{inc.reportedBy}</td>
                          <td>
                            {inc.followUpRequired ? (
                              <span className="badge bg-warning text-dark">Required</span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Safehouse List Modal ──────────────────────────────────────── */}
      {showSafehouseList && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSafehouseList(false);
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">All Safehouses</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowSafehouseList(false)}
                />
              </div>
              <div className="modal-body p-3">
                <table className="table table-hover table-sm mb-0">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th>City</th>
                      <th>Name</th>
                      <th>Region</th>
                      <th className="text-center">Occupancy</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.safehouses
                      .slice()
                      .sort((a, b) =>
                        (a.city || '').localeCompare(b.city || '', undefined, {
                          sensitivity: 'base',
                        })
                      )
                      .map((sh) => {
                        const pct = sh.capacityGirls > 0
                          ? Math.round((sh.currentOccupancy / sh.capacityGirls) * 100)
                          : 0;
                        return (
                          <tr
                            key={sh.safehouseId}
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              setShowSafehouseList(false);
                              setSelectedSafehouse(sh.safehouseId);
                            }}
                          >
                            <td className="fw-semibold">
                              {sh.city?.trim() || sh.name}
                            </td>
                            <td>{sh.name}</td>
                            <td>{sh.region}</td>
                            <td className="text-center">
                              <span className="fw-semibold">{sh.currentOccupancy}/{sh.capacityGirls}</span>
                              <span className={`badge ms-1 bg-${pct > 90 ? 'danger' : pct > 70 ? 'warning' : 'success'}`}>
                                {pct}%
                              </span>
                            </td>
                            <td>
                              <span className={`badge bg-${sh.status === 'Active' ? 'success' : 'secondary'}`}>
                                {sh.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
