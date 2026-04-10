import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { apiFetch } from '../api/apiHelper';
import { useAuth } from '../context/AuthContext';
import type { Partner } from '../types/Partner';
import type { PartnerAssignment } from '../types/PartnerAssignment';
import type { Safehouse } from '../types/Safehouse';

const PROGRAM_AREAS = [
  'Education',
  'Wellbeing',
  'Operations',
  'Transport',
  'Maintenance',
  'Outreach',
] as const;

type ListSortCol =
  | 'partnerName'
  | 'partnerType'
  | 'roleType'
  | 'region'
  | 'status'
  | 'startDate'
  | 'endDate'
  | 'contactName';

function extractItems<T>(raw: unknown): T[] {
  if (!raw || typeof raw !== 'object') return [];
  const o = raw as { items?: T[]; Items?: T[] };
  return o.items ?? o.Items ?? (Array.isArray(raw) ? (raw as T[]) : []);
}

function extractTotalCount(raw: unknown): number {
  if (!raw || typeof raw !== 'object') return 0;
  const o = raw as { totalCount?: number; TotalCount?: number };
  return o.totalCount ?? o.TotalCount ?? 0;
}

function appendRepeated(
  sp: URLSearchParams,
  key: string,
  values: string[] | undefined
): void {
  if (!values?.length) return;
  for (const v of values) sp.append(key, v);
}

function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizePartner(raw: Record<string, unknown>): Partner {
  return {
    partnerId: Number(raw.partnerId ?? raw.PartnerId ?? 0),
    partnerName: String(raw.partnerName ?? raw.PartnerName ?? ''),
    partnerType: String(raw.partnerType ?? raw.PartnerType ?? ''),
    roleType: String(raw.roleType ?? raw.RoleType ?? ''),
    contactName: String(raw.contactName ?? raw.ContactName ?? ''),
    email: String(raw.email ?? raw.Email ?? ''),
    phone: String(raw.phone ?? raw.Phone ?? ''),
    region: String(raw.region ?? raw.Region ?? ''),
    status: String(raw.status ?? raw.Status ?? ''),
    startDate: String(raw.startDate ?? raw.StartDate ?? ''),
    endDate:
      raw.endDate != null || raw.EndDate != null
        ? String(raw.endDate ?? raw.EndDate)
        : null,
    notes:
      raw.notes != null || raw.Notes != null
        ? String(raw.notes ?? raw.Notes)
        : null,
  };
}

function normalizeAssignment(raw: Record<string, unknown>): PartnerAssignment {
  const sh = raw.safehouseId ?? raw.SafehouseId;
  return {
    assignmentId: Number(raw.assignmentId ?? raw.AssignmentId ?? 0),
    partnerId: Number(raw.partnerId ?? raw.PartnerId ?? 0),
    safehouseId: sh != null && sh !== '' ? Number(sh) : null,
    programArea: String(raw.programArea ?? raw.ProgramArea ?? ''),
    assignmentStart: String(raw.assignmentStart ?? raw.AssignmentStart ?? ''),
    assignmentEnd:
      raw.assignmentEnd != null || raw.AssignmentEnd != null
        ? String(raw.assignmentEnd ?? raw.AssignmentEnd)
        : null,
    responsibilityNotes:
      raw.responsibilityNotes != null || raw.ResponsibilityNotes != null
        ? String(raw.responsibilityNotes ?? raw.ResponsibilityNotes)
        : null,
    isPrimary: Boolean(raw.isPrimary ?? raw.IsPrimary),
    status: String(raw.status ?? raw.Status ?? ''),
  };
}

function sortPartners(
  arr: Partner[],
  col: ListSortCol,
  dir: 'asc' | 'desc'
): Partner[] {
  const m = dir === 'asc' ? 1 : -1;
  return [...arr].sort((a, b) => {
    let c = 0;
    switch (col) {
      case 'partnerName':
        c = a.partnerName.localeCompare(b.partnerName, undefined, {
          sensitivity: 'base',
        });
        break;
      case 'partnerType':
        c = a.partnerType.localeCompare(b.partnerType, undefined, {
          sensitivity: 'base',
        });
        break;
      case 'roleType':
        c = a.roleType.localeCompare(b.roleType, undefined, {
          sensitivity: 'base',
        });
        break;
      case 'region':
        c = a.region.localeCompare(b.region, undefined, { sensitivity: 'base' });
        break;
      case 'status':
        c = a.status.localeCompare(b.status, undefined, { sensitivity: 'base' });
        break;
      case 'startDate':
        c = String(a.startDate).localeCompare(String(b.startDate));
        break;
      case 'endDate':
        c = String(a.endDate ?? '').localeCompare(String(b.endDate ?? ''));
        break;
      case 'contactName':
        c = a.contactName.localeCompare(b.contactName, undefined, {
          sensitivity: 'base',
        });
        break;
      default:
        c = 0;
    }
    return m * c;
  });
}

function apiSortKey(col: ListSortCol): string | null {
  switch (col) {
    case 'partnerName':
      return 'PartnerName';
    case 'status':
      return 'Status';
    case 'startDate':
      return 'StartDate';
    case 'region':
      return 'Region';
    default:
      return null;
  }
}

