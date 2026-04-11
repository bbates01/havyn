import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiFetch } from '../api/apiHelper';
import { useAuth } from '../context/AuthContext';
import { downloadCsv } from '../utils/csvDownload';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Resident {
  residentId: number;
  internalCode: string;
  safehouseId: number;
  caseStatus: string;
  currentRiskLevel: string | null;
  reintegrationStatus: string | null;
  reintegrationType: string | null;
  dateOfAdmission: string;
}

interface Safehouse {
  safehouseId: number;
  name: string;
  city: string;
  capacityGirls: number;
  currentOccupancy: number;
  status: string;
}

interface DonationAllocation {
  allocationId: number;
  donationId: number;
  safehouseId: number;
  programArea: string;
  amountAllocated: number;
  allocationDate: string;
}

interface ResidentOutcomesDto {
  totalActiveResidents: number;
  riskDistribution: { riskLevel: string | null; count: number }[];
  avgEducationProgress: number;
  avgHealthScore: number;
  reintegrationSummary: { reintegrationType: string | null; count: number }[];
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

interface ServicesProvidedDto {
  caring: number;
  healing: number;
  teaching: number;
  legalReferrals: number;
  legalPlans: number;
}

interface DonationTrendsDto {
  monthlyTotals: { month: string; totalAmount: number; count: number }[];
  byCampaign: { campaign: string; totalValue: number; count: number }[];
  totalDonors: number;
  recurringDonors: number;
  oneTimeDonors: number;
}

/** Progress model row from GET /api/ml/predictions */
interface MlPredictionRow {
  residentId: number;
  overallScore: number | null;
  healthProb: number | null;
  educationProb: number | null;
  emotionalProb: number | null;
}

type FetchError = { id: string; label: string; message: string };

function extractItems<T>(raw: unknown): T[] {
  if (!raw || typeof raw !== 'object') return [];
  const o = raw as { items?: T[]; Items?: T[] };
  return o.items ?? o.Items ?? (Array.isArray(raw) ? (raw as T[]) : []);
}

function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Default report window: one year ago → today. */
function defaultDateRange(): { start: string; end: string } {
  const today = new Date();
  const start = new Date();
  start.setFullYear(today.getFullYear() - 1);
  return { start: formatDateYMD(start), end: formatDateYMD(today) };
}

/** Parse API date-of-admission without UTC day-shift (DateOnly "YYYY-MM-DD" must use local calendar date). */
function parseAdmissionLocalMs(s: string | null | undefined): number | null {
  if (s == null || String(s).trim() === '') return null;
  const str = String(s).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (m) {
    const yy = Number(m[1]);
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null;
    return new Date(yy, mm - 1, dd).getTime();
  }
  const t = new Date(str).getTime();
  return Number.isFinite(t) ? t : null;
}

function isActiveCaseStatus(status: string | null | undefined): boolean {
  return status?.trim().toLowerCase() === 'active';
}

function normalizeMlPredictionRow(raw: Record<string, unknown>): MlPredictionRow {
  const rid = raw.residentId ?? raw.ResidentId;
  const os = raw.overallScore ?? raw.OverallScore;
  const hp = raw.healthProb ?? raw.HealthProb;
  const ep = raw.educationProb ?? raw.EducationProb;
  const em = raw.emotionalProb ?? raw.EmotionalProb;
  const numOrNull = (v: unknown): number | null => {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    residentId: Number(rid),
    overallScore: numOrNull(os),
    healthProb: numOrNull(hp),
    educationProb: numOrNull(ep),
    emotionalProb: numOrNull(em),
  };
}

function isActiveSafehouseStatus(status: string | null | undefined): boolean {
  return status?.trim().toLowerCase() === 'active';
}

function scorePctTextClass(pct: number): string {
  if (pct >= 65) return 'text-success';
  if (pct >= 40) return 'text-warning';
  return 'text-danger';
}

function bucketMidpointFill(midpoint: number, success: string, warning: string, danger: string): string {
  if (midpoint >= 65) return success;
  if (midpoint >= 40) return warning;
  return danger;
}

type OverallDistMetric = 'overall' | 'health' | 'education' | 'emotional';

function pickOverallDistScore(p: MlPredictionRow, m: OverallDistMetric): number | null {
  switch (m) {
    case 'overall':
      return p.overallScore != null && !Number.isNaN(p.overallScore) ? p.overallScore : null;
    case 'health':
      return p.healthProb != null && !Number.isNaN(p.healthProb) ? p.healthProb : null;
    case 'education':
      return p.educationProb != null && !Number.isNaN(p.educationProb) ? p.educationProb : null;
    case 'emotional':
      return p.emotionalProb != null && !Number.isNaN(p.emotionalProb) ? p.emotionalProb : null;
    default:
      return null;
  }
}

const OVERALL_DIST_METRIC_OPTIONS: { value: OverallDistMetric; label: string }[] = [
  { value: 'overall', label: 'Overall' },
  { value: 'health', label: 'Health' },
  { value: 'education', label: 'Education' },
  { value: 'emotional', label: 'Emotional' },
];

function isClosedCaseStatus(status: string | null | undefined): boolean {
  return status?.trim().toLowerCase() === 'closed';
}

function normalizeDateInputValue(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(raw.trim());
  return m ? m[1] : null;
}

function parseLocalDate(s: string): Date {
  const [yy, mm, dd] = s.split('-').map(Number);
  return new Date(yy, (mm ?? 1) - 1, dd ?? 1);
}

function filterResidents(
  residents: Resident[],
  start: string,
  end: string,
  includeClosed: boolean
): Resident[] {
  const t0 = parseLocalDate(start).getTime();
  const t1 = parseLocalDate(end).getTime() + 86400000 - 1;
  return residents.filter((r) => {
    if (!includeClosed && isClosedCaseStatus(r.caseStatus)) return false;
    const adm = parseAdmissionLocalMs(r.dateOfAdmission);
    if (adm != null && (adm < t0 || adm > t1)) return false;
    return true;
  });
}

function safehouseDisplayLabel(sh: Safehouse | undefined): string {
  if (!sh) return 'Unknown';
  const c = sh.city?.trim();
  const n = sh.name?.trim();
  if (c && n) return `${c} · ${n}`;
  return c || n || 'Unknown';
}

const RISK_FILL: Record<string, string> = {
  Low: '#5C8A6B',
  Medium: '#E9C46A',
  High: '#C47A5A',
  Critical: '#C65B5B',
};

// These hex values are used as SVG fill colors in Recharts and must stay as literals.
// The CSS equivalents are: --blue, --green, --gold, --danger, --muted (see index.css).
const THEME_BLUE = '#4a6fa5';
const THEME_GREEN = '#4a7c59';
const THEME_TAN = '#e8b730';
const THEME_RED = '#c65b5b';
const THEME_NEUTRAL = '#adb5bd';

type SafehouseMetricTab = 'health' | 'education' | 'emotional' | 'overall';

const SAFEHOUSE_METRIC_TITLES: Record<SafehouseMetricTab, string> = {
  health: 'Average Health Score by Safehouse (%)',
  education: 'Average Education Progress by Safehouse (%)',
  emotional: 'Average Emotional Wellbeing by Safehouse (%)',
  overall: 'Overall Average Progress by Safehouse (%)',
};

const SAFEHOUSE_METRIC_HINTS: Record<SafehouseMetricTab, string> = {
  health:
    'General health score on a 0–100 scale (from recorded 1–5 ratings × 20).',
  education: 'Education completion progress (%) for residents at each location.',
  emotional:
    'Geometric mean of health and education scores—a balanced view when both domains align.',
  overall: 'Mean of health (0–100) and education (%)—equal weight to each pillar.',
};

const SOCIAL_PLATFORM_ORDER = [
  'Facebook',
  'Instagram',
  'Twitter',
  'TikTok',
  'WhatsApp',
  'LinkedIn',
  'YouTube',
] as const;

const FEATURE_LABEL_MAP: Record<string, string> = {
  family_indigenous: 'Indigenous family background',
  'reintegration_type_Independent Living': 'Independent Living pathway',
  'reintegration_type_Adoption (Inter-Country)': 'Inter-Country Adoption pathway',
  early_pct_concerns: 'Early counseling concerns flagged',
  is_pwd: 'Person with disability',
};

function humanizeFeatureKey(key: string): string {
  if (FEATURE_LABEL_MAP[key]) return FEATURE_LABEL_MAP[key];
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPhpAmount(n: number): string {
  return `₱${Math.round(n).toLocaleString('en-PH')}`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const role: 'admin' | 'manager' | 'staff' | null = user?.roles.includes('Admin')
    ? 'admin'
    : user?.roles.includes('Manager')
      ? 'manager'
      : user?.roles.includes('SocialWorker')
        ? 'staff'
        : null;

  const safehouseId = user?.safehouseId ?? null;

  const [startDate, setStartDate] = useState(() => defaultDateRange().start);
  const [endDate, setEndDate] = useState(() => defaultDateRange().end);
  const [includeClosed, setIncludeClosed] = useState(false);
  const [reportsTab, setReportsTab] = useState<'reports' | 'ml'>('reports');
  const [socialTab, setSocialTab] = useState<string>('Facebook');
  const [safehouseMetricTab, setSafehouseMetricTab] =
    useState<SafehouseMetricTab>('overall');
  const [earliestResidentDate, setEarliestResidentDate] = useState<string | null>(null);
  const [didInitStartDate, setDidInitStartDate] = useState(false);

  const [loading, setLoading] = useState(true);
  const [fetchErrors, setFetchErrors] = useState<FetchError[]>([]);
  const [dismissedErrors, setDismissedErrors] = useState<Set<string>>(new Set());

  const [residentOutcomes, setResidentOutcomes] = useState<ResidentOutcomesDto | null>(null);
  const [safehouseComparison, setSafehouseComparison] = useState<SafehouseComparisonRow[] | null>(
    null
  );
  const [servicesProvided, setServicesProvided] = useState<ServicesProvidedDto | null>(null);
  const [donationTrends, setDonationTrends] = useState<DonationTrendsDto | null>(null);
  const [modelMeta, setModelMeta] = useState<Record<string, unknown> | null>(null);
  const [safehouses, setSafehouses] = useState<Safehouse[] | null>(null);
  const [residents, setResidents] = useState<Resident[] | null>(null);
  const [allocations, setAllocations] = useState<DonationAllocation[] | null>(null);
  const [mlPredictions, setMlPredictions] = useState<MlPredictionRow[] | null>(null);

  const [selectedOverallScoreSafehouseIds, setSelectedOverallScoreSafehouseIds] = useState<
    number[]
  >([]);
  const [overallScoreShFilterOpen, setOverallScoreShFilterOpen] = useState(false);
  const [overallDistMetric, setOverallDistMetric] = useState<OverallDistMetric>('overall');
  const [overallDistMetricFilterOpen, setOverallDistMetricFilterOpen] = useState(false);
  const overallProgressDistFiltersRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (role !== 'admin' && role !== 'manager') return;

    setLoading(true);
    setFetchErrors([]);

    setResidentOutcomes(null);
    setSafehouseComparison(null);
    setServicesProvided(null);
    setDonationTrends(null);
    setModelMeta(null);
    setSafehouses(null);
    setResidents(null);
    setAllocations(null);
    setMlPredictions(null);

    const resUrl =
      role === 'manager' && safehouseId != null
        ? `/api/Residents/AllResidents?pageSize=500&pageIndex=1&safehouseId=${safehouseId}`
        : '/api/Residents/AllResidents?pageSize=500&pageIndex=1';
    const earliestResUrl =
      role === 'manager' && safehouseId != null
        ? `/api/Residents/AllResidents?pageSize=1&pageIndex=1&sortBy=DateOfAdmission&sortOrder=asc&safehouseId=${safehouseId}`
        : '/api/Residents/AllResidents?pageSize=1&pageIndex=1&sortBy=DateOfAdmission&sortOrder=asc';

    const endpoints: { id: string; label: string; url: string }[] = [
      { id: 'ro', label: 'Resident outcomes', url: '/api/Reports/ResidentOutcomes' },
      { id: 'sc', label: 'Safehouse comparison', url: '/api/Reports/SafehouseComparison' },
      { id: 'sv', label: 'Services provided', url: '/api/Reports/ServicesProvided' },
      { id: 'dt', label: 'Donation trends', url: '/api/Reports/DonationTrends' },
      { id: 'mm', label: 'ML model meta', url: '/api/ml/model-meta' },
      { id: 'ir', label: 'Incident risk (ML)', url: '/api/ml/incident-risk' },
      { id: 'mp', label: 'ML predictions', url: '/api/ml/predictions' },
      { id: 'sh', label: 'Safehouses', url: '/api/Safehouses/AllSafehouses?pageSize=100&pageIndex=1' },
      { id: 'rs', label: 'Residents', url: resUrl },
      { id: 'rs-min', label: 'Earliest resident date', url: earliestResUrl },
      { id: 'al', label: 'Donation allocations', url: '/api/DonationAllocations/All' },
    ];

    const results = await Promise.allSettled(
      endpoints.map((e) => apiFetch<unknown>(e.url))
    );

    const errs: FetchError[] = [];

    results.forEach((result, i) => {
      const { id, label } = endpoints[i];
      if (result.status === 'rejected') {
        const msg =
          result.reason instanceof Error ? result.reason.message : String(result.reason);
        if (id === 'mm' && msg.includes('404')) {
          setModelMeta(null);
          return;
        }
        errs.push({ id, label, message: msg });
        return;
      }
      const data = result.value;
      try {
        switch (id) {
          case 'ro':
            setResidentOutcomes(data as ResidentOutcomesDto);
            break;
          case 'sc':
            setSafehouseComparison(Array.isArray(data) ? (data as SafehouseComparisonRow[]) : []);
            break;
          case 'sv':
            setServicesProvided(data as ServicesProvidedDto);
            break;
          case 'dt':
            setDonationTrends(data as DonationTrendsDto);
            break;
          case 'mm':
            setModelMeta(data && typeof data === 'object' ? (data as Record<string, unknown>) : null);
            break;
          case 'ir':
            break;
          case 'mp': {
            const arr = Array.isArray(data)
              ? (data as Record<string, unknown>[])
              : extractItems<Record<string, unknown>>(data);
            setMlPredictions(arr.map(normalizeMlPredictionRow));
            break;
          }
          case 'sh':
            setSafehouses(extractItems<Safehouse>(data));
            break;
          case 'rs':
            setResidents(extractItems<Resident>(data));
            break;
          case 'rs-min': {
            const first = extractItems<Resident>(data)[0];
            setEarliestResidentDate(normalizeDateInputValue(first?.dateOfAdmission ?? null));
            break;
          }
          case 'al':
            setAllocations(Array.isArray(data) ? (data as DonationAllocation[]) : []);
            break;
          default:
            break;
        }
      } catch {
        errs.push({ id, label, message: 'Failed to parse response' });
      }
    });

    setFetchErrors(errs);
    setLoading(false);
  }, [role, safehouseId]);

