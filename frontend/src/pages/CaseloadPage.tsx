import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { apiFetch } from '../api/apiHelper';
import { useAuth } from '../context/AuthContext';
import FormHistoryList from '../components/FormHistoryList';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Resident {
  residentId: number;
  caseControlNo: string;
  internalCode: string;
  safehouseId: number;
  caseStatus: string;
  sex: string;
  dateOfBirth: string;
  presentAge: string;
  caseCategory: string;
  currentRiskLevel: string | null;
  initialRiskLevel: string | null;
  assignedSocialWorker: string | null;
  reintegrationType: string | null;
  reintegrationStatus: string | null;
  dateOfAdmission: string;
  lengthOfStay: string;
  placeOfBirth: string;
  religion: string;
  referralSource: string | null;
  isPwd: boolean;
  pwdType: string | null;
  hasSpecialNeeds: boolean;
  specialNeedsDiagnosis: string | null;
  familyIs4ps: boolean;
  familySoloParent: boolean;
  familyIndigenous: boolean;
  familyParentPwd: boolean;
  familyInformalSettler: boolean;
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
  predictedAt: string;
  modelVersion: string;
}

interface ResidentIncidentRisk {
  residentId: number;
  riskTier: string;
  topRiskFactors: string[];
  scoredAt: string;
}

interface Safehouse {
  safehouseId: number;
  name: string;
  city: string;
  region: string;
  status: string;
}

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

interface ReintegrationRef {
  avg_months: number;
  n_cases: number;
  low_n_warning: boolean;
}

