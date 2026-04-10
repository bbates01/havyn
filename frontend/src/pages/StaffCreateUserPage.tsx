import { useEffect, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { apiFetch } from '../api/apiHelper';
import { createStaffUser } from '../api/authApi';
import { useAuth } from '../context/AuthContext';

interface SafehouseRow {
  safehouseId: number;
  name: string;
  city: string;
  region: string;
  status: string;
}

function StaffCreateUserPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const location = useLocation();
  const isAdmin = !!user?.roles.includes('Admin');
  const isManager = !!user?.roles.includes('Manager');
  const staffOk = isAdmin || isManager;

  const [safehouses, setSafehouses] = useState<SafehouseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createRole, setCreateRole] = useState('Donor');
  const [supporterType, setSupporterType] = useState('Individual');

  const path = location.pathname;
  const onAdminPath = path.startsWith('/admin/');
  const onManagerPath = path.startsWith('/manager/');

  useEffect(() => {
    document.title = 'Create user | Havyn';
  }, []);

  const loadSafehouses = useCallback(async () => {
    try {
      const res = await apiFetch<{ items?: SafehouseRow[]; Items?: SafehouseRow[] }>(
        '/api/Safehouses/AllSafehouses?pageSize=100&pageIndex=1'
      );
      const items = res.items ?? res.Items ?? [];
      setSafehouses(Array.isArray(items) ? items : []);
    } catch {
      setSafehouses([]);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadSafehouses();
  }, [isAdmin, loadSafehouses]);

  useEffect(() => {
    if (!isAdmin && isManager && createRole === 'Manager') {
      setCreateRole('Donor');
    }
  }, [isAdmin, isManager, createRole]);

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

  if (!staffOk) {
    return <Navigate to="/" replace />;
  }

  if (isAdmin && onManagerPath) {
    return <Navigate to="/admin/create-user" replace />;
  }

  if (!isAdmin && isManager && onAdminPath) {
    return <Navigate to="/manager/create-user" replace />;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = String(fd.get('email') ?? '').trim();
    const password = String(fd.get('password') ?? '');
    const confirm = String(fd.get('confirmPassword') ?? '');
    const displayName = String(fd.get('displayName') ?? '').trim();

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    const role = createRole;
    const payload: Parameters<typeof createStaffUser>[0] = {
      email,
      password,
      role,
    };

    if (displayName) payload.displayName = displayName;

    if (role === 'Manager' && isAdmin) {
      const sh = fd.get('safehouseId');
      const id = sh ? Number(sh) : NaN;
      if (!Number.isFinite(id) || id <= 0) {
        setError('Select a safehouse for the new manager.');
        return;
      }
      payload.safehouseId = id;
    }

    if (role === 'Donor') {
      const firstName = String(fd.get('firstName') ?? '').trim();
      const lastName = String(fd.get('lastName') ?? '').trim();
      const phone = String(fd.get('phone') ?? '').trim();
      const region = String(fd.get('region') ?? '').trim();
      const country = String(fd.get('country') ?? '').trim();
      const organizationName = String(fd.get('organizationName') ?? '').trim();

      payload.firstName = firstName;
      payload.lastName = lastName;
      payload.phone = phone;
      payload.region = region;
      payload.country = country;
      payload.supporterType = supporterType;
      if (supporterType === 'Organization' && organizationName) {
        payload.organizationName = organizationName;
      }
    }

    setLoading(true);
    try {
      const res = await createStaffUser(payload);
      if (role === 'SocialWorker' && res.socialWorkerCode) {
        setSuccess(
          `User created successfully. Assigned social worker code: ${res.socialWorkerCode}.`
        );
      } else {
        setSuccess(res.message ?? 'User created successfully.');
      }
      form.reset();
      setCreateRole('Donor');
      setSupporterType('Individual');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not create user. Check details and try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  const roleOptions = isAdmin
    ? ['Admin', 'Manager', 'SocialWorker', 'Donor']
    : ['SocialWorker', 'Donor'];

  return (
    <div className="container py-4 px-3 px-md-4">
      <h1 className="h3 fw-bold mb-1">Create user account</h1>
      <p className="text-muted mb-4">
        Create accounts for staff or donors. Passwords must meet system rules (12+
        characters, mixed case, number, symbol).
      </p>

      <form className="col-lg-8" onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label" htmlFor="staff-role">
            Role
          </label>
          <select
            id="staff-role"
            className="form-select"
            value={createRole}
            onChange={(ev) => setCreateRole(ev.target.value)}
            aria-label="Role to create"
          >
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {createRole === 'Manager' && isAdmin && (
          <div className="mb-3">
            <label className="form-label" htmlFor="staff-safehouse">
              Safehouse
            </label>
            <select
              id="staff-safehouse"
              name="safehouseId"
              className="form-select"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Select safehouse…
              </option>
              {safehouses.map((sh) => (
                <option key={sh.safehouseId} value={sh.safehouseId}>
                  {(sh.city?.trim() || sh.name?.trim() || `ID ${sh.safehouseId}`) +
                    (sh.region ? ` — ${sh.region}` : '')}
                </option>
              ))}
            </select>
          </div>
        )}

        {createRole === 'SocialWorker' && (
          <p className="text-muted small mb-3">
            A social worker code in the form <strong>SW-##</strong> will be assigned
            automatically (next number after existing staff and resident assignments).
          </p>
        )}

        {createRole === 'Donor' && (
          <>
            <div className="mb-3">
              <label className="form-label" htmlFor="staff-donor-type">
                Supporter type
              </label>
              <select
                id="staff-donor-type"
                className="form-select"
                value={supporterType}
                onChange={(ev) => setSupporterType(ev.target.value)}
              >
                <option value="Individual">Individual</option>
                <option value="Organization">Organization</option>
              </select>
            </div>
            {supporterType === 'Organization' && (
              <div className="mb-3">
                <label className="form-label" htmlFor="staff-org">
                  Organization name
                </label>
                <input
                  id="staff-org"
                  name="organizationName"
                  type="text"
                  className="form-control"
                  required
                />
              </div>
            )}
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label" htmlFor="staff-fn">
                  First name
                </label>
                <input
                  id="staff-fn"
                  name="firstName"
                  type="text"
                  className="form-control"
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="staff-ln">
                  Last name
                </label>
                <input
                  id="staff-ln"
                  name="lastName"
                  type="text"
                  className="form-control"
                  required
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="staff-phone">
                Phone
              </label>
              <input
                id="staff-phone"
                name="phone"
                type="tel"
                className="form-control"
                required
              />
            </div>
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label" htmlFor="staff-region">
                  Region / state
                </label>
                <input
                  id="staff-region"
                  name="region"
                  type="text"
                  className="form-control"
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="staff-country">
                  Country
                </label>
                <input
                  id="staff-country"
                  name="country"
                  type="text"
                  className="form-control"
                  required
                />
              </div>
            </div>
          </>
        )}

        {createRole !== 'Donor' && (
          <div className="mb-3">
            <label className="form-label" htmlFor="staff-display">
              Display name (optional)
            </label>
            <input
              id="staff-display"
              name="displayName"
              type="text"
              className="form-control"
              placeholder="Defaults to email"
            />
          </div>
        )}

        <div className="mb-3">
          <label className="form-label" htmlFor="staff-email">
            Email
          </label>
          <input
            id="staff-email"
            name="email"
            type="email"
            className="form-control"
            required
            autoComplete="off"
          />
        </div>
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label className="form-label" htmlFor="staff-pw">
              Password
            </label>
            <input
              id="staff-pw"
              name="password"
              type="password"
              className="form-control"
              required
              minLength={12}
              autoComplete="new-password"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="staff-pw2">
              Confirm password
            </label>
            <input
              id="staff-pw2"
              name="confirmPassword"
              type="password"
              className="form-control"
              required
              minLength={12}
              autoComplete="new-password"
            />
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success" role="status">
            {success}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating…' : 'Create user'}
        </button>
      </form>
    </div>
  );
}

export default StaffCreateUserPage;