  useEffect(() => {
    if (role === 'admin' || role === 'manager') load();
  }, [load, role]);

  useEffect(() => {
    if (didInitStartDate) return;
    if (!earliestResidentDate) return;
    setStartDate(earliestResidentDate);
    setDidInitStartDate(true);
  }, [didInitStartDate, earliestResidentDate]);

  const filteredResidents = useMemo(() => {
    if (!residents) return [];
    return filterResidents(residents, startDate, endDate, includeClosed);
  }, [residents, startDate, endDate, includeClosed]);

  const safehouseMap = useMemo(() => {
    const m = new Map<number, Safehouse>();
    for (const s of safehouses ?? []) m.set(s.safehouseId, s);
    return m;
  }, [safehouses]);

  const comparisonRowsFull = useMemo(() => {
    const rows = safehouseComparison ?? [];
    return rows.map((r) => {
      const sh = safehouseMap.get(r.safehouseId);
      const cap = sh?.capacityGirls ?? 0;
      const occ = sh?.currentOccupancy ?? 0;
      const occPct = cap > 0 ? Math.round((occ / cap) * 100) : null;
      return {
        ...r,
        label: safehouseDisplayLabel(sh),
        cityFirst: safehouseDisplayLabel(sh),
        occupancyPct: occPct,
        capacityGirls: cap,
        currentOccupancy: occ,
      };
    });
  }, [safehouseComparison, safehouseMap]);