interface CaseloadData {
  residents: Resident[];
  safehouses: Safehouse[];
  predictions: Map<number, ResidentPrediction>;
  incidentRisks: Map<number, ResidentIncidentRisk>;
  reintegrationRefs: Record<string, ReintegrationRef> | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RISK_ORDER: Record<string, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const TIER_ORDER: Record<string, number> = {
  'High Alert': 3,
  'Monitor Closely': 2,
  Stable: 1,
};

const RISK_BADGE: Record<string, string> = {
  Low: 'bg-success',
  Medium: 'bg-warning text-dark',
  High: 'bg-orange',
  Critical: 'bg-danger',
};

const TIER_BADGE: Record<string, string> = {
  Stable: 'bg-success',
  'Monitor Closely': 'bg-warning text-dark',
  'High Alert': 'bg-danger',
};

const STATUS_BADGE: Record<string, string> = {
  Active: 'bg-success',
  Transferred: 'bg-primary',
  Closed: 'bg-secondary',
};

type SortCol =
  | 'internalCode'
  | 'presentAge'
  | 'caseCategory'
  | 'currentRiskLevel'
  | 'riskTier'
  | 'overallScore'
  | 'caseStatus'
  | 'assignedSocialWorker';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pctColor(val: number): string {
  if (val >= 65) return 'text-success';
  if (val >= 40) return 'text-warning';
  return 'text-danger';
}

function barColor(val: number): string {
  if (val >= 65) return 'bg-success';
  if (val >= 40) return 'bg-warning';
  return 'bg-danger';
}

function bandLabel(val: number): string {
  if (val >= 65) return 'Likely Improving';
  if (val >= 40) return 'Uncertain';
  return 'Needs Attention';
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-muted">—</span>;
  return (
    <span
      className={`badge ${RISK_BADGE[level] ?? 'bg-secondary'}`}
      style={level === 'High' ? { backgroundColor: '#fd7e14', color: '#fff' } : undefined}
    >
      {level}
    </span>
  );
}

function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return <span className="text-muted">—</span>;
  return (
    <span className={`badge ${TIER_BADGE[tier] ?? 'bg-secondary'}`}>{tier}</span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_BADGE[status] ?? 'bg-secondary'}`}>
      {status}
    </span>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({
  statusFilter,
  setStatusFilter,
  riskFilter,
  setRiskFilter,
  tierFilter,
  setTierFilter,
  searchTerm,
  setSearchTerm,
  onClearFilters,
  filtersAreDefault,
}: {
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  riskFilter: string;
  setRiskFilter: (v: string) => void;
  tierFilter: string;
  setTierFilter: (v: string) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  onClearFilters: () => void;
  filtersAreDefault: boolean;
}) {
  return (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
      <div className="d-flex flex-wrap align-items-center gap-2">
        <select
          className="form-select form-select-sm"
          style={{ width: 'auto', minWidth: 140 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="active_transferred">Active + Transferred</option>
          <option value="Active">Active Only</option>
          <option value="Transferred">Transferred Only</option>
          <option value="Closed">Closed Only</option>
          <option value="all">All Statuses</option>
        </select>
        <select
          className="form-select form-select-sm"
          style={{ width: 'auto', minWidth: 120 }}
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
        >
          <option value="all">All Risk Levels</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
        <select
          className="form-select form-select-sm"
          style={{ width: 'auto', minWidth: 140 }}
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
        >
          <option value="all">All Incident Tiers</option>
          <option value="Stable">Stable</option>
          <option value="Monitor Closely">Monitor Closely</option>
          <option value="High Alert">High Alert</option>
        </select>
        <input
          type="text"
          className="form-control form-control-sm"
          style={{ width: 'auto', minWidth: 160 }}
          placeholder="Search by code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm flex-shrink-0"
        onClick={onClearFilters}
        disabled={filtersAreDefault}
      >
        Clear filters
      </button>
    </div>
  );
}

// ─── Resident Table ───────────────────────────────────────────────────────────

function ResidentTable({
  residents,
  predictions,
  incidentRisks,
  selectedId,
  onSelect,
  hideWorker,
  sortCol,
  sortDir,
  onSort,
}: {
  residents: Resident[];
  predictions: Map<number, ResidentPrediction>;
  incidentRisks: Map<number, ResidentIncidentRisk>;
  selectedId: number | null;
  onSelect: (id: number) => void;
  hideWorker: boolean;
  sortCol: SortCol;
  sortDir: 'asc' | 'desc';
  onSort: (col: SortCol) => void;
}) {
  const arrow = (col: SortCol) =>
    sortCol === col ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  if (residents.length === 0) {
    return <p className="text-muted py-3">No residents match the current filters.</p>;
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover table-sm align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th style={{ cursor: 'pointer' }} onClick={() => onSort('internalCode')}>
              Code{arrow('internalCode')}
            </th>
            <th style={{ cursor: 'pointer' }} onClick={() => onSort('presentAge')}>
              Age{arrow('presentAge')}
            </th>
            <th style={{ cursor: 'pointer' }} onClick={() => onSort('caseCategory')}>
              Category{arrow('caseCategory')}
            </th>
            <th style={{ cursor: 'pointer' }} onClick={() => onSort('currentRiskLevel')}>
              Risk Level{arrow('currentRiskLevel')}
            </th>
            <th style={{ cursor: 'pointer' }} onClick={() => onSort('riskTier')}>
              Incident Risk{arrow('riskTier')}
            </th>
            <th style={{ cursor: 'pointer' }} onClick={() => onSort('overallScore')}>
              Overall Progress{arrow('overallScore')}
            </th>
            <th style={{ cursor: 'pointer' }} onClick={() => onSort('caseStatus')}>
              Status{arrow('caseStatus')}
            </th>
            {!hideWorker && (
              <th
                style={{ cursor: 'pointer' }}
                onClick={() => onSort('assignedSocialWorker')}
              >
                Worker{arrow('assignedSocialWorker')}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {residents.map((r) => {
            const pred = predictions.get(r.residentId);
            const risk = incidentRisks.get(r.residentId);
            const overall =
              pred?.overallScore != null
                ? Math.round(pred.overallScore * 100)
                : null;
            return (
              <tr
                key={r.residentId}
                onClick={() => onSelect(r.residentId)}
                style={{
                  cursor: 'pointer',
                  backgroundColor:
                    selectedId === r.residentId
                      ? 'rgba(13,110,253,0.08)'
                      : undefined,
                }}
              >
                <td className="fw-semibold">{r.internalCode}</td>
                <td>{r.presentAge}</td>
                <td>{r.caseCategory}</td>
                <td>
                  <RiskBadge level={r.currentRiskLevel} />
                </td>
                <td>
                  <TierBadge tier={risk?.riskTier ?? null} />
                </td>
                <td>
                  {overall != null ? (
                    <span className={`fw-bold ${pctColor(overall)}`}>
                      {overall}%
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>
                  <StatusBadge status={r.caseStatus} />
                </td>
                {!hideWorker && <td>{r.assignedSocialWorker ?? '—'}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  resident,
  prediction,
  incidentRisk,
  safehouses,
  reintegrationRefs,
  onClose,
  onEdit,
}: {
  resident: Resident;
  prediction: ResidentPrediction | undefined;
  incidentRisk: ResidentIncidentRisk | undefined;
  safehouses: Safehouse[];
  reintegrationRefs: Record<string, ReintegrationRef> | null;
  onClose: () => void;
  onEdit?: () => void;
}) {
  const [showFamily, setShowFamily] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const subCats: { key: keyof Resident; label: string }[] = [
    { key: 'subCatTrafficked', label: 'Trafficked' },
    { key: 'subCatChildLabor', label: 'Child Labor' },
    { key: 'subCatPhysicalAbuse', label: 'Physical Abuse' },
    { key: 'subCatSexualAbuse', label: 'Sexual Abuse' },
    { key: 'subCatOsaec', label: 'OSAEC' },
    { key: 'subCatCicl', label: 'CICL' },
    { key: 'subCatAtRisk', label: 'At Risk' },
    { key: 'subCatStreetChild', label: 'Street Child' },
    { key: 'subCatChildWithHiv', label: 'Child with HIV' },
  ];
  const activeSubCats = subCats.filter((s) => resident[s.key] === true);

  // Progress bars for Section D
  function ProgressRow({
    label,
    prob,
    tag,
  }: {
    label: string;
    prob: number | null;
    tag?: string | null;
  }) {
    if (tag === 'Already High — Stable') {
      return (
        <div className="mb-2">
          <div className="d-flex justify-content-between">
            <small className="fw-semibold">{label}</small>
            <small className="text-success">Already High — Stable</small>
          </div>
          <div className="progress" style={{ height: 8 }}>
            <div
              className="progress-bar bg-success"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      );
    }
    if (prob == null) {
      return (
        <div className="mb-2">
          <div className="d-flex justify-content-between">
            <small className="fw-semibold">{label}</small>
            <small className="text-muted">Insufficient Data</small>
          </div>
        </div>
      );
    }
    const pct = Math.round(prob * 100);
    return (
      <div className="mb-2">
        <div className="d-flex justify-content-between">
          <small className="fw-semibold">{label}</small>
          <small className={pctColor(pct)}>
            {pct}% — {bandLabel(pct)}
          </small>
        </div>
        <div className="progress" style={{ height: 8 }}>
          <div
            className={`progress-bar ${barColor(pct)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  // Reintegration timeline (Section G)
  let reintEl: React.ReactNode = null;
  if (reintegrationRefs && resident.reintegrationType) {
    const ref = reintegrationRefs[resident.reintegrationType];
    if (ref) {
      reintEl = (
        <div className="mb-3">
          <h6 className="fw-bold border-bottom pb-1">
            Reintegration Timeline Estimate
          </h6>
          <p className="mb-0">
            Residents on the <strong>{resident.reintegrationType}</strong>{' '}
            pathway have stayed an average of{' '}
            <strong>{ref.avg_months.toFixed(1)} months</strong> (based on{' '}
            {ref.n_cases} completed case{ref.n_cases !== 1 ? 's' : ''}).
            {ref.low_n_warning && (
              <span className="text-muted">
                {' '}— few past cases, treat as rough estimate
              </span>
            )}
          </p>
        </div>
      );
    } else {
      reintEl = (
        <div className="mb-3">
          <h6 className="fw-bold border-bottom pb-1">
            Reintegration Timeline Estimate
          </h6>
          <p className="text-muted mb-0">No pathway data available.</p>
        </div>
      );
    }
  } else if (!resident.reintegrationType) {
    reintEl = (
      <div className="mb-3">
        <h6 className="fw-bold border-bottom pb-1">
          Reintegration Timeline Estimate
        </h6>
        <p className="text-muted mb-0">No pathway assigned yet.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 420,
        height: '100vh',
        backgroundColor: '#fff',
        boxShadow: '-4px 0 16px rgba(0,0,0,0.1)',
        overflowY: 'auto',
        zIndex: 1050,
        transition: 'transform 0.25s ease',
      }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-3">
          <h5 className="fw-bold mb-0">{resident.internalCode}</h5>
          <div className="d-flex align-items-center gap-2">
            {onEdit && (
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={onEdit}
              >
                Edit
              </button>
            )}
            <button
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            />
          </div>
        </div>

        {/* Section A: Identity Header */}
        <div className="mb-3">
          <div className="d-flex flex-wrap gap-2 mb-1">
            <StatusBadge status={resident.caseStatus} />
            <span className="badge bg-light text-dark border">
              {safehouseCityLabel(safehouses, resident.safehouseId)}
            </span>
            {resident.assignedSocialWorker && (
              <span className="badge bg-light text-dark border">
                {resident.assignedSocialWorker}
              </span>
            )}
          </div>
          <small className="text-muted d-block">
            Case Control No: {resident.caseControlNo}
          </small>
          <small className="text-muted d-block">
            Age: {resident.presentAge} | Admitted:{' '}
            {formatDate(resident.dateOfAdmission)}
          </small>
          <small className="text-muted d-block">
            Length of Stay: {resident.lengthOfStay}
          </small>
        </div>

        {/* Section B: Case Classification */}
        <div className="mb-3">
          <h6 className="fw-bold border-bottom pb-1">Case Classification</h6>
          <div className="mb-1">
            <small className="text-muted">Category:</small>{' '}
            <span className="fw-semibold">{resident.caseCategory}</span>
          </div>
          {activeSubCats.length > 0 && (
            <div className="mb-1">
              <small className="text-muted d-block mb-1">Sub-Categories:</small>
              <div className="d-flex flex-wrap gap-1">
                {activeSubCats.map((s) => (
                  <span key={s.key} className="badge bg-secondary">
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="mb-1">
            <small className="text-muted">Special Needs:</small>{' '}
            {resident.hasSpecialNeeds ? (
              <span>Yes — {resident.specialNeedsDiagnosis ?? 'Unspecified'}</span>
            ) : (
              <span>None</span>
            )}
          </div>
          <div>
            <small className="text-muted">PWD:</small>{' '}
            {resident.isPwd ? (
              <span>Yes{resident.pwdType ? ` — ${resident.pwdType}` : ''}</span>
            ) : (
              <span>No</span>
            )}
          </div>
        </div>

        {/* Section C: Risk & Reintegration */}
        <div className="mb-3">
          <h6 className="fw-bold border-bottom pb-1">Risk & Reintegration</h6>
          <div className="d-flex justify-content-between mb-1">
            <small className="text-muted">Initial Risk Level:</small>
            <RiskBadge level={resident.initialRiskLevel} />
          </div>
          <div className="d-flex justify-content-between mb-1">
            <small className="text-muted">Current Risk Level:</small>
            <RiskBadge level={resident.currentRiskLevel} />
          </div>
          <div className="d-flex justify-content-between mb-1">
            <small className="text-muted">Reintegration Type:</small>
            <span>{resident.reintegrationType ?? '—'}</span>
          </div>
          <div className="d-flex justify-content-between">
            <small className="text-muted">Reintegration Status:</small>
            <span>
              {resident.reintegrationStatus ? (
                <span className="badge bg-info text-dark">
                  {resident.reintegrationStatus}
                </span>
              ) : (
                '—'
              )}
            </span>
          </div>
        </div>

        {/* Section D: 60-Day Progress Forecast */}
        <div className="mb-3">
          <h6 className="fw-bold border-bottom pb-1">60-Day Progress Forecast</h6>
          <small className="text-muted d-block mb-2">
            Updated daily at 5:00am PST
          </small>
          {prediction ? (
            <>
              <ProgressRow
                label="Health Progress"
                prob={prediction.healthProb}
                tag={prediction.healthTag}
              />
              <ProgressRow
                label="Education Progress"
                prob={prediction.educationProb}
              />
              <ProgressRow
                label="Emotional Progress"
                prob={prediction.emotionalProb}
              />
              <ProgressRow
                label="Overall Score"
                prob={prediction.overallScore}
              />
            </>
          ) : (
            <p className="text-muted mb-0">
              Predictions not yet available for this resident.
            </p>
          )}
        </div>

        {/* Section E: Incident Risk Assessment */}
        <div className="mb-3">
          <h6 className="fw-bold border-bottom pb-1">
            Incident Risk Assessment
          </h6>
          <small className="text-muted d-block mb-2">
            Based on this resident's history — assessed daily
          </small>
          {incidentRisk ? (
            <>
              <div className="d-flex justify-content-between mb-2">
                <small className="text-muted">Risk Level:</small>
                <TierBadge tier={incidentRisk.riskTier} />
              </div>
              {incidentRisk.topRiskFactors.length > 0 && (
                <div>
                  <small className="text-muted d-block mb-1">
                    Top contributing factors:
                  </small>
                  <ul className="mb-0 ps-3" style={{ fontSize: '0.85rem' }}>
                    {incidentRisk.topRiskFactors.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted mb-0">
              Risk assessment not yet available.
            </p>
          )}
        </div>

        {/* Section F: Family & Background (collapsible) */}
        <div className="mb-3">
          <h6
            className="fw-bold border-bottom pb-1"
            style={{ cursor: 'pointer' }}
            onClick={() => setShowFamily(!showFamily)}
          >
            {showFamily ? '▾' : '▸'} Family & Background
          </h6>
          {showFamily && (
            <div style={{ fontSize: '0.85rem' }}>
              <div className="d-flex justify-content-between">
                <span>Family 4Ps Beneficiary:</span>
                <span>{resident.familyIs4ps ? 'Yes' : 'No'}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Solo Parent Household:</span>
                <span>{resident.familySoloParent ? 'Yes' : 'No'}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Indigenous:</span>
                <span>{resident.familyIndigenous ? 'Yes' : 'No'}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Parent with Disability:</span>
                <span>{resident.familyParentPwd ? 'Yes' : 'No'}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Informal Settler:</span>
                <span>{resident.familyInformalSettler ? 'Yes' : 'No'}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Place of Birth:</span>
                <span>{resident.placeOfBirth}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Religion:</span>
                <span>{resident.religion}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Referral Source:</span>
                <span>{resident.referralSource ?? '—'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Section G: Reintegration Timeline */}
        {reintEl}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CaseloadPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const role: 'admin' | 'manager' | 'staff' | null = user?.roles.includes(
    'Admin'
  )
    ? 'admin'
    : user?.roles.includes('Manager')
      ? 'manager'
      : user?.roles.includes('SocialWorker')
        ? 'staff'
        : null;

  const canWriteIntake = role === 'admin' || role === 'manager';
  const basePath = role === 'manager' ? '/manager' : '/admin';

  const safehouseId = user?.safehouseId ?? null;
  const workerCode = user?.socialWorkerCode ?? null;

  const [data, setData] = useState<CaseloadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('active_transferred');
  const [riskFilter, setRiskFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortCol, setSortCol] = useState<SortCol>('currentRiskLevel');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [openAccordions, setOpenAccordions] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resResult, shResult, predResult, riskResult, metaResult] =
        await Promise.all([
          apiFetch<{ residents: Resident[] }>(
            '/api/Residents/AllResidents?pageSize=200&pageIndex=1'
          ).catch(() => null),
          apiFetch<{ safehouses: Safehouse[] }>(
            '/api/Safehouses/AllSafehouses?pageSize=20&pageIndex=1'
          ).catch(() => null),
          apiFetch<ResidentPrediction[]>('/api/ml/predictions').catch(
            () => null
          ),
          apiFetch<ResidentIncidentRisk[]>('/api/ml/incident-risk').catch(
            () => null
          ),
          apiFetch<{
            reintegrationModel?: {
              reference_classes?: {
                by_reintegration_type?: Record<string, ReintegrationRef>;
              };
            };
          }>('/api/ml/model-meta').catch(() => null),
        ]);

      // Backend returns { items: [...], totalCount: N }
      const residents: Resident[] =
        (resResult as { items?: Resident[] })?.items ??
        (Array.isArray(resResult) ? resResult : []);
      const safehouses: Safehouse[] =
        (shResult as { items?: Safehouse[] })?.items ??
        (Array.isArray(shResult) ? shResult : []);

      const predictions = new Map<number, ResidentPrediction>();
      if (Array.isArray(predResult)) {
        for (const p of predResult) predictions.set(p.residentId, p);
      }

      const incidentRisks = new Map<number, ResidentIncidentRisk>();
      if (Array.isArray(riskResult)) {
        for (const r of riskResult) incidentRisks.set(r.residentId, r);
      }

      const reintegrationRefs =
        metaResult?.reintegrationModel?.reference_classes
          ?.by_reintegration_type ?? null;

      setData({ residents, safehouses, predictions, incidentRisks, reintegrationRefs });
    } catch {
      setError('Failed to load caseload data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated && role) {
      fetchData();
    }
  }, [authLoading, isAuthenticated, role, fetchData]);

  // ─── Filtered + sorted residents ──────────────────────────────────────────

  const filteredResidents = useMemo(() => {
    if (!data) return [];
    let list = data.residents;

    // Role scoping
    if (role === 'manager' && safehouseId) {
      list = list.filter((r) => r.safehouseId === safehouseId);
    } else if (role === 'staff' && workerCode) {
      list = list.filter((r) => r.assignedSocialWorker === workerCode);
    }

    // Status filter
    if (statusFilter === 'active_transferred') {
      list = list.filter(
        (r) => r.caseStatus === 'Active' || r.caseStatus === 'Transferred'
      );
    } else if (statusFilter !== 'all') {
      list = list.filter((r) => r.caseStatus === statusFilter);
    }

    // Risk filter
    if (riskFilter !== 'all') {
      list = list.filter((r) => r.currentRiskLevel === riskFilter);
    }

    // Tier filter
    if (tierFilter !== 'all') {
      list = list.filter((r) => {
        const risk = data.incidentRisks.get(r.residentId);
        return risk?.riskTier === tierFilter;
      });
    }

    // Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((r) => r.internalCode.toLowerCase().includes(term));
    }

    // Sort
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'internalCode':
          cmp = a.internalCode.localeCompare(b.internalCode);
          break;
        case 'presentAge':
          cmp = a.presentAge.localeCompare(b.presentAge);
          break;
        case 'caseCategory':
          cmp = a.caseCategory.localeCompare(b.caseCategory);
          break;
        case 'currentRiskLevel':
          cmp =
            (RISK_ORDER[a.currentRiskLevel ?? ''] ?? 0) -
            (RISK_ORDER[b.currentRiskLevel ?? ''] ?? 0);
          break;
        case 'riskTier': {
          const at = data.incidentRisks.get(a.residentId)?.riskTier ?? '';
          const bt = data.incidentRisks.get(b.residentId)?.riskTier ?? '';
          cmp = (TIER_ORDER[at] ?? 0) - (TIER_ORDER[bt] ?? 0);
          break;
        }
        case 'overallScore': {
          const as = data.predictions.get(a.residentId)?.overallScore ?? -1;
          const bs = data.predictions.get(b.residentId)?.overallScore ?? -1;
          cmp = as - bs;
          break;
        }
        case 'caseStatus':
          cmp = a.caseStatus.localeCompare(b.caseStatus);
          break;
        case 'assignedSocialWorker':
          cmp = (a.assignedSocialWorker ?? '').localeCompare(
            b.assignedSocialWorker ?? ''
          );
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [data, role, safehouseId, workerCode, statusFilter, riskFilter, tierFilter, searchTerm, sortCol, sortDir]);

  const handleSort = useCallback(
    (col: SortCol) => {
      if (sortCol === col) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortCol(col);
        setSortDir('desc');
      }
    },
    [sortCol]
  );

  const toggleAccordion = useCallback((shId: number) => {
    setOpenAccordions((prev) => {
      const next = new Set(prev);
      if (next.has(shId)) next.delete(shId);
      else next.add(shId);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setStatusFilter('active_transferred');
    setRiskFilter('all');
    setTierFilter('all');
    setSearchTerm('');
  }, []);

  // ─── Auth guards ──────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: '60vh' }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || role === null) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="container py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" role="status" />
          <p className="text-muted">Loading caseload data…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">{error ?? 'Failed to load data.'}</div>
      </div>
    );
  }

  // ─── Selected resident for detail panel ───────────────────────────────────

  const selectedResident = selectedId
    ? data.residents.find((r) => r.residentId === selectedId) ?? null
    : null;

  const sharedTableProps = {
    predictions: data.predictions,
    incidentRisks: data.incidentRisks,
    selectedId,
    onSelect: setSelectedId,
    hideWorker: role === 'staff',
    sortCol,
    sortDir,
    onSort: handleSort,
  } as const;

  const filtersAreDefault =
    statusFilter === 'active_transferred' &&
    riskFilter === 'all' &&
    tierFilter === 'all' &&
    searchTerm === '';

  const filterBarProps = {
    statusFilter,
    setStatusFilter,
    riskFilter,
    setRiskFilter,
    tierFilter,
    setTierFilter,
    searchTerm,
    setSearchTerm,
    onClearFilters: clearFilters,
    filtersAreDefault,
  } as const;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="container-fluid py-4 px-3 px-md-4"
      style={{
        transition: 'padding-right 0.25s ease',
      }}
    >
      {/* Role heading */}
      {role === 'admin' && (
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h4 className="fw-bold mb-1">All Safehouses — Caseload</h4>
            <p className="text-muted mb-0">
              {filteredResidents.length} resident
              {filteredResidents.length !== 1 ? 's' : ''} across all safehouses
            </p>
          </div>
          <button
            className="btn btn-theme-primary btn-sm"
            onClick={() => navigate(`${basePath}/residents/new`)}
          >
            + New Resident
          </button>
        </div>
      )}
      {role === 'manager' && (
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h4 className="fw-bold mb-1">
              {safehouseId != null
                ? `${safehouseCityLabel(data.safehouses, safehouseId)} — Caseload`
                : 'Your Safehouse — Caseload'}
            </h4>
            <p className="text-muted mb-0">
              {filteredResidents.length} resident
              {filteredResidents.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            className="btn btn-theme-primary btn-sm"
            onClick={() => navigate(`${basePath}/residents/new`)}
          >
            + New Resident
          </button>
        </div>
      )}
      {role === 'staff' && (
        <div className="mb-3">
          <h4 className="fw-bold mb-1">
            Your Assigned Residents — {workerCode}
          </h4>
          <p className="text-muted mb-0">
            {filteredResidents.length} resident
            {filteredResidents.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      <FilterBar {...filterBarProps} />

      {/* Admin: accordion by safehouse */}
      {role === 'admin' ? (
        <div className="accordion" id="caseload-accordion">
          {data.safehouses
            .slice()
            .sort((a, b) =>
              (a.city || '').localeCompare(b.city || '', undefined, {
                sensitivity: 'base',
              })
            )
            .map((sh) => {
              const shResidents = filteredResidents.filter(
                (r) => r.safehouseId === sh.safehouseId
              );
              const isOpen = openAccordions.has(sh.safehouseId);
              return (
                <div className="accordion-item" key={sh.safehouseId}>
                  <h2 className="accordion-header">
                    <button
                      className={`accordion-button ${isOpen ? '' : 'collapsed'}`}
                      type="button"
                      onClick={() => toggleAccordion(sh.safehouseId)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span className="fw-semibold" style={{ flex: 1 }}>
                        {sh.city?.trim() || sh.name}
                        {sh.city?.trim() && sh.name ? ` · ${sh.name}` : ''}
                      </span>
                      <span
                        className="badge"
                        style={{
                          marginRight: 28,
                          flexShrink: 0,
                          backgroundColor: 'var(--accent)',
                          color: '#fff',
                        }}
                      >
                        {shResidents.length} resident
                        {shResidents.length !== 1 ? 's' : ''}
                      </span>
                    </button>
                  </h2>
                  {isOpen && (
                    <div className="accordion-body p-3">
                      <ResidentTable
                        residents={shResidents}
                        {...sharedTableProps}
                      />
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        /* Manager & Staff: single table */
        <div className="card shadow-sm">
          <div className="card-body p-3">
            <ResidentTable
              residents={filteredResidents}
              {...sharedTableProps}
            />
          </div>
        </div>
      )}

      {/* Detail panel */}
      {selectedResident && (
        <div
          onClick={() => setSelectedId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(3px)',
            zIndex: 1040,
          }}
        />
      )}
      {selectedResident && (
        <DetailPanel
          resident={selectedResident}
          prediction={data.predictions.get(selectedResident.residentId)}
          incidentRisk={data.incidentRisks.get(selectedResident.residentId)}
          safehouses={data.safehouses}
          reintegrationRefs={data.reintegrationRefs}
          onClose={() => setSelectedId(null)}
          onEdit={
            canWriteIntake
              ? () =>
                  navigate(
                    `${basePath}/residents/${selectedResident.residentId}/edit`
                  )
              : undefined
          }
        />
      )}

      {role === 'manager' && (
        <div className="mt-4">
          <FormHistoryList basePath="/manager" canManage={false} />
        </div>
      )}
    </div>
  );
}
