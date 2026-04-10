import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchResidents,
  fetchSocialWorkers,
  type SocialWorkerOption,
} from '../api/residentsApi';
import {
  addIncident,
  getIncident,
  updateIncident,
} from '../api/incidentReportsApi';
import type { Resident } from '../types/Resident';

const INCIDENT_TYPES = [
  'Medical',
  'Security',
  'Behavioral',
  'RunawayAttempt',
] as const;

const SEVERITIES = ['Low', 'Medium', 'High'] as const;

export interface IncidentReportFormPanelProps {
  basePath: string;
  incidentEditId?: string;
}

export default function IncidentReportFormPanel({
  basePath,
  incidentEditId,
}: IncidentReportFormPanelProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const isEdit = Boolean(incidentEditId);

  const role: 'admin' | 'manager' | 'staff' | null = user?.roles.includes('Admin')
    ? 'admin'
    : user?.roles.includes('Manager')
      ? 'manager'
      : user?.roles.includes('SocialWorker')
        ? 'staff'
        : null;

  const safehouseId = user?.safehouseId ?? null;
  const workerCode = user?.socialWorkerCode?.trim() || '';

  const [residents, setResidents] = useState<Resident[]>([]);
  const [workers, setWorkers] = useState<SocialWorkerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [residentId, setResidentId] = useState<number>(0);
  const [incidentDate, setIncidentDate] = useState('');
  const [reportedBy, setReportedBy] = useState('');
  const [incidentType, setIncidentType] = useState<string>(INCIDENT_TYPES[0]);
  const [severity, setSeverity] = useState<string>(SEVERITIES[0]);
  const [description, setDescription] = useState('');
  const [responseTaken, setResponseTaken] = useState('');
  const [resolved, setResolved] = useState(false);
  const [resolutionDate, setResolutionDate] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);

  // Staff and manager both see residents filtered by safehouseId (not assignedSocialWorker).
  // Incident Reports scope workers to their safehouse, not just their assigned cases.
  const residentOptions = useMemo(() => {
    let list = residents;
    if ((role === 'manager' || role === 'staff') && safehouseId != null) {
      list = list.filter((r) => r.safehouseId === safehouseId);
    }
    return [...list].sort((a, b) => a.internalCode.localeCompare(b.internalCode));
  }, [residents, role, safehouseId]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !role) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchResidents({ pageSize: 500, pageIndex: 1 });
        if (cancelled) return;
        setResidents(res.items ?? []);

        if (role === 'admin' || role === 'manager') {
          try {
            setWorkers(await fetchSocialWorkers());
          } catch {
            setWorkers([]);
          }
        }

        if (isEdit && incidentEditId) {
          const inc = await getIncident(Number(incidentEditId));
          if (cancelled) return;
          setResidentId(inc.residentId);
          setIncidentDate(inc.incidentDate?.slice(0, 10) ?? '');
          setReportedBy(inc.reportedBy ?? '');
          setIncidentType(inc.incidentType || INCIDENT_TYPES[0]);
          setSeverity(inc.severity || SEVERITIES[0]);
          setDescription(inc.description ?? '');
          setResponseTaken(inc.responseTaken ?? '');
          setResolved(!!inc.resolved);
          setResolutionDate(inc.resolutionDate?.slice(0, 10) ?? '');
          setFollowUpRequired(!!inc.followUpRequired);
        }
      } catch {
        if (!cancelled) {
          setError(isEdit ? 'Failed to load this incident report.' : 'Failed to load residents.');
          setResidents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, role, isEdit, incidentEditId]);

  useEffect(() => {
    if (role !== 'staff' || !workerCode) return;
    setReportedBy(workerCode);
  }, [role, workerCode]);

  useEffect(() => {
    if (isEdit || !residents.length) return;
    const q = searchParams.get('residentId');
    if (!q) return;
    const n = parseInt(q, 10);
    if (!Number.isFinite(n)) return;
    const exists = residentOptions.some((r) => r.residentId === n);
    if (exists) setResidentId(n);
  }, [isEdit, residents, residentOptions, searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!residentId) {
      setError('Select a resident.');
      return;
    }
    if (!incidentDate) {
      setError('Incident date is required.');
      return;
    }
    if (!reportedBy.trim()) {
      setError('Reported by is required.');
      return;
    }
    if (!description.trim()) {
      setError('Description is required.');
      return;
    }
    if (!responseTaken.trim()) {
      setError('Response taken is required.');
      return;
    }
    if (resolved && !resolutionDate) {
      setError('Resolution date is required when marking as resolved.');
      return;
    }

    // Derive safehouseId from the selected resident
    const selectedResident = residents.find((r) => r.residentId === residentId);
    const derivedSafehouseId = selectedResident?.safehouseId ?? safehouseId ?? 0;

    const basePayload = {
      residentId,
      safehouseId: derivedSafehouseId,
      incidentDate,
      reportedBy: reportedBy.trim(),
      incidentType,
      severity,
      description: description.trim(),
      responseTaken: responseTaken.trim(),
      resolved,
      resolutionDate: resolved ? resolutionDate : null,
      followUpRequired,
    };

    setSubmitting(true);
    try {
      if (isEdit && incidentEditId) {
        await updateIncident(Number(incidentEditId), {
          incidentId: Number(incidentEditId),
          ...basePayload,
        });
        setSuccess('Incident report updated.');
      } else {
        await addIncident(basePayload);
        setSuccess('Incident report saved.');
      }
      setTimeout(() => navigate(`${basePath}/caseload`), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary mb-3" role="status" />
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  if (isEdit && error && !description) {
    return (
      <>
        <div className="alert alert-danger">{error}</div>
        <Link to={`${basePath}/forms`} className="btn btn-outline-secondary">
          New incident report
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <h2 className="h4 mb-0">
          {isEdit ? 'Edit incident report' : 'New incident report'}
        </h2>
        <div className="d-flex gap-2 no-print">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => window.print()}
          >
            Print form
          </button>
          <Link to={`${basePath}/caseload`} className="btn btn-outline-secondary btn-sm">
            Back to caseload
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="card shadow-sm border-0">
        <div className="card-body p-4">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="ir-resident">
                Resident
              </label>
              <select
                id="ir-resident"
                className="form-select"
                required
                value={residentId || ''}
                onChange={(e) => setResidentId(Number(e.target.value))}
                disabled={submitting}
              >
                <option value="">Select…</option>
                {residentOptions.map((r) => (
                  <option key={r.residentId} value={r.residentId}>
                    {r.internalCode} — {r.caseControlNo}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="ir-date">
                Incident date
              </label>
              <input
                id="ir-date"
                type="date"
                className="form-control"
                required
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="ir-reported-by">
                Reported by
              </label>
              {role === 'staff' ? (
                <input
                  id="ir-reported-by"
                  type="text"
                  className="form-control"
                  value={reportedBy}
                  readOnly
                  disabled
                />
              ) : (
                <select
                  id="ir-reported-by"
                  className="form-select"
                  required
                  value={reportedBy}
                  onChange={(e) => setReportedBy(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Select…</option>
                  {workers.map((w) => (
                    <option key={w.workerCode} value={w.workerCode}>
                      {w.workerCode} — {w.displayName}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="ir-type">
                Incident type
              </label>
              <select
                id="ir-type"
                className="form-select"
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                disabled={submitting}
              >
                {INCIDENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="ir-severity">
                Severity
              </label>
              <select
                id="ir-severity"
                className="form-select"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                disabled={submitting}
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="ir-description">
                Description
              </label>
              <textarea
                id="ir-description"
                className="form-control"
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
                placeholder="Narrative of what happened"
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="ir-response">
                Response taken
              </label>
              <textarea
                id="ir-response"
                className="form-control"
                rows={3}
                required
                value={responseTaken}
                onChange={(e) => setResponseTaken(e.target.value)}
                disabled={submitting}
                placeholder="Actions taken immediately by staff"
              />
            </div>
            <div className="col-12">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="ir-resolved"
                  checked={resolved}
                  onChange={(e) => {
                    setResolved(e.target.checked);
                    if (!e.target.checked) setResolutionDate('');
                  }}
                  disabled={submitting}
                />
                <label className="form-check-label" htmlFor="ir-resolved">
                  Resolved
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="ir-follow-up"
                  checked={followUpRequired}
                  onChange={(e) => setFollowUpRequired(e.target.checked)}
                  disabled={submitting}
                />
                <label className="form-check-label" htmlFor="ir-follow-up">
                  Follow-up required
                </label>
              </div>
            </div>
            {resolved && (
              <div className="col-md-6">
                <label className="form-label" htmlFor="ir-resolution-date">
                  Resolution date
                </label>
                <input
                  id="ir-resolution-date"
                  type="date"
                  className="form-control"
                  required
                  value={resolutionDate}
                  onChange={(e) => setResolutionDate(e.target.value)}
                  disabled={submitting}
                />
              </div>
            )}
          </div>
          <div className="mt-4 d-flex flex-wrap gap-2 no-print">
            <button
              type="submit"
              className="btn btn-theme-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving…' : isEdit ? 'Update' : 'Save'}
            </button>
            <Link to={`${basePath}/caseload`} className="btn btn-outline-secondary">
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </>
  );
}