  const comparisonRowsScoped = useMemo(() => {
    if (role === 'manager' && safehouseId != null) {
      return comparisonRowsFull.filter((r) => r.safehouseId === safehouseId);
    }
    return comparisonRowsFull;
  }, [comparisonRowsFull, role, safehouseId]);

  /**
   * Horizontal bar: city-only label; value 0–100 per sub-nav metric.
   * Health = avgHealthScore×20; Education = progress %; Emotional = √(health×education);
   * Overall = mean of health and education.
   */
  const safehouseMetricBarData = useMemo(() => {
    return comparisonRowsScoped.map((r) => {
      const sh = safehouseMap.get(r.safehouseId);
      const cityRaw = sh?.city?.trim();
      const cityName =
        cityRaw ||
        (r.label.includes('·') ? r.label.split('·')[0]?.trim() : r.label) ||
        r.label;
      const healthScaled = Math.round(r.avgHealthScore * 20 * 10) / 10;
      const education = Math.round(r.avgEducationProgress * 10) / 10;
      let value: number;
      switch (safehouseMetricTab) {
        case 'health':
          value = healthScaled;
          break;
        case 'education':
          value = education;
          break;
        case 'emotional':
          value =
            Math.round(Math.sqrt(Math.max(0, healthScaled * education)) * 10) / 10;
          break;
        case 'overall':
          value = Math.round(((healthScaled + education) / 2) * 10) / 10;
          break;
      }
      const fill =
        value >= 50
          ? THEME_GREEN
          : value >= 40
            ? THEME_TAN
            : THEME_RED;
      return { name: cityName, value, fill };
    });
  }, [comparisonRowsScoped, safehouseMap, safehouseMetricTab]);

  const activeFilteredCount = useMemo(
    () => filteredResidents.filter((r) => isActiveCaseStatus(r.caseStatus)).length,
    [filteredResidents]
  );

  const riskDonutData = useMemo(() => {
    const rollup = (list: Resident[]) => {
      const m = new Map<string, number>();
      for (const r of list) {
        if (!isActiveCaseStatus(r.caseStatus)) continue;
        const k = r.currentRiskLevel ?? 'Unknown';
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return [...m.entries()].map(([name, value]) => ({ name, value }));
    };
    // Always use client-side resident data so donut respects current date filters.
    return rollup(filteredResidents);
  }, [filteredResidents]);

  const riskDonutTotal = useMemo(
    () => riskDonutData.reduce((s, d) => s + d.value, 0),
    [riskDonutData]
  );

  const breakdownBySafehouse = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of filteredResidents) {
      m.set(r.safehouseId, (m.get(r.safehouseId) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([id, count]) => ({
        safehouseId: id,
        label: safehouseDisplayLabel(safehouseMap.get(id)),
        count,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredResidents, safehouseMap]);

  const reintegrationRows = useMemo(() => {
    const types = new Set<string>();
    for (const r of filteredResidents) {
      if (r.reintegrationType && r.reintegrationType !== 'None') types.add(r.reintegrationType);
    }
    for (const row of residentOutcomes?.reintegrationSummary ?? []) {
      if (row.reintegrationType && row.reintegrationType !== 'None') {
        types.add(row.reintegrationType);
      }
    }
    return [...types].map((t) => {
      const total = filteredResidents.filter((r) => r.reintegrationType === t).length;
      const completed = filteredResidents.filter(
        (r) => r.reintegrationType === t && r.reintegrationStatus === 'Completed'
      ).length;
      const pct = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;
      return { reintegrationType: t, completed, total, pct };
    });
  }, [filteredResidents, residentOutcomes]);

  const allocationsScoped = useMemo(() => {
    let list = allocations ?? [];
    if (role === 'manager' && safehouseId != null) {
      list = list.filter((a) => a.safehouseId === safehouseId);
    }
    const t0 = parseLocalDate(startDate).getTime();
    const t1 = parseLocalDate(endDate).getTime() + 86400000 - 1;
    list = list.filter((a) => {
      const t = parseAdmissionLocalMs(a.allocationDate);
      if (t == null) return true;
      return t >= t0 && t <= t1;
    });
    return list;
  }, [allocations, role, safehouseId, startDate, endDate]);

  const allocationsByProgram = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of allocationsScoped) {
      m.set(a.programArea, (m.get(a.programArea) ?? 0) + a.amountAllocated);
    }
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [allocationsScoped]);

  /** Descending by amount for horizontal bar chart. */
  const allocationsBarData = useMemo(() => {
    return [...allocationsByProgram].sort((a, b) => b.value - a.value);
  }, [allocationsByProgram]);

  const campaignsFilteredSorted = useMemo(() => {
    const bc = [...(donationTrends?.byCampaign ?? [])].filter((c) => {
      const n = c.campaign;
      if (n == null) return false;
      const s = String(n).trim();
      return s !== '' && s !== 'null';
    });
    bc.sort((a, b) => b.totalValue - a.totalValue);
    return bc;
  }, [donationTrends]);

  const donorDonutData = useMemo(() => {
    const r = donationTrends?.recurringDonors ?? 0;
    const o = donationTrends?.oneTimeDonors ?? 0;
    return [
      { name: 'Recurring donors (distinct)', value: r },
      { name: 'One-time donors (distinct)', value: o },
    ];
  }, [donationTrends]);

  // ML meta (defensive)
  const incidentFactors = useMemo(() => {
    const raw = modelMeta?.incidentRiskFactors as Record<string, unknown> | undefined;
    const arr = raw?.risk_factors as { label?: string; importance?: number }[] | undefined;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x.label != null && x.importance != null)
      .map((x) => ({
        label: String(x.label),
        importance: Number(x.importance),
      }));
  }, [modelMeta]);

  const reintModel = useMemo(() => {
    return (modelMeta?.reintegrationModel ?? null) as Record<string, unknown> | null;
  }, [modelMeta]);

  const reintMetaBlock = useMemo(() => {
    return (reintModel?.meta ?? {}) as Record<string, unknown>;
  }, [reintModel]);

