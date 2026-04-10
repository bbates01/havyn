import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Donation } from '../types/Donation';
import {
  createMyDonation,
  fetchDonorDashboardSummary,
  fetchMyDonations,
  updateMyDonation,
  type DonorDashboardSummary,
} from '../api/donorPortalApi';
import './LoginPage.css';
import './DonorHomePage.css';

type DonorTab = 'history' | 'manage';

const RECURRING_FREQUENCIES = ['Monthly', 'Quarterly', 'Yearly'] as const;

function formatMoney(n: number) {
  return n.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
}

function formatDate(iso: string) {
  try {
    return new Date(iso + (iso.length <= 10 ? 'T12:00:00' : '')).toLocaleDateString();
  } catch {
    return iso;
  }
}

function DonorHomePage() {
  const { user, loading, isAuthenticated } = useAuth();
  const [tab, setTab] = useState<DonorTab>('history');
  const [summary, setSummary] = useState<DonorDashboardSummary | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(1);
  const pageSize = 25;
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newAmount, setNewAmount] = useState('');
  const [newRecurring, setNewRecurring] = useState(false);
  const [newRecurringFrequency, setNewRecurringFrequency] =
    useState<(typeof RECURRING_FREQUENCIES)[number]>('Monthly');
  const [newCampaign, setNewCampaign] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const [editAmounts, setEditAmounts] = useState<Record<number, string>>({});
  const [editFrequencies, setEditFrequencies] = useState<Record<number, string>>({});

  const loadSummary = useCallback(async () => {
    const s = await fetchDonorDashboardSummary();
    setSummary(s);
  }, []);

  const loadDonations = useCallback(async () => {
    const recurringOnly = tab === 'manage' ? true : undefined;
    const res = await fetchMyDonations({
      pageSize,
      pageIndex,
      recurringOnly,
    });
    setDonations(res.items);
    setTotalCount(res.totalCount);
  }, [tab, pageIndex]);

  useEffect(() => {
    document.title = 'Donor home | Havyn';
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.roles.includes('Donor')) return;
    setLoadError(null);
    let cancelled = false;
    (async () => {
      try {
        await loadSummary();
        if (!cancelled) setLoadError(null);
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : 'Could not load your dashboard.',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, loadSummary]);

  useEffect(() => {
    if (!isAuthenticated || !user?.roles.includes('Donor')) return;
    setLoadError(null);
    let cancelled = false;
    (async () => {
      try {
        await loadDonations();
        if (!cancelled) setLoadError(null);
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : 'Could not load donations.',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, loadDonations]);

  useEffect(() => {
    setPageIndex(1);
  }, [tab]);

  async function handleNewDonation(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const amount = Number.parseFloat(newAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setSubmitError('Enter a valid amount greater than zero.');
      return;
    }
    setBusy(true);
    try {
      await createMyDonation({
        amount,
        isRecurring: newRecurring,
        recurringFrequency: newRecurring ? newRecurringFrequency : undefined,
        campaignName: newCampaign.trim() || undefined,
        notes: newNotes.trim() || undefined,
      });
      setNewAmount('');
      setNewRecurring(false);
      setNewRecurringFrequency('Monthly');
      setNewCampaign('');
      setNewNotes('');
      await loadSummary();
      await loadDonations();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Could not record donation.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveRecurringChange(d: Donation, nextRecurring: boolean) {
    setBusy(true);
    setManageError(null);
    try {
      const raw = editAmounts[d.donationId];
      const parsed = raw !== undefined && raw !== '' ? Number.parseFloat(raw) : NaN;
      const freq =
        nextRecurring
          ? editFrequencies[d.donationId] ??
            d.recurringFrequency ??
            'Monthly'
          : undefined;
      await updateMyDonation(d.donationId, {
        isRecurring: nextRecurring,
        recurringFrequency: nextRecurring ? freq : undefined,
        ...(Number.isFinite(parsed) && parsed > 0 ? { amount: parsed } : {}),
      });
      setEditAmounts((prev) => {
        const next = { ...prev };
        delete next[d.donationId];
        return next;
      });
      setEditFrequencies((prev) => {
        const next = { ...prev };
        delete next[d.donationId];
        return next;
      });
      await loadSummary();
      await loadDonations();
    } catch (err) {
      setManageError(
        err instanceof Error ? err.message : 'Could not update donation.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-card donor-dashboard-card">
          <p className="login-lede" style={{ marginBottom: 0 }}>
            Loading…
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.roles.includes('Donor')) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Donor area</h1>
          <p className="login-lede">
            This page is for donor accounts. You can continue to the public site
            or log in with a donor profile.
          </p>
          <p className="login-footer-note" style={{ borderTop: 'none', paddingTop: 0 }}>
            <Link to="/">Home</Link>
            {' · '}
            <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    );
  }

  if (user.supporterId == null) {
    return (
      <div className="login-page">
        <div className="login-card donor-dashboard-card">
          <h1>Donor area</h1>
          <p className="login-lede">
            Your login is not linked to a supporter profile yet. Please contact
            Havyn staff if you need help.
          </p>
          <p className="login-footer-note" style={{ borderTop: 'none', paddingTop: 0 }}>
            <Link to="/">Home</Link>
          </p>
        </div>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="login-page">
      <div className="login-card login-card--signup donor-dashboard-card">
        <header className="donor-dashboard-hero">
          <h1>Your giving dashboard</h1>
          <p className="donor-dashboard-subtitle">
            Thank you for standing with Havyn. Here you can record a gift, see
            your history, and update recurring pledges you have on file.
          </p>
          {user.email ? (
            <span className="donor-dashboard-email">{user.email}</span>
          ) : null}
        </header>

        {summary && (
          <div className="donor-dashboard-summary">
            <div className="donor-stat-grid">
              <div className="donor-stat-card">
                <span className="donor-stat-value">
                  {formatMoney(summary.totalLifetimeDonations)}
                </span>
                <span className="donor-stat-label">Total given</span>
              </div>
              <div className="donor-stat-card">
                <span className="donor-stat-value">{summary.donationCount}</span>
                <span className="donor-stat-label">Gifts recorded</span>
              </div>
              <div className="donor-stat-card">
                <span className="donor-stat-value">
                  {summary.activeRecurringCount}
                </span>
                <span className="donor-stat-label">Active pledges</span>
              </div>
            </div>
            <p>{summary.impactSummary}</p>
          </div>
        )}

        {loadError && <p className="donor-error">{loadError}</p>}

        <section className="donor-gift-panel" aria-labelledby="donor-new-title">
          <h2 id="donor-new-title">Make a gift</h2>
          <div className="donor-callout" role="note">
            <span className="donor-callout-icon" aria-hidden="true">
              i
            </span>
            <p>
              <strong>About recurring:</strong> Choosing &ldquo;Ongoing
              pledge&rdquo; saves your intent for our team—it does{' '}
              <strong>not</strong> charge your card automatically in this app.
              Timing and follow-up are coordinated with you separately (email or
              phone). You can still pick how often you&apos;d like that pledge to
              apply for our records.
            </p>
          </div>
          <form className="login-form" onSubmit={handleNewDonation}>
            <div className="login-field">
              <label htmlFor="donor-amount">Amount (PHP)</label>
              <input
                id="donor-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={newAmount}
                onChange={(ev) => setNewAmount(ev.target.value)}
                required
              />
            </div>
            <div className="login-field">
              <span id="donor-gift-type-label" className="donor-field-label">
                This gift is
              </span>
              <div
                className="donor-segment"
                role="group"
                aria-labelledby="donor-gift-type-label"
              >
                <button
                  type="button"
                  className={
                    !newRecurring ? 'donor-segment--active' : ''
                  }
                  onClick={() => setNewRecurring(false)}
                >
                  One-time
                </button>
                <button
                  type="button"
                  className={
                    newRecurring ? 'donor-segment--active' : ''
                  }
                  onClick={() => setNewRecurring(true)}
                >
                  Ongoing pledge
                </button>
              </div>
            </div>
            {newRecurring && (
              <div className="login-field">
                <label htmlFor="donor-frequency">How often (for our records)</label>
                <select
                  id="donor-frequency"
                  value={newRecurringFrequency}
                  onChange={(ev) =>
                    setNewRecurringFrequency(
                      ev.target.value as (typeof RECURRING_FREQUENCIES)[number],
                    )
                  }
                >
                  {RECURRING_FREQUENCIES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="login-field">
              <label htmlFor="donor-campaign">Campaign (optional)</label>
              <input
                id="donor-campaign"
                type="text"
                value={newCampaign}
                onChange={(ev) => setNewCampaign(ev.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="login-field">
              <label htmlFor="donor-notes">Note (optional)</label>
              <input
                id="donor-notes"
                type="text"
                value={newNotes}
                onChange={(ev) => setNewNotes(ev.target.value)}
                autoComplete="off"
              />
            </div>
            {submitError && <p className="donor-error">{submitError}</p>}
            <button type="submit" className="login-submit" disabled={busy}>
              {busy ? 'Saving…' : 'Submit gift'}
            </button>
          </form>
        </section>

        <div className="donor-tabs" role="tablist" aria-label="Donation views">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'history'}
            className={`donor-tab${tab === 'history' ? ' donor-tab--active' : ''}`}
            onClick={() => setTab('history')}
          >
            Donation history
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'manage'}
            className={`donor-tab${tab === 'manage' ? ' donor-tab--active' : ''}`}
            onClick={() => setTab('manage')}
          >
            Manage pledges
          </button>
        </div>

        {tab === 'history' && (
          <section aria-labelledby="donor-history-title">
            <h2 id="donor-history-title" className="visually-hidden">
              Donation history
            </h2>
            {donations.length === 0 ? (
              <div className="donor-empty-state">
                <p>
                  No gifts recorded yet. When you submit a gift above, it will
                  show up here with the amount and type.
                </p>
              </div>
            ) : (
              <div className="donor-donation-table-wrap">
                <table className="donor-donation-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Pledge</th>
                      <th>Frequency</th>
                      <th>Campaign</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map((d) => (
                      <tr key={d.donationId}>
                        <td>{formatDate(d.donationDate)}</td>
                        <td>{d.donationType}</td>
                        <td>
                          {formatMoney(d.amount ?? d.estimatedValue ?? 0)}
                        </td>
                        <td>{d.isRecurring ? 'Ongoing' : 'One-time'}</td>
                        <td>
                          {d.isRecurring
                            ? d.recurringFrequency ?? '—'
                            : '—'}
                        </td>
                        <td>{d.campaignName ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === 'manage' && (
          <section aria-labelledby="donor-manage-title">
            <h2 id="donor-manage-title" className="visually-hidden">
              Manage recurring pledges
            </h2>
            <div className="donor-callout" role="note">
              <span className="donor-callout-icon" aria-hidden="true">
                i
              </span>
              <p>
                Pledges marked ongoing are reminders for Havyn staff—they are
                not auto-charged in this app. Update the amount or frequency
                below, or end a pledge anytime.
              </p>
            </div>
            {manageError && <p className="donor-error">{manageError}</p>}
            {donations.length === 0 ? (
              <div className="donor-empty-state">
                <p>
                  You don&apos;t have any ongoing pledges yet. Submit a gift
                  above and choose &ldquo;Ongoing pledge,&rdquo; or ask staff to
                  link an existing recurring gift to your account.
                </p>
              </div>
            ) : (
              <div className="donor-donation-table-wrap">
                <table className="donor-donation-table">
                  <thead>
                    <tr>
                      <th>Started</th>
                      <th>Amount</th>
                      <th>Frequency</th>
                      <th>New amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map((d) => (
                      <tr key={d.donationId}>
                        <td>{formatDate(d.donationDate)}</td>
                        <td>
                          {formatMoney(d.amount ?? d.estimatedValue ?? 0)}
                        </td>
                        <td>
                          <select
                            className="donor-table-select"
                            aria-label={`Pledge frequency for gift ${d.donationId}`}
                            value={
                              editFrequencies[d.donationId] ??
                              d.recurringFrequency ??
                              'Monthly'
                            }
                            onChange={(ev) =>
                              setEditFrequencies((prev) => ({
                                ...prev,
                                [d.donationId]: ev.target.value,
                              }))
                            }
                          >
                            {RECURRING_FREQUENCIES.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            aria-label={`New amount for gift ${d.donationId}`}
                            placeholder="Amount"
                            value={
                              editAmounts[d.donationId] ??
                              String(d.amount ?? d.estimatedValue ?? '')
                            }
                            onChange={(ev) =>
                              setEditAmounts((prev) => ({
                                ...prev,
                                [d.donationId]: ev.target.value,
                              }))
                            }
                          />
                        </td>
                        <td>
                          <div className="donor-manage-row">
                            <button
                              type="button"
                              className="donor-btn-small donor-btn-small--primary"
                              disabled={busy}
                              onClick={() => saveRecurringChange(d, true)}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="donor-btn-small"
                              disabled={busy}
                              onClick={() => saveRecurringChange(d, false)}
                            >
                              End pledge
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {totalCount > pageSize && (
          <div className="donor-pagination">
            <button
              type="button"
              className="donor-btn-small"
              disabled={pageIndex <= 1 || busy}
              onClick={() => setPageIndex((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            {' '}
            Page {pageIndex} of {totalPages}
            {' '}
            <button
              type="button"
              className="donor-btn-small"
              disabled={pageIndex >= totalPages || busy}
              onClick={() => setPageIndex((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}

        <footer className="donor-footer-links">
          <Link to="/donor">See donor impact</Link>
          {' · '}
          <Link to="/">Back to home</Link>
        </footer>
      </div>
    </div>
  );
}

export default DonorHomePage;
