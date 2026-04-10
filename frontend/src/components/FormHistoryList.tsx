import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchFormHistory } from '../api/formHistoryApi';
import type { FormHistoryItem } from '../types/FormHistory';
import { deleteRecording } from '../api/processRecordingsApi';
import { deleteVisitation } from '../api/homeVisitationsApi';
import { deletePlan } from '../api/interventionPlansApi';
import { deleteIncident } from '../api/incidentReportsApi';
import { deleteHealthRecord } from '../api/healthWellbeingApi';
import { deleteEducationRecord } from '../api/educationRecordsApi';

const PAGE_SIZE = 25;

type SortOrder = 'asc' | 'desc';

const FORM_TYPE_LABELS: Record<string, string> = {
  'process-recording': 'Process Recording',
  'home-visitation': 'Home Visitation',
  'intervention-plan': 'Intervention Plan',
  'incident-report': 'Incident Report',
  'health-wellbeing': 'Health & Wellbeing',
  'education-record': 'Education Record',
};

function formatDate(value: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getDeleteAction(item: FormHistoryItem): (() => Promise<void>) | null {
  switch (item.formType) {
    case 'process-recording':
      return () => deleteRecording(item.recordId);
    case 'home-visitation':
      return () => deleteVisitation(item.recordId);
    case 'intervention-plan':
      return () => deletePlan(item.recordId);
    case 'incident-report':
      return () => deleteIncident(item.recordId);
    case 'health-wellbeing':
      return () => deleteHealthRecord(item.recordId);
    case 'education-record':
      return () => deleteEducationRecord(item.recordId);
    default:
      return null;
  }
}

export interface FormHistoryListProps {
  basePath: string;
  canManage: boolean;
  residentId?: number;
}

export default function FormHistoryList({
  basePath,
  canManage,
  residentId,
}: FormHistoryListProps) {
  const [items, setItems] = useState<FormHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [pendingDelete, setPendingDelete] = useState<FormHistoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(pageIndex, totalPages);

  useEffect(() => {
    setPageIndex(1);
  }, [residentId, sortOrder]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFormHistory({
        pageSize: PAGE_SIZE,
        pageIndex: safePage,
        sortOrder,
        residentId,
      });
      setItems(res.items ?? []);
      setTotalCount(res.totalCount ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load form history.');
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [residentId, safePage, sortOrder]);

  useEffect(() => {
    void load();
  }, [load]);

  const pageSummary = useMemo(() => {
    if (totalCount === 0) return '0 records';
    const start = (safePage - 1) * PAGE_SIZE + 1;
    const end = Math.min(totalCount, safePage * PAGE_SIZE);
    return `${start}-${end} of ${totalCount}`;
  }, [safePage, totalCount]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const action = getDeleteAction(pendingDelete);
    if (!action) return;

    setDeleting(true);
    try {
      await action();
      setPendingDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="card shadow-sm border-0">
      <div className="card-body p-3 p-md-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h2 className="h5 mb-0">Form History</h2>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setSortOrder((s) => (s === 'desc' ? 'asc' : 'desc'))}
          >
            {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
          </button>
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary mb-2" role="status" />
            <div className="text-muted small">Loading form history…</div>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Resident</th>
                    <th>Form Type</th>
                    <th>Submitted By</th>
                    <th>Summary</th>
                    {canManage && <th className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={canManage ? 6 : 5} className="text-center text-muted py-4">
                        No form records found.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={`${item.formType}-${item.recordId}`}>
                        <td>{formatDate(item.eventDate)}</td>
                        <td className="fw-semibold">{item.residentInternalCode || `#${item.residentId}`}</td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {FORM_TYPE_LABELS[item.formType] ?? item.formType}
                          </span>
                        </td>
                        <td>{item.submittedBy?.trim() || '—'}</td>
                        <td>{item.summary || '—'}</td>
                        {canManage && (
                          <td className="text-end">
                            <div className="d-inline-flex gap-2">
                              <Link
                                to={`${basePath}/forms/${item.formType}/${item.recordId}/edit`}
                                className="btn btn-theme-outline-edit btn-sm"
                              >
                                Edit
                              </Link>
                              <button
                                type="button"
                                className="btn btn-theme-outline-delete btn-sm"
                                onClick={() => setPendingDelete(item)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="text-muted small">{pageSummary}</span>
              <div className="btn-group">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={safePage <= 1}
                  onClick={() => setPageIndex((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPageIndex((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {pendingDelete && (
        <div
          className="modal d-block"
          tabIndex={-1}
          role="dialog"
          style={{ background: 'rgba(0,0,0,0.45)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setPendingDelete(null)}
                  disabled={deleting}
                />
              </div>
              <div className="modal-body">
                Delete this {FORM_TYPE_LABELS[pendingDelete.formType] ?? pendingDelete.formType} record for resident{' '}
                <strong>{pendingDelete.residentInternalCode || `#${pendingDelete.residentId}`}</strong>?
                This action cannot be undone.
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setPendingDelete(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-theme-delete btn-sm"
                  onClick={() => void confirmDelete()}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