  const reintRefClasses = useMemo(() => {
    const rc = reintModel?.reference_classes as Record<string, unknown> | undefined;
    const by = rc?.by_reintegration_type as Record<
      string,
      { avg_months?: number; n?: number; n_cases?: number; low_n_warning?: boolean }
    > | null;
    if (!by || typeof by !== 'object') return [];
    return Object.entries(by)
      .filter(([pathway]) => pathway !== 'None')
      .map(([pathway, v]) => ({
        pathway,
        avgMonths: v?.avg_months ?? 0,
        cases: typeof v?.n === 'number' ? v.n : (v?.n_cases ?? 0),
        lowN: Boolean(v?.low_n_warning),
      }));
  }, [reintModel]);

  type ReintFeat = {
    key: string;
    label: string;
    days: number;
    significant: boolean;
    pValue: number | null;
  };

  const reintFeatures = useMemo(() => {
    const pm = reintModel?.primary_model as Record<string, unknown> | undefined;
    const feats = pm?.features as Record<
      string,
      {
        coefficient?: number;
        direction?: string;
        significant?: boolean;
        p_value?: number;
        p?: number;
      }
    > | null;
    if (!feats || typeof feats !== 'object') {
      return { longer: [] as ReintFeat[], shorter: [] as ReintFeat[] };
    }
    const longer: ReintFeat[] = [];
    const shorter: ReintFeat[] = [];
    for (const [name, v] of Object.entries(feats)) {
      const coef = v?.coefficient ?? 0;
      const days = Math.abs(Number(coef));
      const sig = Boolean(v?.significant);
      const pRaw = v?.p_value ?? v?.p;
      const pValue =
        pRaw != null && !Number.isNaN(Number(pRaw)) ? Number(pRaw) : null;
      const row: ReintFeat = {
        key: name,
        label: humanizeFeatureKey(name),
        days,
        significant: sig,
        pValue,
      };
      if (v?.direction === 'longer_stay') longer.push(row);
      else if (v?.direction === 'shorter_stay') shorter.push(row);
    }
    return { longer, shorter };
  }, [reintModel]);

  const socialPlatforms = useMemo(() => {
    const raw = modelMeta?.socialMediaRecs;
    if (!raw || typeof raw !== 'object') return {} as Record<string, Record<string, unknown>>;
    return raw as Record<string, Record<string, unknown>>;
  }, [modelMeta]);

  const socialPlatformKeys = useMemo((): string[] => {
    const keys = Object.keys(socialPlatforms);
    return SOCIAL_PLATFORM_ORDER.filter((p) => keys.includes(p)) as string[];
  }, [socialPlatforms]);

  useEffect(() => {
    if (socialPlatformKeys.length === 0) return;
    if (socialPlatformKeys.includes(socialTab)) return;
    const preferred = socialPlatformKeys.includes('Facebook')
      ? 'Facebook'
      : socialPlatformKeys[0];
    setSocialTab(preferred);
  }, [socialPlatformKeys, socialTab]);

