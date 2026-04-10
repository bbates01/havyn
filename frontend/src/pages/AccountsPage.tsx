import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../api/apiHelper';
import {
  deleteResidentCaseRecord,
  getResidentCaseRecord,
  updateResidentCaseRecord,
} from '../api/residentsApi';
import {
  deleteStaffAccount,
  listStaffAccounts,
  updateStaffAccount,
  type StaffAccountSummary,
} from '../api/staffAccountsApi';
import type { Resident } from '../types/Resident';
import { useAuth } from '../context/AuthContext';

type AccountsTab = 'logins' | 'residents';

interface ResidentRow {
  residentId: number;
  internalCode: string;
  caseControlNo: string;
  safehouseId: number;
  caseStatus: string;
  assignedSocialWorker: string | null;
}

function normalizeResident(r: Record<string, unknown>): ResidentRow {
  return {
    residentId: Number(r.residentId ?? r.ResidentId ?? 0),
    internalCode: String(r.internalCode ?? r.InternalCode ?? ''),
    caseControlNo: String(r.caseControlNo ?? r.CaseControlNo ?? ''),
    safehouseId: Number(r.safehouseId ?? r.SafehouseId ?? 0),
    caseStatus: String(r.caseStatus ?? r.CaseStatus ?? ''),
    assignedSocialWorker: (r.assignedSocialWorker ?? r.AssignedSocialWorker) as string | null,
  };
}

function normalizeStaffRow(r: Record<string, unknown>): StaffAccountSummary {
  return {
    id: String(r.id ?? r.Id ?? ''),
    email: (r.email ?? r.Email) as string | null | undefined,
    displayName: String(r.displayName ?? r.DisplayName ?? ''),
    roles: (Array.isArray(r.roles) ? r.roles : Array.isArray(r.Roles) ? r.Roles : []) as string[],
    safehouseId: (r.safehouseId ?? r.SafehouseId) as number | null | undefined,
    socialWorkerCode: (r.socialWorkerCode ?? r.SocialWorkerCode) as string | null | undefined,
    supporterId: (r.supporterId ?? r.SupporterId) as number | null | undefined,
  };
}

function AccountsPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const location = useLocation();
  const isAdmin = !!user?.roles.includes('Admin');
  const isManager = !!user?.roles.includes('Manager');
  const isSocialWorker = !!user?.roles.includes('SocialWorker');
  const canManageStaffLogins = isAdmin || isManager;
  const canUseAccounts = canManageStaffLogins || isSocialWorker;
  const isResidentOnlyUser = isSocialWorker && !isAdmin && !isManager;
  const canEditResidentScope = isAdmin || isManager;

  const path = location.pathname;
  const onAdminPath = path.startsWith('/admin/');
  const onManagerPath = path.startsWith('/manager/');

  const [items, setItems] = useState<StaffAccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<StaffAccountSummary | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSafehouseId, setEditSafehouseId] = useState('');
  const [saving, setSaving] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<AccountsTab>('logins');
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [residentsLoading, setResidentsLoading] = useState(false);
  const [residentsError, setResidentsError] = useState<string | null>(null);

  const [residentModalOpen, setResidentModalOpen] = useState(false);
  const [residentEditLoading, setResidentEditLoading] = useState(false);
  const [residentEditSaving, setResidentEditSaving] = useState(false);
  const [residentEditDraft, setResidentEditDraft] = useState<Resident | null>(null);
  const [residentEditError, setResidentEditError] = useState<string | null>(null);

  const displayTab: AccountsTab = isResidentOnlyUser ? 'residents' : activeTab;

  const base = isAdmin ? '/admin' : isManager ? '/manager' : '/staff';
  const createPath = `${base}/accounts/create`;
  const caseloadPath = `${base}/caseload`;

  const roleFilterOptions = isAdmin
    ? [
        { value: '', label: 'All roles' },
        { value: 'Admin', label: 'Admin' },
        { value: 'Manager', label: 'Manager' },
        { value: 'SocialWorker', label: 'Social worker' },
        { value: 'Donor', label: 'Donor' },
      ]
    : [
        { value: '', label: 'All roles' },
        { value: 'SocialWorker', label: 'Social worker' },
        { value: 'Donor', label: 'Donor' },
      ];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listStaffAccounts({
        pageSize: 100,
        pageIndex: 1,
        ...(roleFilter ? { role: roleFilter } : {}),
      });
      const raw = res.items ?? res.Items ?? [];
      const list: unknown[] = Array.isArray(raw) ? (raw as unknown[]) : [];
      const rows: StaffAccountSummary[] = list.map((item) =>
        normalizeStaffRow(item as Record<string, unknown>)
      );
      setItems(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load accounts.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  const loadResidents = useCallback(async () => {
    setResidentsLoading(true);
    setResidentsError(null);
    try {
      const res = await apiFetch<{ items?: unknown[]; Items?: unknown[] }>(
        '/api/Residents/AllResidents?pageSize=500&pageIndex=1'
      );
      const raw = res.items ?? res.Items ?? [];
      const rows = (Array.isArray(raw) ? raw : []).map((x) =>
        normalizeResident(x as Record<string, unknown>)
      );
      setResidents(rows);
    } catch (e) {
      setResidentsError(e instanceof Error ? e.message : 'Could not load residents.');
      setResidents([]);
    } finally {
      setResidentsLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Accounts | Havyn';
  }, []);

  useEffect(() => {
    if (!canManageStaffLogins) {
      setLoading(false);
    }
  }, [canManageStaffLogins]);

  useEffect(() => {
    if (canManageStaffLogins && displayTab === 'logins') void load();
  }, [canManageStaffLogins, displayTab, load]);

  useEffect(() => {
    if (canUseAccounts && displayTab === 'residents') void loadResidents();
  }, [canUseAccounts, displayTab, loadResidents]);

  if (authLoading) {
    return (
      <div className="container py-5">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!canUseAccounts) {
    return <Navigate to="/" replace />;
  }

  if (isResidentOnlyUser && (onAdminPath || onManagerPath)) {
    return <Navigate to="/staff/accounts" replace />;
  }

  if (isAdmin && onManagerPath) {
    return <Navigate to="/admin/accounts" replace />;
  }

  if (!isAdmin && isManager && onAdminPath) {
    return <Navigate to="/manager/accounts" replace />;
  }

  if (isAdmin && path.startsWith('/staff/')) {
    return <Navigate to="/admin/accounts" replace />;
  }

  if (isManager && path.startsWith('/staff/')) {
    return <Navigate to="/manager/accounts" replace />;
  }

  function openEdit(row: StaffAccountSummary) {
    setEditing(row);
    setEditDisplayName(row.displayName ?? '');
    setEditEmail(row.email ?? '');
    setEditPhone('');
    setEditSafehouseId(row.safehouseId != null ? String(row.safehouseId) : '');
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Parameters<typeof updateStaffAccount>[1] = {};
      if (editDisplayName.trim()) payload.displayName = editDisplayName.trim();
      if (editEmail.trim()) payload.email = editEmail.trim();
      if (editPhone.trim()) payload.phone = editPhone.trim();
      if (isAdmin && editSafehouseId.trim()) {
        const n = Number(editSafehouseId);
        if (Number.isFinite(n)) payload.safehouseId = n;
      }
      await updateStaffAccount(editing.id, payload);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: StaffAccountSummary) {
    if (!window.confirm(`Delete account ${row.email ?? row.displayName}? This cannot be undone.`)) {
      return;
    }
    setError(null);
    try {
      await deleteStaffAccount(row.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete account.');
    }
  }

  function closeResidentModal() {
    setResidentModalOpen(false);
    setResidentEditDraft(null);
    setResidentEditError(null);
    setResidentEditLoading(false);
  }

  async function openResidentEdit(id: number) {
    setResidentModalOpen(true);
    setResidentEditError(null);
    setResidentEditDraft(null);
    setResidentEditLoading(true);
    try {
      const row = await getResidentCaseRecord(id);
      setResidentEditDraft(row);
    } catch (e) {
      setResidentEditError(e instanceof Error ? e.message : 'Could not load resident.');
    } finally {
      setResidentEditLoading(false);
    }
  }

  async function saveResidentEdit() {
    if (!residentEditDraft) return;
    setResidentEditSaving(true);
    setResidentEditError(null);
    try {
      await updateResidentCaseRecord(residentEditDraft.residentId, residentEditDraft);
      closeResidentModal();
      await loadResidents();
    } catch (e) {
      setResidentEditError(e instanceof Error ? e.message : 'Could not save resident.');
    } finally {
      setResidentEditSaving(false);
    }
  }

  async function removeResident(row: ResidentRow) {
    if (
      !window.confirm(
        `Delete resident case ${row.internalCode || row.residentId}? This cannot be undone.`
      )
    ) {
      return;
    }
    setResidentsError(null);
    try {
      await deleteResidentCaseRecord(row.residentId);
      await loadResidents();
    } catch (e) {
      setResidentsError(e instanceof Error ? e.message : 'Could not delete resident.');
    }
  }

  function patchResident(patch: Partial<Resident>) {
    setResidentEditDraft((d) => (d ? { ...d, ...patch } : null));
  }

  return (
    <div className="container py-4 px-3 px-md-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h1 className="h3 fw-bold mb-1">Accounts</h1>
          <p className="text-muted mb-0 small">
            {canManageStaffLogins ? (
              <>
                Staff and donor <strong>login</strong> accounts, plus <strong>resident case</strong>{' '}
                records (not logins — scoped by your role in the API).
              </>
            ) : (
              <>
                <strong>Resident case</strong> records assigned to you. Login accounts are managed by
                administrators and managers.
              </>
            )}
          </p>
        </div>
        {canManageStaffLogins && displayTab === 'logins' && (
          <Link to={createPath} className="btn btn-primary">
            Create account
          </Link>
        )}
        {displayTab === 'residents' && (
          <Link to={caseloadPath} className="btn btn-outline-primary">
            Open Caseload
          </Link>
        )}
      </div>

      {canManageStaffLogins && (
        <ul className="nav nav-pills gap-2 mb-3">
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${displayTab === 'logins' ? 'active' : ''}`}
              onClick={() => setActiveTab('logins')}
            >
              Staff &amp; donor logins
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${displayTab === 'residents' ? 'active' : ''}`}
              onClick={() => setActiveTab('residents')}
            >
              Residents (case records)
            </button>
          </li>
        </ul>
      )}

      {displayTab === 'logins' && canManageStaffLogins && (
        <div className="row g-2 align-items-end mb-4">
          <div className="col-auto">
            <label className="form-label small text-muted mb-0" htmlFor="accounts-role-filter">
              Filter by role
            </label>
            <select
              id="accounts-role-filter"
              className="form-select form-select-sm"
              style={{ minWidth: '11rem' }}
              key={isAdmin ? 'role-filter-admin' : 'role-filter-mgr'}
              value={roleFilter}
              onChange={(ev) => setRoleFilter(ev.target.value)}
              aria-label="Filter accounts by role"
            >
              {roleFilterOptions.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {error && displayTab === 'logins' && canManageStaffLogins && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      {residentsError && displayTab === 'residents' && (
        <div className="alert alert-danger" role="alert">
          {residentsError}
        </div>
      )}

      {displayTab === 'logins' &&
        canManageStaffLogins &&
        (loading ? (
          <p className="text-muted">Loading accounts…</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Display name</th>
                  <th>Roles</th>
                  <th>SW code</th>
                  <th>Safehouse</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td>{row.email ?? '—'}</td>
                    <td>{row.displayName}</td>
                    <td>{row.roles?.join(', ') ?? '—'}</td>
                    <td>{row.socialWorkerCode ?? '—'}</td>
                    <td>{row.safehouseId ?? '—'}</td>
                    <td className="text-end text-nowrap">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm me-1"
                        onClick={() => openEdit(row)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => remove(row)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {displayTab === 'residents' &&
        (residentsLoading ? (
          <p className="text-muted">Loading residents…</p>
        ) : (
          <div className="table-responsive">
            <p className="text-muted small mb-2">
              {residents.length} resident case{residents.length !== 1 ? 's' : ''} visible to you. Full
              tools are on <Link to={caseloadPath}>Caseload</Link>.
            </p>
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Internal code</th>
                  <th>Case control</th>
                  <th>Safehouse</th>
                  <th>Status</th>
                  <th>Assigned SW</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {residents.map((r) => (
                  <tr key={r.residentId}>
                    <td>{r.residentId}</td>
                    <td>{r.internalCode}</td>
                    <td>{r.caseControlNo}</td>
                    <td>{r.safehouseId}</td>
                    <td>{r.caseStatus}</td>
                    <td>{r.assignedSocialWorker ?? '—'}</td>
                    <td className="text-end text-nowrap">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm me-1"
                        onClick={() => void openResidentEdit(r.residentId)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => void removeResident(r)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {editing && (
        <div
          className="modal d-block"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="acct-edit-title"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h2 id="acct-edit-title" className="modal-title h5">
                  Edit account
                </h2>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setEditing(null)}
                />
              </div>
              <div className="modal-body">
                <div className="mb-2">
                  <label className="form-label" htmlFor="acct-dn">
                    Display name
                  </label>
                  <input
                    id="acct-dn"
                    className="form-control"
                    value={editDisplayName}
                    onChange={(ev) => setEditDisplayName(ev.target.value)}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label" htmlFor="acct-em">
                    Email
                  </label>
                  <input
                    id="acct-em"
                    type="email"
                    className="form-control"
                    value={editEmail}
                    onChange={(ev) => setEditEmail(ev.target.value)}
                  />
                </div>
                {editing.roles?.includes('Donor') && (
                  <div className="mb-2">
                    <label className="form-label" htmlFor="acct-ph">
                      Phone (supporter)
                    </label>
                    <input
                      id="acct-ph"
                      className="form-control"
                      value={editPhone}
                      onChange={(ev) => setEditPhone(ev.target.value)}
                      placeholder="Leave blank to keep unchanged"
                    />
                  </div>
                )}
                {isAdmin && !editing.roles?.includes('Donor') && (
                  <div className="mb-2">
                    <label className="form-label" htmlFor="acct-sh">
                      Safehouse ID
                    </label>
                    <input
                      id="acct-sh"
                      className="form-control"
                      value={editSafehouseId}
                      onChange={(ev) => setEditSafehouseId(ev.target.value)}
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditing(null)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void saveEdit()}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {residentModalOpen && (
        <div
          className="modal d-block"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="resident-edit-title"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h2 id="resident-edit-title" className="modal-title h5">
                  Edit resident case
                </h2>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={closeResidentModal}
                  disabled={residentEditSaving}
                />
              </div>
              <div className="modal-body">
                {residentEditLoading && <p className="text-muted mb-0">Loading resident…</p>}
                {residentEditError && (
                  <div className="alert alert-danger" role="alert">
                    {residentEditError}
                  </div>
                )}
                {residentEditDraft && !residentEditLoading && (
                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="res-int">
                        Internal code
                      </label>
                      <input
                        id="res-int"
                        className="form-control"
                        value={residentEditDraft.internalCode}
                        onChange={(ev) => patchResident({ internalCode: ev.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="res-cc">
                        Case control no.
                      </label>
                      <input
                        id="res-cc"
                        className="form-control"
                        value={residentEditDraft.caseControlNo}
                        onChange={(ev) => patchResident({ caseControlNo: ev.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="res-sh">
                        Safehouse ID
                      </label>
                      {canEditResidentScope ? (
                        <input
                          id="res-sh"
                          type="number"
                          className="form-control"
                          value={residentEditDraft.safehouseId}
                          onChange={(ev) =>
                            patchResident({ safehouseId: Number(ev.target.value) || 0 })
                          }
                        />
                      ) : (
                        <input
                          id="res-sh"
                          className="form-control"
                          readOnly
                          value={residentEditDraft.safehouseId}
                        />
                      )}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="res-st">
                        Case status
                      </label>
                      <input
                        id="res-st"
                        className="form-control"
                        value={residentEditDraft.caseStatus}
                        onChange={(ev) => patchResident({ caseStatus: ev.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="res-asw">
                        Assigned social worker
                      </label>
                      {canEditResidentScope ? (
                        <input
                          id="res-asw"
                          className="form-control"
                          value={residentEditDraft.assignedSocialWorker ?? ''}
                          onChange={(ev) =>
                            patchResident({
                              assignedSocialWorker: ev.target.value.trim() || null,
                            })
                          }
                        />
                      ) : (
                        <input
                          id="res-asw"
                          className="form-control"
                          readOnly
                          value={residentEditDraft.assignedSocialWorker ?? ''}
                        />
                      )}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="res-sex">
                        Sex
                      </label>
                      <input
                        id="res-sex"
                        className="form-control"
                        value={residentEditDraft.sex}
                        onChange={(ev) => patchResident({ sex: ev.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="res-dob">
                        Date of birth
                      </label>
                      <input
                        id="res-dob"
                        type="date"
                        className="form-control"
                        value={residentEditDraft.dateOfBirth?.slice(0, 10) ?? ''}
                        onChange={(ev) => patchResident({ dateOfBirth: ev.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="res-doa">
                        Date of admission
                      </label>
                      <input
                        id="res-doa"
                        type="date"
                        className="form-control"
                        value={residentEditDraft.dateOfAdmission?.slice(0, 10) ?? ''}
                        onChange={(ev) => patchResident({ dateOfAdmission: ev.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="res-ir">
                        Initial risk level
                      </label>
                      <input
                        id="res-ir"
                        className="form-control"
                        value={residentEditDraft.initialRiskLevel ?? ''}
                        onChange={(ev) => patchResident({ initialRiskLevel: ev.target.value || null })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="res-cr">
                        Current risk level
                      </label>
                      <input
                        id="res-cr"
                        className="form-control"
                        value={residentEditDraft.currentRiskLevel ?? ''}
                        onChange={(ev) => patchResident({ currentRiskLevel: ev.target.value || null })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label" htmlFor="res-notes">
                        Notes (restricted)
                      </label>
                      <textarea
                        id="res-notes"
                        className="form-control"
                        rows={4}
                        value={residentEditDraft.notesRestricted ?? ''}
                        onChange={(ev) =>
                          patchResident({ notesRestricted: ev.target.value || null })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeResidentModal}
                  disabled={residentEditSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void saveResidentEdit()}
                  disabled={residentEditSaving || !residentEditDraft || residentEditLoading}
                >
                  {residentEditSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountsPage;