function MultiCheckboxDropdown<T extends string | number>({
  label,
  selected,
  onChange,
  options,
  buttonMinWidth = 200,
}: {
  label: string;
  selected: T[];
  onChange: (next: T[]) => void;
  options: { value: T; label: string }[];
  buttonMinWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const summary =
    selected.length === 0
      ? 'All'
      : selected.length === 1
        ? options.find((o) => o.value === selected[0])?.label ?? String(selected[0])
        : `${selected.length} selected`;

  const toggle = (value: T) => {
    if (selected.includes(value)) {
      onChange(selected.filter((x) => x !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div ref={rootRef} className="position-relative">
      <label htmlFor={btnId} className="form-label small mb-0">
        {label}
      </label>
      <button
        id={btnId}
        type="button"
        className="form-select form-select-sm text-start d-flex align-items-center justify-content-between gap-1 cursor-pointer"
        style={{ minWidth: buttonMinWidth }}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-truncate">{summary}</span>
        <span className="text-muted flex-shrink-0 small" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div
          className="position-absolute border rounded bg-white shadow-sm mt-1 py-2 px-2 start-0"
          style={{ zIndex: 1050, minWidth: 'max(100%, 220px)', maxHeight: 260, overflowY: 'auto' }}
          role="listbox"
        >
          {options.map((opt) => (
            <label
              key={String(opt.value)}
              className="d-flex align-items-center gap-2 small mb-0 py-1 px-1 rounded user-select-none"
              style={{ cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                className="form-check-input mt-0 flex-shrink-0"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SortableTh({
  label,
  col,
  activeCol,
  order,
  onSort,
}: {
  label: string;
  col: ListSortCol;
  activeCol: ListSortCol;
  order: 'asc' | 'desc';
  onSort: (c: ListSortCol) => void;
}) {
  const active = activeCol === col;
  return (
    <th
      role="button"
      className="user-select-none"
      onClick={() => onSort(col)}
      style={{ cursor: 'pointer' }}
    >
      {label}
      {active ? (order === 'asc' ? ' \u25B2' : ' \u25BC') : ''}
    </th>
  );
}

export default function PartnersPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const role: 'admin' | 'manager' | 'staff' | null = user?.roles.includes('Admin')
    ? 'admin'
    : user?.roles.includes('Manager')
      ? 'manager'
      : user?.roles.includes('SocialWorker')
        ? 'staff'
        : null;

  const safehouseId = user?.safehouseId ?? null;
  const isAdmin = role === 'admin';

  const [alerts, setAlerts] = useState<{ id: string; message: string }[]>([]);
  const pushAlert = useCallback((message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setAlerts((a) => [...a, { id, message }]);
  }, []);

  const [listReload, setListReload] = useState(0);
  const [pageIndex, setPageIndex] = useState(1);
  const [listSortCol, setListSortCol] = useState<ListSortCol>('partnerName');
  const [listSortOrder, setListSortOrder] = useState<'asc' | 'desc'>('asc');
  const [roleTypesSel, setRoleTypesSel] = useState<string[]>([]);
  const [regionFilter, setRegionFilter] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  const [roleFilterOptions, setRoleFilterOptions] = useState<string[]>([]);
  const [regionFilterOptions, setRegionFilterOptions] = useState<string[]>([]);

  const [listLoading, setListLoading] = useState(false);
  const [partnersRows, setPartnersRows] = useState<Partner[]>([]);
  const [partnersTotal, setPartnersTotal] = useState(0);

  const [managerBulkPartners, setManagerBulkPartners] = useState<Partner[] | null>(
    null
  );
  const [managerDataLoading, setManagerDataLoading] = useState(false);

  const roleTypeDropdownOptions = useMemo(
    () => roleFilterOptions.map((r) => ({ value: r, label: r })),
    [roleFilterOptions]
  );

  useEffect(() => {
    if (role !== 'admin') return;
    let cancelled = false;
    (async () => {
      try {
        const raw = await apiFetch<unknown>(
          '/api/Partners/AllPartners?pageSize=300&pageIndex=1&sortBy=PartnerName&sortOrder=asc'
        );
        const items = extractItems<Record<string, unknown>>(raw).map(normalizePartner);
        const roles = new Set<string>();
        const regs = new Set<string>();
        for (const p of items) {
          if (p.roleType.trim()) roles.add(p.roleType);
          if (p.region.trim()) regs.add(p.region);
        }
        if (!cancelled) {
          setRoleFilterOptions([...roles].sort((a, b) => a.localeCompare(b)));
          setRegionFilterOptions([...regs].sort((a, b) => a.localeCompare(b)));
        }
      } catch {
        /* ignore seed failure */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    if (role !== 'admin') return;
    let cancelled = false;
    (async () => {
      setListLoading(true);
      try {
        const sp = new URLSearchParams();
        sp.set('pageSize', '25');
        sp.set('pageIndex', String(pageIndex));
        const apiKey = apiSortKey(listSortCol);
        if (apiKey) {
          sp.set('sortBy', apiKey);
          sp.set('sortOrder', listSortOrder);
        } else {
          sp.set('sortBy', 'PartnerName');
          sp.set('sortOrder', 'asc');
        }
        if (roleTypesSel.length > 0) appendRepeated(sp, 'roleTypes', roleTypesSel);
        if (regionFilter.trim()) sp.set('region', regionFilter.trim());
        appendRepeated(
          sp,
          'statuses',
          includeInactive ? ['Active', 'Inactive'] : ['Active']
        );
        const raw = await apiFetch<unknown>(`/api/Partners/AllPartners?${sp.toString()}`);
        if (cancelled) return;
        let items = extractItems<Record<string, unknown>>(raw).map(normalizePartner);
        if (!apiKey) {
          items = sortPartners(items, listSortCol, listSortOrder);
        }
        setPartnersRows(items);
        setPartnersTotal(extractTotalCount(raw));
      } catch (e) {
        if (!cancelled) {
          pushAlert(e instanceof Error ? e.message : 'Failed to load partners.');
          setPartnersRows([]);
          setPartnersTotal(0);
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    role,
    pageIndex,
    listSortCol,
    listSortOrder,
    roleTypesSel,
    regionFilter,
    includeInactive,
    listReload,
    pushAlert,
  ]);

  useEffect(() => {
    if (role !== 'manager') {
      setManagerBulkPartners(null);
      return;
    }
    if (safehouseId == null) {
      setManagerBulkPartners([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setManagerDataLoading(true);
      try {
        const assignRaw = await apiFetch<unknown>(
          `/api/PartnerAssignments/BySafehouse/${safehouseId}`
        );
        const assignList = Array.isArray(assignRaw)
          ? (assignRaw as Record<string, unknown>[])
          : extractItems<Record<string, unknown>>(assignRaw);
        const allowed = new Set<number>();
        for (const a of assignList) {
          const pid = a.partnerId ?? a.PartnerId;
          if (pid != null) allowed.add(Number(pid));
        }
        const all: Partner[] = [];
        let p = 1;
        const ps = 100;
        let tc = Infinity;
        while (!cancelled && all.length < 5000 && (p - 1) * ps < tc) {
          const raw = await apiFetch<unknown>(
            `/api/Partners/AllPartners?pageSize=${ps}&pageIndex=${p}&sortBy=PartnerName&sortOrder=asc`
          );
          const chunk = extractItems<Record<string, unknown>>(raw).map(normalizePartner);
          tc = extractTotalCount(raw);
          all.push(...chunk);
          if (chunk.length < ps) break;
          p++;
        }
        if (cancelled) return;
        const scoped = all.filter((x) => allowed.has(x.partnerId));
        setManagerBulkPartners(scoped);
        const roles = new Set<string>();
        const regs = new Set<string>();
        for (const x of scoped) {
          if (x.roleType.trim()) roles.add(x.roleType);
          if (x.region.trim()) regs.add(x.region);
        }
        setRoleFilterOptions([...roles].sort((a, b) => a.localeCompare(b)));
        setRegionFilterOptions([...regs].sort((a, b) => a.localeCompare(b)));
      } catch (e) {
        if (!cancelled) {
          pushAlert(e instanceof Error ? e.message : 'Failed to load partners.');
          setManagerBulkPartners([]);
        }
      } finally {
        if (!cancelled) setManagerDataLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, safehouseId, listReload, pushAlert]);

  const managerFilteredSorted = useMemo(() => {
    if (managerBulkPartners == null) return [];
    let list = [...managerBulkPartners];
    if (roleTypesSel.length > 0) {
      list = list.filter((p) => roleTypesSel.includes(p.roleType));
    }
    if (regionFilter.trim()) {
      list = list.filter((p) => p.region === regionFilter.trim());
    }
    if (!includeInactive) {
      list = list.filter((p) => p.status === 'Active');
    }
    return sortPartners(list, listSortCol, listSortOrder);
  }, [
    managerBulkPartners,
    roleTypesSel,
    regionFilter,
    includeInactive,
    listSortCol,
    listSortOrder,
  ]);

  const managerDisplayRows = useMemo(() => {
    const start = (pageIndex - 1) * 25;
    return managerFilteredSorted.slice(start, start + 25);
  }, [managerFilteredSorted, pageIndex]);

  const managerTotal = managerFilteredSorted.length;

  const displayRows = role === 'admin' ? partnersRows : managerDisplayRows;
  const totalCount = role === 'admin' ? partnersTotal : managerTotal;
  const tableLoading = role === 'admin' ? listLoading : managerDataLoading;

  const totalPages = Math.max(1, Math.ceil(totalCount / 25));

  const handleSort = (col: ListSortCol) => {
    if (listSortCol === col) {
      setListSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setListSortCol(col);
      setListSortOrder('asc');
    }
    setPageIndex(1);
  };

  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [detailPartner, setDetailPartner] = useState<Partner | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailEditing, setDetailEditing] = useState(false);
  const [detailDraft, setDetailDraft] = useState<Partner | null>(null);
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailDeleting, setDetailDeleting] = useState(false);

  const [assignments, setAssignments] = useState<PartnerAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  const [allSafehouses, setAllSafehouses] = useState<Safehouse[]>([]);

  useEffect(() => {
    if (role !== 'admin' && role !== 'manager') return;
    let cancelled = false;
    (async () => {
      const acc: Safehouse[] = [];
      let p = 1;
      try {
        while (!cancelled) {
          const raw = await apiFetch<unknown>(
            `/api/Safehouses/AllSafehouses?pageSize=20&pageIndex=${p}`
          );
          const items = extractItems<Safehouse>(raw);
          const tc = extractTotalCount(raw);
          acc.push(...items);
          if (items.length === 0 || acc.length >= tc) break;
          p++;
        }
        if (!cancelled) setAllSafehouses(acc);
      } catch {
        if (!cancelled) pushAlert('Failed to load safehouses.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, pushAlert]);

  const safehouseLabel = useCallback(
    (id: number | null | undefined) => {
      if (id == null) return '—';
      const sh = allSafehouses.find((s) => s.safehouseId === id);
      if (!sh) return `#${id}`;
      const city = sh.city?.trim();
      return city || sh.name || `#${id}`;
    },
    [allSafehouses]
  );

  const loadDetail = useCallback(
    async (partnerId: number) => {
      setDetailLoading(true);
      try {
        const raw = await apiFetch<Record<string, unknown>>(
          `/api/Partners/GetPartner/${partnerId}`
        );
        const p = normalizePartner(raw);
        setDetailPartner(p);
        setDetailDraft(p);
        setDetailEditing(false);
      } catch (e) {
        pushAlert(e instanceof Error ? e.message : 'Failed to load partner.');
        setSelectedPartnerId(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [pushAlert]
  );

  const loadAssignments = useCallback(
    async (partnerId: number) => {
      setAssignmentsLoading(true);
      try {
        const raw = await apiFetch<unknown>(
          `/api/PartnerAssignments/ByPartner/${partnerId}`
        );
        const arr = Array.isArray(raw)
          ? (raw as Record<string, unknown>[])
          : extractItems<Record<string, unknown>>(raw);
        setAssignments(arr.map(normalizeAssignment));
      } catch (e) {
        pushAlert(e instanceof Error ? e.message : 'Failed to load assignments.');
        setAssignments([]);
      } finally {
        setAssignmentsLoading(false);
      }
    },
    [pushAlert]
  );

  useEffect(() => {
    if (selectedPartnerId == null) {
      setDetailPartner(null);
      setDetailDraft(null);
      setAssignments([]);
      return;
    }
    void loadDetail(selectedPartnerId);
    void loadAssignments(selectedPartnerId);
  }, [selectedPartnerId, loadDetail, loadAssignments]);

  const [newModalOpen, setNewModalOpen] = useState(false);
  const [npName, setNpName] = useState('');
  const [npType, setNpType] = useState('');
  const [npRole, setNpRole] = useState('');
  const [npContact, setNpContact] = useState('');
  const [npEmail, setNpEmail] = useState('');
  const [npPhone, setNpPhone] = useState('');
  const [npRegion, setNpRegion] = useState('');
  const [npStatus, setNpStatus] = useState<'Active' | 'Inactive'>('Active');
  const [npStart, setNpStart] = useState(() => formatDateYMD(new Date()));
  const [npEnd, setNpEnd] = useState('');
  const [npNotes, setNpNotes] = useState('');
  const [npSaving, setNpSaving] = useState(false);

  const resetNewModal = () => {
    setNpName('');
    setNpType('');
    setNpRole('');
    setNpContact('');
    setNpEmail('');
    setNpPhone('');
    setNpRegion('');
    setNpStatus('Active');
    setNpStart(formatDateYMD(new Date()));
    setNpEnd('');
    setNpNotes('');
  };

  const submitNewPartner = async () => {
    if (!npName.trim() || !npType.trim() || !npRole.trim()) {
      pushAlert('Partner name, type, and role are required.');
      return;
    }
    if (!npContact.trim() || !npEmail.trim()) {
      pushAlert('Contact name and email are required.');
      return;
    }
    if (!npPhone.trim() || !npRegion.trim()) {
      pushAlert('Phone and region are required.');
      return;
    }
    if (!npStart.trim()) {
      pushAlert('Start date is required.');
      return;
    }
    setNpSaving(true);
    try {
      const body = {
        partnerName: npName.trim(),
        partnerType: npType.trim(),
        roleType: npRole.trim(),
        contactName: npContact.trim(),
        email: npEmail.trim(),
        phone: npPhone.trim(),
        region: npRegion.trim(),
        status: npStatus,
        startDate: npStart,
        endDate: npEnd.trim() || null,
        notes: npNotes.trim() || null,
      };
      const created = await apiFetch<Record<string, unknown>>('/api/Partners/AddPartner', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const p = normalizePartner(created);
      pushAlert('Partner created.');
      setNewModalOpen(false);
      resetNewModal();
      setListReload((x) => x + 1);
      setSelectedPartnerId(p.partnerId);
      setPageIndex(1);
    } catch (e) {
      pushAlert(e instanceof Error ? e.message : 'Failed to create partner.');
    } finally {
      setNpSaving(false);
    }
  };

  const saveDetail = async () => {
    if (!detailDraft || selectedPartnerId == null) return;
    setDetailSaving(true);
    try {
      const body = {
        partnerName: detailDraft.partnerName,
        partnerType: detailDraft.partnerType,
        roleType: detailDraft.roleType,
        contactName: detailDraft.contactName,
        email: detailDraft.email,
        phone: detailDraft.phone,
        region: detailDraft.region,
        status: detailDraft.status,
        startDate: detailDraft.startDate,
        endDate: detailDraft.endDate || null,
        notes: detailDraft.notes ?? null,
      };
      const updated = await apiFetch<Record<string, unknown>>(
        `/api/Partners/UpdatePartner/${selectedPartnerId}`,
        { method: 'PUT', body: JSON.stringify(body) }
      );
      const p = normalizePartner(updated);
      setDetailPartner(p);
      setDetailDraft(p);
      setDetailEditing(false);
      pushAlert('Partner saved.');
      setListReload((x) => x + 1);
    } catch (e) {
      pushAlert(e instanceof Error ? e.message : 'Failed to save partner.');
    } finally {
      setDetailSaving(false);
    }
  };

  const cancelDetailEdit = () => {
    if (detailPartner) setDetailDraft({ ...detailPartner });
    setDetailEditing(false);
  };

  const markInactive = () => {
    if (
      !window.confirm(
        'Mark this partner as Inactive? They will no longer appear in active partner lists.'
      )
    ) {
      return;
    }
    if (!detailPartner || selectedPartnerId == null) return;
    void (async () => {
      setDetailSaving(true);
      try {
        const body = {
          partnerName: detailPartner.partnerName,
          partnerType: detailPartner.partnerType,
          roleType: detailPartner.roleType,
          contactName: detailPartner.contactName,
          email: detailPartner.email,
          phone: detailPartner.phone,
          region: detailPartner.region,
          status: 'Inactive',
          startDate: detailPartner.startDate,
          endDate: detailPartner.endDate || null,
          notes: detailPartner.notes ?? null,
        };
        const updated = await apiFetch<Record<string, unknown>>(
          `/api/Partners/UpdatePartner/${selectedPartnerId}`,
          { method: 'PUT', body: JSON.stringify(body) }
        );
        const p = normalizePartner(updated);
        setDetailPartner(p);
        setDetailDraft(p);
        setDetailEditing(false);
        pushAlert('Partner marked inactive.');
        setListReload((x) => x + 1);
      } catch (e) {
        pushAlert(e instanceof Error ? e.message : 'Failed to update partner.');
      } finally {
        setDetailSaving(false);
      }
    })();
  };

  const deletePartner = async () => {
    if (selectedPartnerId == null || !detailPartner) return;
    const n = assignments.length;
    const msg =
      n > 0
        ? `Delete this partner and ${n} assignment(s)? This cannot be undone.`
        : 'Delete this partner? This cannot be undone.';
    if (!window.confirm(msg)) return;
    setDetailDeleting(true);
    try {
      await apiFetch(`/api/Partners/DeletePartner/${selectedPartnerId}`, {
        method: 'DELETE',
      });
      pushAlert('Partner deleted.');
      setSelectedPartnerId(null);
      setListReload((x) => x + 1);
    } catch (e) {
      pushAlert(e instanceof Error ? e.message : 'Failed to delete partner.');
    } finally {
      setDetailDeleting(false);
    }
  };

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignEditId, setAssignEditId] = useState<number | null>(null);
  const [asSafehouseId, setAsSafehouseId] = useState<number | ''>('');
  const [asProgram, setAsProgram] = useState<string>(PROGRAM_AREAS[0]);
  const [asStart, setAsStart] = useState(() => formatDateYMD(new Date()));
  const [asEnd, setAsEnd] = useState('');
  const [asPrimary, setAsPrimary] = useState(false);
  const [asNotes, setAsNotes] = useState('');
  const [asStatus, setAsStatus] = useState('Active');
  const [asSaving, setAsSaving] = useState(false);

  const openAddAssignment = () => {
    setAssignEditId(null);
    setAsSafehouseId('');
    setAsProgram(PROGRAM_AREAS[0]);
    setAsStart(formatDateYMD(new Date()));
    setAsEnd('');
    setAsPrimary(false);
    setAsNotes('');
    setAsStatus('Active');
    setAssignModalOpen(true);
  };

  const openEditAssignment = (a: PartnerAssignment) => {
    setAssignEditId(a.assignmentId);
    setAsSafehouseId(a.safehouseId ?? '');
    setAsProgram(a.programArea);
    setAsStart(String(a.assignmentStart).slice(0, 10));
    setAsEnd(a.assignmentEnd ? String(a.assignmentEnd).slice(0, 10) : '');
    setAsPrimary(a.isPrimary);
    setAsNotes(a.responsibilityNotes ?? '');
    setAsStatus(a.status);
    setAssignModalOpen(true);
  };

  const closeAssignModal = () => {
    setAssignModalOpen(false);
    setAssignEditId(null);
  };

  const submitAssignment = async () => {
    if (selectedPartnerId == null) return;
    const sid =
      typeof asSafehouseId === 'number' ? asSafehouseId : Number(asSafehouseId);
    if (!Number.isFinite(sid) || sid <= 0) {
      pushAlert('Select a safehouse.');
      return;
    }
    setAsSaving(true);
    try {
      if (assignEditId == null) {
        const body = {
          partnerId: selectedPartnerId,
          safehouseId: sid,
          programArea: asProgram,
          assignmentStart: asStart,
          assignmentEnd: asEnd.trim() || null,
          responsibilityNotes: asNotes.trim() || null,
          isPrimary: asPrimary,
          status: asStatus || 'Active',
        };
        await apiFetch('/api/PartnerAssignments/AddAssignment', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        pushAlert('Assignment added.');
      } else {
        const body = {
          partnerId: selectedPartnerId,
          safehouseId: sid,
          programArea: asProgram,
          assignmentStart: asStart,
          assignmentEnd: asEnd.trim() || null,
          responsibilityNotes: asNotes.trim() || null,
          isPrimary: asPrimary,
          status: asStatus || 'Active',
        };
        await apiFetch(`/api/PartnerAssignments/UpdateAssignment/${assignEditId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        pushAlert('Assignment updated.');
      }
      closeAssignModal();
      await loadAssignments(selectedPartnerId);
      setListReload((x) => x + 1);
    } catch (e) {
      pushAlert(e instanceof Error ? e.message : 'Failed to save assignment.');
    } finally {
      setAsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
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

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      {alerts.map((a) => (
        <div key={a.id} className="alert alert-warning alert-dismissible" role="alert">
          {a.message}
          <button
            type="button"
            className="btn-close"
            aria-label="Dismiss"
            onClick={() => setAlerts((x) => x.filter((y) => y.id !== a.id))}
          />
        </div>
      ))}

      <div className="row g-4">
        <div className={selectedPartnerId != null ? 'col-lg-8' : 'col-12'}>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <h1 className="h3 fw-bold mb-0">Partners</h1>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-sm"
                style={{ backgroundColor: '#4A6FA5', borderColor: '#4A6FA5', color: '#fff' }}
                onClick={() => {
                  resetNewModal();
                  setNewModalOpen(true);
                }}
              >
                + New Partner
              </button>
            )}
          </div>

          {role === 'manager' && safehouseId == null && (
            <p className="text-muted small">No safehouse is assigned to your account.</p>
          )}

          <div className="d-flex flex-wrap gap-3 align-items-end mb-3">
            <MultiCheckboxDropdown
              label="Role type"
              selected={roleTypesSel}
              onChange={(next) => {
                setRoleTypesSel(next.sort((a, b) => a.localeCompare(b)));
                setPageIndex(1);
              }}
              options={roleTypeDropdownOptions}
            />
            <div>
              <label className="form-label small mb-0">Region</label>
              <select
                className="form-select form-select-sm"
                style={{ minWidth: 160 }}
                value={regionFilter}
                onChange={(e) => {
                  setRegionFilter(e.target.value);
                  setPageIndex(1);
                }}
              >
                <option value="">All regions</option>
                {regionFilterOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-check mb-0 d-flex align-items-center">
              <input
                id="inc-inactive"
                type="checkbox"
                className="form-check-input"
                checked={includeInactive}
                onChange={(e) => {
                  setIncludeInactive(e.target.checked);
                  setPageIndex(1);
                }}
              />
              <label className="form-check-label small ms-2 mb-0" htmlFor="inc-inactive">
                Include inactive
              </label>
            </div>
          </div>

          {tableLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" />
            </div>
          ) : (
            <div className="table-responsive shadow-sm rounded border">
              <table className="table table-hover table-sm mb-0">
                <thead className="table-light">
                  <tr>
                    <SortableTh
                      label="Partner name"
                      col="partnerName"
                      activeCol={listSortCol}
                      order={listSortOrder}
                      onSort={handleSort}
                    />
                    <SortableTh
                      label="Partner type"
                      col="partnerType"
                      activeCol={listSortCol}
                      order={listSortOrder}
                      onSort={handleSort}
                    />
                    <SortableTh
                      label="Role type"
                      col="roleType"
                      activeCol={listSortCol}
                      order={listSortOrder}
                      onSort={handleSort}
                    />
                    <SortableTh
                      label="Region"
                      col="region"
                      activeCol={listSortCol}
                      order={listSortOrder}
                      onSort={handleSort}
                    />
                    <SortableTh
                      label="Status"
                      col="status"
                      activeCol={listSortCol}
                      order={listSortOrder}
                      onSort={handleSort}
                    />
                    <SortableTh
                      label="Start date"
                      col="startDate"
                      activeCol={listSortCol}
                      order={listSortOrder}
                      onSort={handleSort}
                    />
                    <SortableTh
                      label="End date"
                      col="endDate"
                      activeCol={listSortCol}
                      order={listSortOrder}
                      onSort={handleSort}
                    />
                    <SortableTh
                      label="Primary contact"
                      col="contactName"
                      activeCol={listSortCol}
                      order={listSortOrder}
                      onSort={handleSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((p) => (
                    <tr
                      key={p.partnerId}
                      role="button"
                      className={selectedPartnerId === p.partnerId ? 'table-active' : ''}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedPartnerId(p.partnerId)}
                    >
                      <td className="fw-semibold">{p.partnerName}</td>
                      <td>{p.partnerType}</td>
                      <td>{p.roleType}</td>
                      <td>{p.region || '—'}</td>
                      <td>
                        <span
                          className={`badge ${p.status === 'Active' ? 'bg-success' : 'bg-secondary'}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td>{String(p.startDate).slice(0, 10)}</td>
                      <td>{p.endDate ? String(p.endDate).slice(0, 10) : '—'}</td>
                      <td>{p.contactName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="d-flex justify-content-between align-items-center mt-3">
            <span className="text-muted small">
              {totalCount} total · page {pageIndex} of {totalPages}
            </span>
            <div className="btn-group">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={pageIndex <= 1}
                onClick={() => setPageIndex((x) => Math.max(1, x - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={pageIndex >= totalPages}
                onClick={() => setPageIndex((x) => x + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {selectedPartnerId != null && (
          <div className="col-lg-4">
            <div className="border rounded shadow-sm p-3 sticky-top" style={{ top: '1rem' }}>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <h2 className="h6 fw-bold mb-0">Partner detail</h2>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setSelectedPartnerId(null)}
                >
                  Close
                </button>
              </div>

              {detailLoading || !detailDraft ? (
                <div className="text-center py-4">
                  <div className="spinner-border spinner-border-sm text-primary" />
                </div>
              ) : (
                <>
                  {!detailEditing ? (
                    <dl className="row small mb-0">
                      <dt className="col-sm-4">Name</dt>
                      <dd className="col-sm-8">{detailDraft.partnerName}</dd>
                      <dt className="col-sm-4">Type</dt>
                      <dd className="col-sm-8">{detailDraft.partnerType}</dd>
                      <dt className="col-sm-4">Role</dt>
                      <dd className="col-sm-8">{detailDraft.roleType}</dd>
                      <dt className="col-sm-4">Contact</dt>
                      <dd className="col-sm-8">{detailDraft.contactName}</dd>
                      <dt className="col-sm-4">Email</dt>
                      <dd className="col-sm-8">{detailDraft.email}</dd>
                      <dt className="col-sm-4">Phone</dt>
                      <dd className="col-sm-8">{detailDraft.phone || '—'}</dd>
                      <dt className="col-sm-4">Region</dt>
                      <dd className="col-sm-8">{detailDraft.region || '—'}</dd>
                      <dt className="col-sm-4">Status</dt>
                      <dd className="col-sm-8">
                        <span
                          className={`badge ${detailDraft.status === 'Active' ? 'bg-success' : 'bg-secondary'}`}
                        >
                          {detailDraft.status}
                        </span>
                      </dd>
                      <dt className="col-sm-4">Start</dt>
                      <dd className="col-sm-8">{String(detailDraft.startDate).slice(0, 10)}</dd>
                      <dt className="col-sm-4">End</dt>
                      <dd className="col-sm-8">
                        {detailDraft.endDate
                          ? String(detailDraft.endDate).slice(0, 10)
                          : '—'}
                      </dd>
                      <dt className="col-sm-4">Notes</dt>
                      <dd className="col-sm-8 text-break">{detailDraft.notes || '—'}</dd>
                    </dl>
                  ) : (
                    <div className="vstack gap-2 small">
                      <div>
                        <label className="form-label small mb-0">Partner name</label>
                        <input
                          className="form-control form-control-sm"
                          value={detailDraft.partnerName}
                          onChange={(e) =>
                            setDetailDraft((d) =>
                              d ? { ...d, partnerName: e.target.value } : d
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="form-label small mb-0">Partner type</label>
                        <input
                          className="form-control form-control-sm"
                          value={detailDraft.partnerType}
                          onChange={(e) =>
                            setDetailDraft((d) =>
                              d ? { ...d, partnerType: e.target.value } : d
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="form-label small mb-0">Role type</label>
                        <input
                          className="form-control form-control-sm"
                          value={detailDraft.roleType}
                          onChange={(e) =>
                            setDetailDraft((d) =>
                              d ? { ...d, roleType: e.target.value } : d
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="form-label small mb-0">Contact name</label>
                        <input
                          className="form-control form-control-sm"
                          value={detailDraft.contactName}
                          onChange={(e) =>
                            setDetailDraft((d) =>
                              d ? { ...d, contactName: e.target.value } : d
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="form-label small mb-0">Email</label>
                        <input
                          className="form-control form-control-sm"
                          type="email"
                          value={detailDraft.email}
                          onChange={(e) =>
                            setDetailDraft((d) => (d ? { ...d, email: e.target.value } : d))
                          }
                        />
                      </div>
                      <div>
                        <label className="form-label small mb-0">Phone</label>
                        <input
                          className="form-control form-control-sm"
                          value={detailDraft.phone}
                          onChange={(e) =>
                            setDetailDraft((d) => (d ? { ...d, phone: e.target.value } : d))
                          }
                        />
                      </div>
                      <div>
                        <label className="form-label small mb-0">Region</label>
                        <input
                          className="form-control form-control-sm"
                          value={detailDraft.region}
                          onChange={(e) =>
                            setDetailDraft((d) => (d ? { ...d, region: e.target.value } : d))
                          }
                        />
                      </div>
                      <div>
                        <label className="form-label small mb-0">Status</label>
                        <select
                          className="form-select form-select-sm"
                          value={detailDraft.status}
                          onChange={(e) =>
                            setDetailDraft((d) =>
                              d ? { ...d, status: e.target.value } : d
                            )
                          }
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label small mb-0">Start date</label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={String(detailDraft.startDate).slice(0, 10)}
                          onChange={(e) =>
                            setDetailDraft((d) =>
                              d ? { ...d, startDate: e.target.value } : d
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="form-label small mb-0">End date</label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={
                            detailDraft.endDate
                              ? String(detailDraft.endDate).slice(0, 10)
                              : ''
                          }
                          onChange={(e) =>
                            setDetailDraft((d) =>
                              d
                                ? {
                                    ...d,
                                    endDate: e.target.value || null,
                                  }
                                : d
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="form-label small mb-0">Notes</label>
                        <textarea
                          className="form-control form-control-sm"
                          rows={2}
                          value={detailDraft.notes ?? ''}
                          onChange={(e) =>
                            setDetailDraft((d) =>
                              d ? { ...d, notes: e.target.value || null } : d
                            )
                          }
                        />
                      </div>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="d-flex flex-wrap gap-2 mt-3">
                      {!detailEditing ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            disabled={detailDeleting}
                            onClick={() => setDetailEditing(true)}
                          >
                            Edit
                          </button>
                          {detailPartner?.status === 'Active' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-warning"
                              disabled={detailSaving || detailDeleting}
                              onClick={markInactive}
                            >
                              Mark Inactive
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            disabled={detailSaving || detailDeleting}
                            onClick={() => void deletePartner()}
                          >
                            {detailDeleting ? 'Deleting…' : 'Delete'}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            disabled={detailSaving || detailDeleting}
                            onClick={() => void saveDetail()}
                          >
                            {detailSaving ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            disabled={detailSaving || detailDeleting}
                            onClick={cancelDetailEdit}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  <hr className="my-3" />
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h3 className="h6 fw-bold mb-0">Assignments</h3>
                    {isAdmin && (
                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        onClick={openAddAssignment}
                      >
                        Add Assignment
                      </button>
                    )}
                  </div>
                  {assignmentsLoading ? (
                    <div className="small text-muted">Loading assignments…</div>
                  ) : assignments.length === 0 ? (
                    <p className="small text-muted mb-0">No assignments.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered mb-0 small">
                        <thead className="table-light">
                          <tr>
                            <th>Safehouse</th>
                            <th>Program</th>
                            <th>Start</th>
                            <th>End</th>
                            <th>Primary</th>
                            <th>Status</th>
                            {isAdmin && <th />}
                          </tr>
                        </thead>
                        <tbody>
                          {assignments.map((a) => (
                            <tr key={a.assignmentId}>
                              <td>{safehouseLabel(a.safehouseId)}</td>
                              <td>{a.programArea}</td>
                              <td>{String(a.assignmentStart).slice(0, 10)}</td>
                              <td>
                                {a.assignmentEnd
                                  ? String(a.assignmentEnd).slice(0, 10)
                                  : '—'}
                              </td>
                              <td>
                                {a.isPrimary ? (
                                  <span className="badge bg-primary">Primary</span>
                                ) : (
                                  <span className="text-muted">—</span>
                                )}
                              </td>
                              <td>{a.status}</td>
                              {isAdmin && (
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-link btn-sm p-0"
                                    onClick={() => openEditAssignment(a)}
                                  >
                                    Edit
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {newModalOpen && (
        <div
          className="modal d-block"
          tabIndex={-1}
          role="dialog"
          style={{ background: 'rgba(0,0,0,0.45)' }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">New partner</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setNewModalOpen(false)}
                />
              </div>
              <div className="modal-body">
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label small">Partner name *</label>
                    <input
                      className="form-control form-control-sm"
                      value={npName}
                      onChange={(e) => setNpName(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Partner type *</label>
                    <input
                      className="form-control form-control-sm"
                      value={npType}
                      onChange={(e) => setNpType(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Role type *</label>
                    <input
                      className="form-control form-control-sm"
                      value={npRole}
                      onChange={(e) => setNpRole(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Contact name *</label>
                    <input
                      className="form-control form-control-sm"
                      value={npContact}
                      onChange={(e) => setNpContact(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Email *</label>
                    <input
                      type="email"
                      className="form-control form-control-sm"
                      value={npEmail}
                      onChange={(e) => setNpEmail(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Phone *</label>
                    <input
                      className="form-control form-control-sm"
                      value={npPhone}
                      onChange={(e) => setNpPhone(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Region *</label>
                    <input
                      className="form-control form-control-sm"
                      value={npRegion}
                      onChange={(e) => setNpRegion(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Status</label>
                    <select
                      className="form-select form-select-sm"
                      value={npStatus}
                      onChange={(e) =>
                        setNpStatus(e.target.value as 'Active' | 'Inactive')
                      }
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Start date *</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={npStart}
                      onChange={(e) => setNpStart(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">End date</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={npEnd}
                      onChange={(e) => setNpEnd(e.target.value)}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Notes</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={2}
                      value={npNotes}
                      onChange={(e) => setNpNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setNewModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={npSaving}
                  onClick={() => void submitNewPartner()}
                >
                  {npSaving ? 'Saving…' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {assignModalOpen && (
        <div
          className="modal d-block"
          tabIndex={-1}
          role="dialog"
          style={{ background: 'rgba(0,0,0,0.45)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {assignEditId == null ? 'Add assignment' : 'Edit assignment'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={closeAssignModal}
                />
              </div>
              <div className="modal-body">
                <div className="vstack gap-2">
                  <div>
                    <label className="form-label small">Safehouse *</label>
                    <select
                      className="form-select form-select-sm"
                      value={asSafehouseId === '' ? '' : String(asSafehouseId)}
                      onChange={(e) =>
                        setAsSafehouseId(e.target.value ? Number(e.target.value) : '')
                      }
                    >
                      <option value="">Select…</option>
                      {allSafehouses.map((sh) => (
                        <option key={sh.safehouseId} value={sh.safehouseId}>
                          {sh.city?.trim() || sh.name} (#{sh.safehouseId})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label small">Program area *</label>
                    <select
                      className="form-select form-select-sm"
                      value={asProgram}
                      onChange={(e) => setAsProgram(e.target.value)}
                    >
                      {PROGRAM_AREAS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label small">Assignment start *</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={asStart}
                      onChange={(e) => setAsStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label small">Assignment end</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={asEnd}
                      onChange={(e) => setAsEnd(e.target.value)}
                    />
                  </div>
                  <div className="form-check">
                    <input
                      id="as-primary"
                      type="checkbox"
                      className="form-check-input"
                      checked={asPrimary}
                      onChange={(e) => setAsPrimary(e.target.checked)}
                    />
                    <label className="form-check-label small" htmlFor="as-primary">
                      Is primary
                    </label>
                  </div>
                  <div>
                    <label className="form-label small">Status</label>
                    <select
                      className="form-select form-select-sm"
                      value={asStatus}
                      onChange={(e) => setAsStatus(e.target.value)}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label small">Responsibility notes</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={2}
                      value={asNotes}
                      onChange={(e) => setAsNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={closeAssignModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={asSaving}
                  onClick={() => void submitAssignment()}
                >
                  {asSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