  useEffect(() => {
    if (!overallScoreShFilterOpen && !overallDistMetricFilterOpen) return;
    const onDown = (e: MouseEvent) => {
      const root = overallProgressDistFiltersRef.current;
      if (root && !root.contains(e.target as Node)) {
        setOverallScoreShFilterOpen(false);
        setOverallDistMetricFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [overallScoreShFilterOpen, overallDistMetricFilterOpen]);

  const bsMlBarColors = useMemo(() => {
    const r = document.documentElement;
    const cs = getComputedStyle(r);
    return {
      success: cs.getPropertyValue('--bs-success').trim() || '#198754',
      warning: cs.getPropertyValue('--bs-warning').trim() || '#ffc107',
      danger: cs.getPropertyValue('--bs-danger').trim() || '#dc3545',
    };
  }, []);

  const activeSafehousesForOverallFilter = useMemo(() => {
    return (safehouses ?? [])
      .filter((s) => isActiveSafehouseStatus(s.status))
      .sort((a, b) =>
        safehouseDisplayLabel(a).localeCompare(safehouseDisplayLabel(b), undefined, {
          sensitivity: 'base',
        })
      );
  }, [safehouses]);

  const overallProgressScopedScores = useMemo(() => {
    if (!residents || !mlPredictions) return [];
    let scoped = residents.filter((r) => isActiveCaseStatus(r.caseStatus));
    if (role === 'manager' && safehouseId != null) {
      scoped = scoped.filter((r) => r.safehouseId === safehouseId);
    } else if (role === 'admin' && selectedOverallScoreSafehouseIds.length > 0) {
      scoped = scoped.filter((r) =>
        selectedOverallScoreSafehouseIds.includes(r.safehouseId)
      );
    }
    const idSet = new Set(scoped.map((r) => r.residentId));
    const out: number[] = [];
    for (const p of mlPredictions) {
      if (!idSet.has(p.residentId)) continue;
      const v = pickOverallDistScore(p, overallDistMetric);
      if (v == null || Number.isNaN(v)) continue;
      out.push(v);
    }
    return out;
  }, [
    residents,
    mlPredictions,
    role,
    safehouseId,
    selectedOverallScoreSafehouseIds,
    overallDistMetric,
  ]);

  const overallProgressHistogramData = useMemo(() => {
    const scores = overallProgressScopedScores;
    const edges = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const rows: { range: string; count: number; midpoint: number }[] = [];
    for (let i = 0; i < 9; i++) {
      const low = edges[i]!;
      const high = edges[i + 1]!;
      let count = 0;
      for (const os of scores) {
        const p = os * 100;
        if (p >= low && p < high) count++;
      }
      rows.push({
        range: `${low}-${high}%`,
        count,
        midpoint: (low + high) / 2,
      });
    }
    let cLast = 0;
    for (const os of scores) {
      const p = os * 100;
      if (p >= 90 && p <= 100) cLast++;
    }
    rows.push({ range: '90-100%', count: cLast, midpoint: 95 });
    return rows;
  }, [overallProgressScopedScores]);

  const overallProgressStats = useMemo(() => {
    const scores = overallProgressScopedScores;
    const n = scores.length;
    if (n === 0) {
      return {
        mean: null as number | null,
        median: null as number | null,
        n: 0,
        meanClass: 'text-muted',
        medianClass: 'text-muted',
      };
    }
    const meanRaw = scores.reduce((a, b) => a + b, 0) / n;
    const meanPct = Math.round(meanRaw * 1000) / 10;
    const sorted = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const medianRaw =
      sorted.length % 2 === 1
        ? sorted[mid]!
        : (sorted[mid - 1]! + sorted[mid]!) / 2;
    const medianPct = Math.round(medianRaw * 1000) / 10;
    return {
      mean: meanPct,
      median: medianPct,
      n,
      meanClass: scorePctTextClass(meanPct),
      medianClass: scorePctTextClass(medianPct),
    };
  }, [overallProgressScopedScores]);

  const overallScoreFilterButtonLabel = useMemo(() => {
    if (selectedOverallScoreSafehouseIds.length === 0) return 'All Safehouses';
    if (selectedOverallScoreSafehouseIds.length === 1) {
      const sh = safehouseMap.get(selectedOverallScoreSafehouseIds[0]!);
      const city = sh?.city?.trim();
      return city || safehouseDisplayLabel(sh) || '1 Selected';
    }
    return `${selectedOverallScoreSafehouseIds.length} Selected`;
  }, [selectedOverallScoreSafehouseIds, safehouseMap]);

  const overallDistMetricButtonLabel = useMemo(() => {
    switch (overallDistMetric) {
      case 'overall':
        return 'Overall';
      case 'health':
        return 'Health';
      case 'education':
        return 'Education';
      case 'emotional':
        return 'Emotional';
      default:
        return 'Overall';
    }
  }, [overallDistMetric]);

  const overallDistXAxisLabel = useMemo(() => {
    switch (overallDistMetric) {
      case 'overall':
        return 'Overall Score (%)';
      case 'health':
        return 'Health (%)';
      case 'education':
        return 'Education (%)';
      case 'emotional':
        return 'Emotional (%)';
      default:
        return 'Score (%)';
    }
  }, [overallDistMetric]);

  if (authLoading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: '60vh' }}
      >
        <div className="spinner-border" style={{ color: THEME_BLUE }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'admin' && role !== 'manager') {
    return <Navigate to="/staff" replace />;
  }

  if (loading) {
    return (
      <div className="container py-4">
        <div className="text-center py-5">
          <div className="spinner-border mb-3" style={{ color: THEME_BLUE }} role="status" />
          <p className="text-muted">Loading reports…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 px-3 px-md-4 dashboard-theme">
      <h1 className="h3 fw-bold mb-4">Reports and Analytics</h1>

      {fetchErrors
        .filter((e) => !dismissedErrors.has(e.id))
        .map((e) => (
          <div
            key={e.id}
            className="alert alert-dismissible"
            role="alert"
            style={{
              backgroundColor: 'var(--surface-warm)',
              borderColor: THEME_TAN,
              color: 'var(--text)',
            }}
          >
            <strong>{e.label}</strong> could not be loaded: {e.message}
            <button
              type="button"
              className="btn-close"
              aria-label="Dismiss"
              onClick={() =>
                setDismissedErrors((prev) => new Set(prev).add(e.id))
              }
            />
          </div>
        ))}

      <div className="dashboard-subnav border-bottom mb-3">
        <div className="container-fluid px-0">
          <ul className="nav nav-tabs border-0">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${reportsTab === 'reports' ? 'active fw-semibold' : 'text-muted'}`}
                onClick={() => setReportsTab('reports')}
              >
                Reports
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${reportsTab === 'ml' ? 'active fw-semibold' : 'text-muted'}`}
                onClick={() => setReportsTab('ml')}
              >
                Machine Learning Insights
              </button>
            </li>
          </ul>
        </div>
      </div>

      {reportsTab === 'ml' && (
      <>
      {/* Section 2 — ML first on page */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h2 className="h4 fw-bold mb-0">
              ML Model Insights
            </h2>
            <button
              type="button"
              className="btn btn-sm"
              style={{ borderColor: THEME_BLUE, color: THEME_BLUE }}
              onClick={() =>
                downloadCsv('reports-ml-meta.csv', [
                  ...incidentFactors.map((f) => ({
                    section: 'incident_factors',
                    label: f.label,
                    importance: f.importance,
                  })),
                  ...reintRefClasses.map((r) => ({
                    section: 'reintegration_ref',
                    pathway: r.pathway,
                    avgMonths: r.avgMonths,
                    cases: r.cases,
                    lowN: r.lowN,
                  })),
                  ...reintFeatures.longer.map((f) => ({
                    section: 'feature_longer',
                    name: f.key,
                    days: f.days,
                    significant: f.significant,
                    pValue: f.pValue ?? '',
                  })),
                  ...reintFeatures.shorter.map((f) => ({
                    section: 'feature_shorter',
                    name: f.key,
                    days: f.days,
                    significant: f.significant,
                    pValue: f.pValue ?? '',
                  })),
                ])
              }
            >
              Export CSV
            </button>
          </div>

          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
                <h5 className="fw-semibold border-start border-4 border-primary ps-3 mb-0">
                  Overall Progress Score Distribution
                </h5>
                <div
                  ref={overallProgressDistFiltersRef}
                  className="d-flex flex-wrap gap-2 align-items-start justify-content-end"
                >
                  {role === 'admin' && (
                    <div className="position-relative flex-shrink-0">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center"
                        onClick={() => setOverallScoreShFilterOpen((o) => !o)}
                        aria-expanded={overallScoreShFilterOpen}
                      >
                        <span className="text-truncate" style={{ maxWidth: 180 }}>
                          {overallScoreFilterButtonLabel}
                        </span>
                        <span className="ms-1 small" aria-hidden>
                          ▾
                        </span>
                      </button>
                      {overallScoreShFilterOpen ? (
                        <div
                          className="position-absolute bg-white border rounded shadow-sm mt-1 py-2 px-2 end-0"
                          style={{ zIndex: 1000, minWidth: 220 }}
                        >
                          <label className="d-flex align-items-center gap-2 small mb-2 user-select-none">
                            <input
                              type="checkbox"
                              className="form-check-input mt-0"
                              checked={selectedOverallScoreSafehouseIds.length === 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedOverallScoreSafehouseIds([]);
                                }
                              }}
                            />
                            All Safehouses
                          </label>
                          <hr className="my-2" />
                          {activeSafehousesForOverallFilter.map((sh) => (
                            <label
                              key={sh.safehouseId}
                              className="d-flex align-items-center gap-2 small mb-1 user-select-none"
                            >
                              <input
                                type="checkbox"
                                className="form-check-input mt-0"
                                checked={selectedOverallScoreSafehouseIds.includes(
                                  sh.safehouseId
                                )}
                                onChange={() => {
                                  setSelectedOverallScoreSafehouseIds((prev) =>
                                    prev.includes(sh.safehouseId)
                                      ? prev.filter((id) => id !== sh.safehouseId)
                                      : [...prev, sh.safehouseId].sort((a, b) => a - b)
                                  );
                                }}
                              />
                              {safehouseDisplayLabel(sh)}
                            </label>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                  <div className="position-relative flex-shrink-0">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center"
                      onClick={() => setOverallDistMetricFilterOpen((o) => !o)}
                      aria-expanded={overallDistMetricFilterOpen}
                    >
                      <span className="text-truncate" style={{ maxWidth: 160 }}>
                        {overallDistMetricButtonLabel}
                      </span>
                      <span className="ms-1 small" aria-hidden>
                        ▾
                      </span>
                    </button>
                    {overallDistMetricFilterOpen ? (
                      <div
                        className="position-absolute bg-white border rounded shadow-sm mt-1 py-2 px-2 end-0"
                        style={{ zIndex: 1000, minWidth: 200 }}
                        role="listbox"
                        aria-label="Score type"
                      >
                        {OVERALL_DIST_METRIC_OPTIONS.map((opt) => (
                          <label
                            key={opt.value}
                            className="d-flex align-items-center gap-2 small mb-1 user-select-none"
                          >
                            <input
                              type="radio"
                              className="form-check-input mt-0"
                              name="overall-dist-metric"
                              checked={overallDistMetric === opt.value}
                              onChange={() => {
                                setOverallDistMetric(opt.value);
                                setOverallDistMetricFilterOpen(false);
                              }}
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              {overallProgressStats.n === 0 ? (
                <p className="text-muted small mb-0">
                  No prediction data available for the current filters.
                </p>
              ) : (
                <div className="row g-3 align-items-center">
                  <div className="col-md-8 col-12">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={overallProgressHistogramData}
                        margin={{ top: 8, right: 8, left: 8, bottom: 28 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="opacity-25" />
                        <XAxis
                          dataKey="range"
                          tick={{ fontSize: 10 }}
                          label={{
                            value: overallDistXAxisLabel,
                            position: 'insideBottom',
                            offset: -8,
                            style: { fontSize: 12 },
                          }}
                        />
                        <YAxis
                          allowDecimals={false}
                          domain={[0, 'auto']}
                          label={{
                            value: 'Residents',
                            angle: -90,
                            position: 'insideLeft',
                            style: { fontSize: 12, textAnchor: 'middle' },
                          }}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const count = Number(payload[0]?.value ?? 0);
                            return (
                              <div className="small bg-white border rounded shadow-sm px-2 py-1">
                                {count} resident{count === 1 ? '' : 's'} in this range
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {overallProgressHistogramData.map((entry) => (
                            <Cell
                              key={entry.range}
                              fill={bucketMidpointFill(
                                entry.midpoint,
                                bsMlBarColors.success,
                                bsMlBarColors.warning,
                                bsMlBarColors.danger
                              )}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="col-md-4 col-12">
                    <div className="d-flex flex-column justify-content-center h-100 gap-3">
                      <div className="bg-light border-0 rounded p-3">
                        <div className="small text-muted mb-1">Mean / Average</div>
                        <div
                          className={`fs-2 fw-bold ${overallProgressStats.meanClass}`}
                        >
                          {overallProgressStats.mean != null
                            ? `${overallProgressStats.mean.toFixed(1)}%`
                            : '—'}
                        </div>
                      </div>
                      <div className="bg-light border-0 rounded p-3">
                        <div className="small text-muted mb-1">Median</div>
                        <div
                          className={`fs-2 fw-bold ${overallProgressStats.medianClass}`}
                        >
                          {overallProgressStats.median != null
                            ? `${overallProgressStats.median.toFixed(1)}%`
                            : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {modelMeta ? (
            <>
              <h5
                className="fw-semibold border-start border-4 ps-3 mb-2"
                style={{ borderColor: THEME_BLUE }}
              >
                What Drives High-Severity Incidents?
              </h5>
              {incidentFactors.length === 0 ? null : (
                <>
                  <ResponsiveContainer width="100%" height={Math.max(200, incidentFactors.length * 36)}>
                    <BarChart
                      layout="vertical"
                      data={incidentFactors}
                      margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="opacity-25" />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <YAxis type="category" dataKey="label" width={200} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v) => [`${v}%`, 'Importance']}
                        itemStyle={{ color: '#000' }}
                        labelStyle={{ color: '#000' }}
                      />
                      <Bar dataKey="importance" fill={THEME_BLUE} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}

              {(reintRefClasses.length > 0 ||
                reintFeatures.longer.length > 0 ||
                reintFeatures.shorter.length > 0) && (
                <>
                  <hr className="my-4" />

                  <h5
                    className="fw-semibold border-start border-4 ps-3 mt-4 mb-2"
                    style={{ borderColor: THEME_BLUE }}
                  >
                    What Predicts How Long a Resident Stays
                  </h5>
                  <p className="small text-muted mb-3">
                    Based on historical data, these factors are associated with
                    a large impact of a girl's stay at a safehouse.
                  </p>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <h6 className="small fw-semibold text-success d-flex align-items-center gap-1 mb-2">
                        <span aria-hidden>↑</span> Tends toward longer stays
                      </h6>
                      {reintFeatures.longer.length === 0 ? (
                        <p className="small text-muted mb-0">None listed.</p>
                      ) : (
                        reintFeatures.longer.map((f) => (
                          <div key={f.key} className="card shadow-sm mb-2">
                            <div className="card-body py-2 px-3">
                              <div className="small fw-semibold mb-1">{f.label}</div>
                              <div className="fs-2 fw-bold text-success">
                                +{f.days.toFixed(0)} days on average
                              </div>
                              {f.significant && (
                                <div className="mt-2">
                                  <span className="badge bg-success">Statistically significant ✓</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="col-md-6">
                      <h6 className="small fw-semibold text-danger d-flex align-items-center gap-1 mb-2">
                        <span aria-hidden>↓</span> Tends toward shorter stays
                      </h6>
                      {reintFeatures.shorter.length === 0 ? (
                        <p className="small text-muted mb-0">None listed.</p>
                      ) : (
                        reintFeatures.shorter.map((f) => (
                          <div key={f.key} className="card shadow-sm mb-2">
                            <div className="card-body py-2 px-3">
                              <div className="small fw-semibold mb-1">{f.label}</div>
                              <div className="fs-2 fw-bold text-danger">
                                -{f.days.toFixed(0)} days on average
                              </div>
                              {f.significant && (
                                <div className="mt-2">
                                  <span className="badge bg-success">Statistically significant ✓</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <h6 className="fw-semibold mt-4 mb-2">Reference classes by pathway</h6>
                  <p className="small text-muted mb-2">
                    Typical length of stay (in months) for completed cases, grouped by reintegration
                    pathway.
                  </p>
                  <div className="table-responsive mb-4">
                    <table className="table table-sm">
                      <thead style={{ backgroundColor: 'var(--panel)' }}>
                        <tr>
                          <th>Pathway</th>
                          <th className="text-end">Avg stay (months)</th>
                          <th className="text-end">Cases</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reintRefClasses.map((r) => (
                          <tr key={r.pathway}>
                            <td>{r.pathway}</td>
                            <td className="text-end">{r.avgMonths.toFixed(1)}</td>
                            <td className="text-end">{r.cases}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h6 className="fw-semibold mb-2">Reintegration timeline insights</h6>
                  {reintMetaBlock.sample_size_warning != null &&
                    String(reintMetaBlock.sample_size_warning).length > 0 && (
                      <div
                        className="alert"
                        role="alert"
                        style={{
                          backgroundColor: 'var(--surface-warm)',
                          borderColor: THEME_TAN,
                          color: 'var(--text)',
                        }}
                      >
                        {String(reintMetaBlock.sample_size_warning)}
                      </div>
                    )}

                  <hr className="my-4" />
                </>
              )}

              <h5
                className="fw-semibold border-start border-4 ps-3 mb-2"
                style={{ borderColor: THEME_BLUE }}
              >
                What Social Media Content Leads to More Donor Referrals?
              </h5>
              <p className="small text-muted mb-3">
                These suggestions are derived from how past posts line up with donor-referral
                outcomes. They highlight content choices—tone, topics, calls to action, and more—that
                tended to coincide with more referrals, to prioritize what to try by
                platform.
              </p>
              {socialPlatformKeys.length === 0 ? (
                <p className="small text-muted mb-0">
                  No social media data is available for this analysis yet.
                </p>
              ) : (
                <>
                  <ul className="nav nav-tabs flex-wrap mb-3">
                    {socialPlatformKeys.map((p) => (
                      <li className="nav-item" key={p}>
                        <button
                          type="button"
                          className={`nav-link ${socialTab === p ? 'active' : ''}`}
                          onClick={() => setSocialTab(p)}
                        >
                          {p}
                        </button>
                      </li>
                    ))}
                  </ul>
                  {(() => {
                    const row = socialPlatforms[socialTab] as
                      | {
                          platform?: string;
                          based_on_posts?: number;
                          recommendations?: Record<string, unknown>;
                        }
                      | undefined;
                    if (!row) return null;
                    const rec = row.recommendations ?? {};
                    const lines: string[] = [];
                    if (rec.boost_post === true) lines.push('✓ Boost this post');
                    if (rec.feature_resident_story === true) lines.push('✓ Feature a resident story');
                    const tone = rec.sentiment_tone;
                    if (tone != null && tone !== false && `${tone}`.trim() !== '') {
                      lines.push(`Tone: ${String(tone)}`);
                    }
                    const cta = rec.call_to_action;
                    if (cta != null && `${cta}`.trim() !== '') {
                      lines.push(`Call to action: ${String(cta)}`);
                    }
                    const day = rec.best_day_to_post;
                    if (day != null && `${day}`.trim() !== '') {
                      lines.push(`Best day to post: ${String(day)}`);
                    }
                    const topic = rec.content_topic;
                    if (topic != null && `${topic}`.trim() !== '') {
                      lines.push(`Content topic: ${String(topic)}`);
                    }
                    return (
                      <div className="card shadow-sm">
                        <div className="card-body">
                          <h6 className="fw-semibold mb-3">{row.platform ?? socialTab}</h6>
                          {lines.length === 0 ? (
                            <p className="small text-muted mb-0">No recommendation items for this platform.</p>
                          ) : (
                            <ul className="small mb-0 ps-3">
                              {lines.map((line, idx) => (
                                <li key={`${socialTab}-${idx}`} className="mb-1">
                                  {line}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </>
          ) : null}
        </div>
      </div>
      </>
      )}

      {reportsTab === 'reports' && (
      <>
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label small text-muted">Start date</label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(ev) => setStartDate(ev.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small text-muted">End date</label>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(ev) => setEndDate(ev.target.value)}
              />
            </div>
            <div className="col-md-6">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="includeClosed"
                  checked={includeClosed}
                  onChange={(ev) => setIncludeClosed(ev.target.checked)}
                />
                <label className="form-check-label" htmlFor="includeClosed">
                  Include closed cases in resident-derived counts
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 1 — Resident outcomes */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h2
              className="h5 fw-bold border-start border-4 ps-3 mb-0"
              style={{ borderColor: THEME_BLUE }}
            >
              Resident outcomes
            </h2>
            <button
              type="button"
              className="btn btn-sm"
              style={{ borderColor: THEME_BLUE, color: THEME_BLUE }}
              onClick={() =>
                downloadCsv('reports-resident-outcomes.csv', [
                  {
                    activeResidents: activeFilteredCount,
                    riskDonutTotal,
                  },
                  ...riskDonutData.map((d) => ({ riskLevel: d.name, count: d.value })),
                  ...breakdownBySafehouse.map((b) => ({
                    safehouse: b.label,
                    count: b.count,
                  })),
                  ...reintegrationRows.map((r) => ({
                    pathway: r.reintegrationType,
                    completed: r.completed,
                    total: r.total,
                    pct: r.pct,
                  })),
                ])
              }
            >
              Export CSV
            </button>
          </div>

          <div className="row">
            <div className="col-lg-5 mb-4 mb-lg-0">
              <p className="text-muted small mb-2">
                Active residents (filtered):{' '}
                <strong className="text-body">{activeFilteredCount}</strong>
              </p>
              {riskDonutData.length === 0 ? (
                <p className="text-muted">No risk distribution data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={riskDonutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="48%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={2}
                    >
                      {riskDonutData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={RISK_FILL[entry.name] ?? THEME_NEUTRAL}
                        />
                      ))}
                    </Pie>
                    <Tooltip itemStyle={{ color: '#000' }} labelStyle={{ color: '#000' }} />
                    <Legend formatter={(value) => <span style={{ color: '#000' }}>{value}</span>} />
                    <text
                      x="50%"
                      y="46%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fw-bold"
                      fill="currentColor"
                      fontSize={22}
                    >
                      {riskDonutTotal}
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="col-lg-7">
              <h6 className="fw-semibold mb-2">Residents by safehouse</h6>
              <div className="table-responsive">
                <table className="table table-sm table-hover">
                  <thead style={{ backgroundColor: 'var(--panel)' }}>
                    <tr>
                      <th>Safehouse</th>
                      <th className="text-end">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdownBySafehouse.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="text-muted">
                          No residents in range.
                        </td>
                      </tr>
                    ) : (
                      breakdownBySafehouse.map((b) => (
                        <tr key={b.safehouseId}>
                          <td>{b.label}</td>
                          <td className="text-end">{b.count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <h6 className="fw-semibold mt-4 mb-2">Reintegration success</h6>
              <div className="table-responsive">
                <table className="table table-sm table-hover">
                  <thead style={{ backgroundColor: 'var(--panel)' }}>
                    <tr>
                      <th>Pathway</th>
                      <th className="text-end">Completed</th>
                      <th className="text-end">Total</th>
                      <th className="text-end">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reintegrationRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-muted">
                          No reintegration data.
                        </td>
                      </tr>
                    ) : (
                      reintegrationRows.map((r) => (
                        <tr key={r.reintegrationType}>
                          <td>{r.reintegrationType}</td>
                          <td className="text-end">{r.completed}</td>
                          <td className="text-end">{r.total}</td>
                          <td className="text-end">{r.pct}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3 */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h2
              className="h5 fw-bold border-start border-4 ps-3 mb-0"
              style={{ borderColor: THEME_BLUE }}
            >
              Services provided
            </h2>
            <button
              type="button"
              className="btn btn-sm"
              style={{ borderColor: THEME_BLUE, color: THEME_BLUE }}
              onClick={() =>
                downloadCsv('reports-services-provided.csv', [
                  {
                    category: 'Caring',
                    count: servicesProvided?.caring ?? '',
                    description: 'Home visitations recorded',
                  },
                  {
                    category: 'Healing',
                    count: servicesProvided?.healing ?? '',
                    description: 'Process recordings (includes counseling sessions)',
                  },
                  {
                    category: 'Teaching',
                    count: servicesProvided?.teaching ?? '',
                    description: 'Education records',
                  },
                  {
                    category: 'Legal referrals',
                    count: servicesProvided?.legalReferrals ?? '',
                  },
                  {
                    category: 'Legal intervention plans',
                    count: servicesProvided?.legalPlans ?? '',
                  },
                ])
              }
            >
              Export CSV
            </button>
          </div>
          <div className="row g-3">
            <div className="col-md-6">
              <div className="border rounded p-3 h-100" style={{ backgroundColor: 'var(--panel)' }}>
                <div className="display-6 fw-bold" style={{ color: THEME_BLUE }}>
                  {servicesProvided?.caring ?? '—'}
                </div>
                <div className="fw-semibold">Caring</div>
                <p className="small text-muted mb-0 mt-1">
                  Home visitations recorded in the system.
                </p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="border rounded p-3 h-100" style={{ backgroundColor: 'var(--panel)' }}>
                <div className="display-6 fw-bold" style={{ color: THEME_BLUE }}>
                  {servicesProvided?.healing ?? '—'}
                </div>
                <div className="fw-semibold">Healing</div>
                <p className="small text-muted mb-0 mt-1">
                  Process recordings (counseling and related sessions roll up here).
                </p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="border rounded p-3 h-100" style={{ backgroundColor: 'var(--panel)' }}>
                <div className="display-6 fw-bold" style={{ color: THEME_BLUE }}>
                  {servicesProvided?.teaching ?? '—'}
                </div>
                <div className="fw-semibold">Teaching</div>
                <p className="small text-muted mb-0 mt-1">Education records.</p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="border rounded p-3 h-100" style={{ backgroundColor: 'var(--panel)' }}>
                <div className="fs-4 fw-bold" style={{ color: THEME_BLUE }}>
                  <span>{servicesProvided?.legalReferrals ?? '—'}</span>
                  <span className="text-muted fw-normal"> + </span>
                  <span>{servicesProvided?.legalPlans ?? '—'}</span>
                </div>
                <div className="fw-semibold">Legal services</div>
                <p className="small text-muted mb-0 mt-1">
                  Legal referrals (from process recordings) plus legal-category intervention
                  plans.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4 */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h2
              className="h5 fw-bold border-start border-4 ps-3 mb-0"
              style={{ borderColor: THEME_BLUE }}
            >
              Safehouse performance comparison
            </h2>
            <button
              type="button"
              className="btn btn-sm"
              style={{ borderColor: THEME_BLUE, color: THEME_BLUE }}
              onClick={() =>
                downloadCsv(
                  'reports-safehouse-comparison.csv',
                  comparisonRowsScoped.map((r) => ({
                    safehouse: r.label,
                    avgActiveResidents: r.avgActiveResidents,
                    avgEducationProgress: r.avgEducationProgress,
                    avgHealthScore: r.avgHealthScore,
                    totalIncidents: r.totalIncidents,
                    totalProcessRecordings: r.totalProcessRecordings,
                    totalHomeVisitations: r.totalHomeVisitations,
                    occupancyPct: r.occupancyPct ?? '',
                  }))
                )
              }
            >
              Export CSV
            </button>
          </div>

          <div className="table-responsive mb-4">
            <table className="table table-sm table-hover align-middle">
              <thead style={{ backgroundColor: 'var(--panel)' }}>
                <tr>
                  <th>Safehouse</th>
                  <th className="text-end">Active res. (avg)</th>
                  <th className="text-end">Avg educ. %</th>
                  <th className="text-end">Avg health</th>
                  <th className="text-end">Incidents</th>
                  <th className="text-end">Process rec.</th>
                  <th className="text-end">Home visits</th>
                  <th className="text-end">Occupancy %</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRowsScoped.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-muted">
                      No comparison data.
                    </td>
                  </tr>
                ) : (
                  comparisonRowsScoped.map((r) => (
                    <tr key={r.safehouseId}>
                      <td>{r.label}</td>
                      <td className="text-end">{r.avgActiveResidents}</td>
                      <td className="text-end">{r.avgEducationProgress}</td>
                      <td className="text-end">{r.avgHealthScore}</td>
                      <td className="text-end">{r.totalIncidents}</td>
                      <td className="text-end">{r.totalProcessRecordings}</td>
                      <td className="text-end">{r.totalHomeVisitations}</td>
                      <td className="text-end">
                        {r.occupancyPct != null ? `${r.occupancyPct}%` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {safehouseMetricBarData.length > 0 && (
            <>
              <div className="dashboard-subnav border-bottom mb-2 pb-1">
                <ul className="nav nav-pills flex-wrap gap-1 small">
                  {(
                    [
                      ['health', 'Health'],
                      ['education', 'Education'],
                      ['emotional', 'Emotional'],
                      ['overall', 'Overall'],
                    ] as const
                  ).map(([key, label]) => (
                    <li className="nav-item" key={key}>
                      <button
                        type="button"
                        className="nav-link py-1 px-2"
                        style={
                          safehouseMetricTab === key
                            ? {
                                backgroundColor: THEME_BLUE,
                                borderColor: THEME_BLUE,
                                color: '#fff',
                              }
                            : {
                                color: THEME_BLUE,
                                border: '1px solid var(--blue)',
                                backgroundColor: '#fff',
                              }
                        }
                        onClick={() => setSafehouseMetricTab(key)}
                      >
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <h6 className="fw-semibold mb-1">
                {SAFEHOUSE_METRIC_TITLES[safehouseMetricTab]}
              </h6>
              <p className="small text-muted mb-2">
                {SAFEHOUSE_METRIC_HINTS[safehouseMetricTab]}
              </p>
              <ResponsiveContainer
                width="100%"
                height={Math.max(280, safehouseMetricBarData.length * 36)}
              >
                <BarChart
                  layout="vertical"
                  data={safehouseMetricBarData}
                  margin={{ left: 8, right: 56, top: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-25" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => [`${v}%`, 'Score']}
                    itemStyle={{ color: '#000' }}
                    labelStyle={{ color: '#000' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {safehouseMetricBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                    <LabelList
                      dataKey="value"
                      position="right"
                      formatter={(v) => `${v}%`}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      </div>

      {/* Section 5 */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h2
              className="h5 fw-bold border-start border-4 ps-3 mb-0"
              style={{ borderColor: THEME_BLUE }}
            >
              Donation trends
            </h2>
            <span className="small text-muted">
              Organization-wide
            </span>
          </div>

          <div className="row">
            <div className="col-12 mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Top campaigns</h6>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ borderColor: THEME_BLUE, color: THEME_BLUE }}
                  onClick={() =>
                    downloadCsv(
                      'reports-donations-campaigns.csv',
                      campaignsFilteredSorted.map((c) => ({
                        campaign: c.campaign,
                        totalValue: c.totalValue,
                        count: c.count,
                      }))
                    )
                  }
                >
                  Export CSV
                </button>
              </div>
              {campaignsFilteredSorted.length === 0 ? (
                <p className="text-muted small">No campaign data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    layout="vertical"
                    data={campaignsFilteredSorted.slice(0, 12)}
                    margin={{ left: 8, right: 24, top: 8, bottom: 28 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-25" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => formatPhpAmount(Number(v))}
                      label={{
                        value: 'Total donation amount (₱)',
                        position: 'insideBottom',
                        offset: -4,
                        style: { fontSize: 12, fill: THEME_NEUTRAL },
                      }}
                    />
                    <YAxis
                      type="category"
                      dataKey="campaign"
                      width={140}
                      tick={{ fontSize: 10 }}
                      label={{
                        value: 'Campaign',
                        angle: -90,
                        position: 'insideLeft',
                        style: { fontSize: 12, fill: THEME_NEUTRAL },
                      }}
                    />
                    <Tooltip
                      formatter={(v) => [formatPhpAmount(Number(v)), 'Total raised']}
                      labelFormatter={(name) => String(name)}
                      itemStyle={{ color: '#000' }}
                      labelStyle={{ color: '#000' }}
                    />
                    <Bar dataKey="totalValue" fill={THEME_BLUE} name="Total raised" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="col-lg-6 mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Recurring vs one-time donors</h6>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ borderColor: THEME_BLUE, color: THEME_BLUE }}
                  onClick={() => downloadCsv('reports-donors-type.csv', donorDonutData)}
                >
                  Export CSV
                </button>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={donorDonutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={88}
                    label
                  >
                    {donorDonutData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === 0 ? THEME_BLUE : THEME_NEUTRAL}
                      />
                    ))}
                  </Pie>
                  <Tooltip itemStyle={{ color: '#000' }} labelStyle={{ color: '#000' }} />
                  <Legend formatter={(value) => <span style={{ color: '#000' }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="col-lg-6 mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Donation Allocations by Program Area (₱)</h6>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ borderColor: THEME_BLUE, color: THEME_BLUE }}
                  onClick={() =>
                    downloadCsv(
                      'reports-allocations-program.csv',
                      allocationsBarData.map((p) => ({
                        programArea: p.name,
                        amountAllocated: p.value,
                      }))
                    )
                  }
                >
                  Export CSV
                </button>
              </div>
              {allocationsBarData.length === 0 ? (
                <p className="text-muted small">No allocation data.</p>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(260, allocationsBarData.length * 40)}
                >
                  <BarChart
                    layout="vertical"
                    data={allocationsBarData}
                    margin={{ left: 8, right: 88, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-25" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => formatPhpAmount(Number(v))}
                    />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(v) => [formatPhpAmount(Number(v)), 'Allocated']}
                      itemStyle={{ color: '#000' }}
                      labelStyle={{ color: '#000' }}
                    />
                    <Bar dataKey="value" fill={THEME_BLUE} radius={[0, 4, 4, 0]}>
                      <LabelList
                        dataKey="value"
                        position="right"
                        formatter={(v) => formatPhpAmount(Number(v))}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
