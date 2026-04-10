import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchResidents,
  fetchSocialWorkers,
  type SocialWorkerOption,
} from '../api/residentsApi';
import {
  addVisitation,
  getVisitation,
  updateVisitation,
} from '../api/homeVisitationsApi';
import type { Resident } from '../types/Resident';

const VISIT_TYPES = [
  'Routine Follow-Up',
  'Reintegration Assessment',
  'Post-Placement Monitoring',
] as const;

const COOPERATION_LEVELS = ['Cooperative', 'Neutral', 'Uncooperative'] as const;

const VISIT_OUTCOMES = [
  'Favorable',
  'Unfavorable',
  'Needs Improvement',
] as const;

export interface HomeVisitationFormPanelProps {
  basePath: string;
  visitationEditId?: string;
}

export default function HomeVisitationFormPanel({
  basePath,
  visitationEditId,
}: HomeVisitationFormPanelProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const isEdit = Boolean(visitationEditId);

  const role: 'admin' | 'manager' | 'staff' | null = user?.roles.includes(
    'Admin'
  )
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
  const [visitDate, setVisitDate] = useState('');
  const [socialWorker, setSocialWorker] = useState('');
  const [visitType, setVisitType] = useState<string>(VISIT_TYPES[0]);
  const [locationVisited, setLocationVisited] = useState('');
  const [familyMembersPresent, setFamilyMembersPresent] = useState('');
  const [purpose, setPurpose] = useState('');
  const [observations, setObservations] = useState('');
  const [familyCooperationLevel, setFamilyCooperationLevel] = useState<string>(
    COOPERATION_LEVELS[0]
  );
  const [safetyConcernsNoted, setSafetyConcernsNoted] = useState(false);
  const [visitOutcome, setVisitOutcome] = useState<string>(VISIT_OUTCOMES[0]);
  const [followUpNeeded, setFollowUpNeeded] = useState(false);
  const [followUpNotes, setFollowUpNotes] = useState('');

  const residentOptions = useMemo(() => {
    let list = residents;
    if (role === 'manager' && safehouseId != null) {
      list = list.filter((r) => r.safehouseId === safehouseId);
    } else if (role === 'staff' && workerCode) {
      list = list.filter(
        (r) => (r.assignedSocialWorker ?? '').trim() === workerCode
      );
    }
    return [...list].sort((a, b) =>
      a.internalCode.localeCompare(b.internalCode)
    );
  }, [residents, role, safehouseId, workerCode]);

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

        if (isEdit && visitationEditId) {
          const v = await getVisitation(Number(visitationEditId));
          if (cancelled) return;
          setResidentId(v.residentId);
          setVisitDate(v.visitDate?.slice(0, 10) ?? '');
          setSocialWorker(v.socialWorker ?? '');
          setVisitType(v.visitType || VISIT_TYPES[0]);
          setLocationVisited(v.locationVisited ?? '');
          setFamilyMembersPresent(v.familyMembersPresent ?? '');
          setPurpose(v.purpose ?? '');
          setObservations(v.observations ?? '');
          setFamilyCooperationLevel(
            v.familyCooperationLevel || COOPERATION_LEVELS[0]
          );
          setSafetyConcernsNoted(!!v.safetyConcernsNoted);
          setVisitOutcome(v.visitOutcome || VISIT_OUTCOMES[0]);
          setFollowUpNeeded(!!v.followUpNeeded);
          setFollowUpNotes(v.followUpNotes ?? '');
        }
      } catch {
        if (!cancelled) {
          setError(
            isEdit
              ? 'Failed to load this visitation.'
              : 'Failed to load residents.'
          );
          setResidents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, role, isEdit, visitationEditId]);

  useEffect(() => {
    if (role !== 'staff' || !workerCode) return;
    setSocialWorker(workerCode);
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
    if (!visitDate) {
      setError('Visit date is required.');
      return;
    }
    if (!socialWorker.trim()) {
      setError('Social worker is required.');
      return;
    }

    const basePayload = {
      residentId,
      visitDate,
      socialWorker: socialWorker.trim(),
      visitType,
      locationVisited: locationVisited.trim(),
      familyMembersPresent: familyMembersPresent.trim(),
      purpose: purpose.trim(),
      observations: observations.trim(),
      familyCooperationLevel,
      safetyConcernsNoted,
      visitOutcome,
      followUpNeeded,
      followUpNotes: followUpNotes.trim() || null,
    };

    setSubmitting(true);
    try {
      if (isEdit && visitationEditId) {
        await updateVisitation(Number(visitationEditId), {
          visitationId: Number(visitationEditId),
          ...basePayload,
        });
        setSuccess('Visitation updated.');
      } else {
        await addVisitation(basePayload);
        setSuccess('Visitation saved.');
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

  if (isEdit && error && !visitDate) {
    return (
      <>
        <div className="alert alert-danger">{error}</div>
        <Link to={`${basePath}/forms`} className="btn btn-outline-secondary">
          New visitation
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <h2 className="h4 mb-0">
          {isEdit ? 'Edit home visitation' : 'New home visitation'}
        </h2>
        <div className="d-flex gap-2 no-print">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => window.print()}
          >
            Print form
          </button>
          <Link
            to={`${basePath}/caseload`}
            className="btn btn-outline-secondary btn-sm"
          >
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
              <label className="form-label" htmlFor="hv-resident">
                Resident
              </label>
              <select
                id="hv-resident"
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
              <label className="form-label" htmlFor="hv-date">
                Visit date
              </label>
              <input
                id="hv-date"
                type="date"
                className="form-control"
                required
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="hv-worker">
                Social worker
              </label>
              {role === 'staff' ? (
                <input
                  id="hv-worker"
                  type="text"
                  className="form-control"
                  value={socialWorker}
                  readOnly
                  disabled
                />
              ) : (
                <select
                  id="hv-worker"
                  className="form-select"
                  required
                  value={socialWorker}
                  onChange={(e) => setSocialWorker(e.target.value)}
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
            <div className="col-md-6">
              <label className="form-label" htmlFor="hv-type">
                Visit type
              </label>
              <select
                id="hv-type"
                className="form-select"
                value={visitType}
                onChange={(e) => setVisitType(e.target.value)}
                disabled={submitting}
              >
                {VISIT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="hv-location">
                Location visited
              </label>
              <input
                id="hv-location"
                type="text"
                className="form-control"
                required
                value={locationVisited}
                onChange={(e) => setLocationVisited(e.target.value)}
                disabled={submitting}
                placeholder="e.g. Proposed foster home, barangay office"
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="hv-family">
                Family members present
              </label>
              <textarea
                id="hv-family"
                className="form-control"
                rows={2}
                required
                value={familyMembersPresent}
                onChange={(e) => setFamilyMembersPresent(e.target.value)}
                disabled={submitting}
                placeholder="Names and relationships"
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="hv-purpose">
                Purpose
              </label>
              <textarea
                id="hv-purpose"
                className="form-control"
                rows={2}
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="hv-obs">
                Observations
              </label>
              <textarea
                id="hv-obs"
                className="form-control"
                rows={4}
                required
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="hv-coop">
                Family cooperation level
              </label>
              <select
                id="hv-coop"
                className="form-select"
                value={familyCooperationLevel}
                onChange={(e) => setFamilyCooperationLevel(e.target.value)}
                disabled={submitting}
              >
                {COOPERATION_LEVELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="hv-outcome">
                Visit outcome
              </label>
              <select
                id="hv-outcome"
                className="form-select"
                value={visitOutcome}
                onChange={(e) => setVisitOutcome(e.target.value)}
                disabled={submitting}
              >
                {VISIT_OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="hv-safety"
                  checked={safetyConcernsNoted}
                  onChange={(e) => setSafetyConcernsNoted(e.target.checked)}
                  disabled={submitting}
                />
                <label className="form-check-label" htmlFor="hv-safety">
                  Safety concerns noted
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="hv-follow-needed"
                  checked={followUpNeeded}
                  onChange={(e) => setFollowUpNeeded(e.target.checked)}
                  disabled={submitting}
                />
                <label className="form-check-label" htmlFor="hv-follow-needed">
                  Follow-up needed
                </label>
              </div>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="hv-follow-notes">
                Follow-up notes
              </label>
              <textarea
                id="hv-follow-notes"
                className="form-control"
                rows={2}
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                disabled={submitting}
                placeholder="Optional — next steps if follow-up is needed"
              />
            </div>
          </div>
          <div className="mt-4 d-flex flex-wrap gap-2 no-print">
            <button
              type="submit"
              className="btn btn-theme-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving…' : isEdit ? 'Update' : 'Save'}
            </button>
            <Link
              to={`${basePath}/caseload`}
              className="btn btn-outline-secondary"
            >
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </>
  );
}
