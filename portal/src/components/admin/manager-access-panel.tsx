"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveManagerScopesAction,
  createManagerAssignmentAction,
  previewAssignmentAction,
  removeManagerAssignmentAction,
  revokeManagerScopeAction,
  searchAssignableUsersAction,
  type AssignableUser,
  type ManagerAccessActionState,
} from "@/actions/admin/manager-access";
import { FormFlash } from "@/components/admin/form-flash";
import { scopeLabel, type ManagerAssignmentView, type ScopeUnit } from "@/lib/admin/manager-access";

const buttonClass =
  "rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";
const secondaryButtonClass =
  "rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-600";
const dangerLinkClass = "text-xs font-medium text-red-700 hover:underline disabled:opacity-50 dark:text-red-400";
const badgeClass = "rounded-full px-2 py-0.5 text-xs font-medium";

function certCountLabel(n: number) {
  return `${n} certificate${n === 1 ? "" : "s"}`;
}

function ScopeChecklist({
  units,
  selected,
  onToggle,
  name,
}: {
  units: ScopeUnit[];
  selected: Set<string>;
  onToggle: (key: string) => void;
  name: string;
}) {
  return (
    <ul className="space-y-1">
      {units.map((u) => (
        <li key={u.key}>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name={name}
              className="mt-1"
              checked={selected.has(u.key)}
              onChange={() => onToggle(u.key)}
            />
            <span>
              {scopeLabel(u)} <span className="text-zinc-500">· {certCountLabel(u.certificateCount)}</span>
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

function AssignmentCard({ assignment }: { assignment: ManagerAssignmentView }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<ManagerAccessActionState>({});
  const [selectedPending, setSelectedPending] = useState<Set<string>>(new Set());
  const { user } = assignment;

  const run = (fn: () => Promise<ManagerAccessActionState>) =>
    startTransition(async () => {
      const result = await fn();
      setState(result);
      if (result.ok) router.refresh();
    });

  const togglePending = (key: string) =>
    setSelectedPending((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <li className="space-y-3 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            <a href={`/admin/users/${user.id}`} className="hover:underline">
              {user.name || user.email}
            </a>
            {user.username ? <span className="ml-2 font-mono text-xs text-zinc-500">{user.username}</span> : null}
          </p>
          <p className="text-xs text-zinc-500">
            {user.email}
            {user.companyLabel ? ` · ${user.companyLabel}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!user.isActive ? (
            <span className={`${badgeClass} bg-amber-100 text-amber-900`}>User deactivated</span>
          ) : null}
          <button
            type="button"
            disabled={pending}
            className={dangerLinkClass}
            onClick={() => {
              if (window.confirm(`Remove ${user.name || user.email} and all their approved access from this manager?`)) {
                run(() => removeManagerAssignmentAction(assignment.id));
              }
            }}
          >
            Remove assignment
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Approved access</p>
        {assignment.scopes.length === 0 ? (
          <p className="mt-1 text-sm text-zinc-600">No approved access. This assignment currently grants nothing.</p>
        ) : (
          <ul className="mt-1 divide-y divide-zinc-100 rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {assignment.scopes.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  {s.label}
                  {!s.isLive ? (
                    <span className={`${badgeClass} bg-zinc-100 text-zinc-700`}>Inactive — grants nothing</span>
                  ) : null}
                  {s.isLive && !s.coveredByUser ? (
                    <span
                      className={`${badgeClass} bg-amber-100 text-amber-900`}
                      title="The manager keeps approved access, but the assigned user no longer holds it. Revoke it if it is no longer needed."
                    >
                      User no longer holds this
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  className={dangerLinkClass}
                  onClick={() => run(() => revokeManagerScopeAction(s.id))}
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {assignment.pending.length > 0 ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Pending expansion</p>
          <p className="mb-2 text-xs text-amber-900/80 dark:text-amber-200">
            This user has gained access the manager cannot see yet. It is only added if you approve it.
          </p>
          <ScopeChecklist
            units={assignment.pending}
            selected={selectedPending}
            onToggle={togglePending}
            name={`pending-${assignment.id}`}
          />
          <button
            type="button"
            disabled={pending || selectedPending.size === 0}
            className={`${buttonClass} mt-2`}
            onClick={() => run(() => approveManagerScopesAction(assignment.id, [...selectedPending]))}
          >
            Approve selected
          </button>
        </div>
      ) : null}

      <FormFlash state={state} />
    </li>
  );
}

function AssignUserForm({ managerId }: { managerId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AssignableUser[] | null>(null);
  const [chosen, setChosen] = useState<AssignableUser | null>(null);
  const [units, setUnits] = useState<ScopeUnit[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, setState] = useState<ManagerAccessActionState>({});

  const search = () =>
    startTransition(async () => {
      setChosen(null);
      setState({});
      const res = await searchAssignableUsersAction(managerId, query);
      setResults(res.users);
      if (res.error) setState({ error: res.error });
    });

  const choose = (user: AssignableUser) =>
    startTransition(async () => {
      setState({});
      const res = await previewAssignmentAction(user.id);
      if (res.error) {
        setState({ error: res.error });
        return;
      }
      setChosen(user);
      setUnits(res.units);
      setSelected(new Set(res.units.map((u) => u.key)));
    });

  const confirm = () =>
    startTransition(async () => {
      if (!chosen) return;
      const result = await createManagerAssignmentAction(managerId, chosen.id, [...selected]);
      setState(result);
      if (result.ok) {
        setChosen(null);
        setResults(null);
        setQuery("");
        router.refresh();
      }
    });

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const selectedUnits = units.filter((u) => selected.has(u.key));
  const selectedCerts = selectedUnits.reduce((n, u) => n + u.certificateCount, 0);

  return (
    <div className="space-y-3">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <div className="min-w-64 flex-1">
          <label htmlFor="manager_user_search" className="block text-xs text-zinc-500">
            Search customer users by name, email, username, company or OAK number
          </label>
          <input
            id="manager_user_search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Carbodyshop or OAK-1022"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>
        <button type="submit" disabled={pending || query.trim().length < 2} className={buttonClass}>
          Search
        </button>
      </form>

      {results && !chosen ? (
        results.length === 0 ? (
          <p className="text-sm text-zinc-600">No active customer users match that search.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {results.map((u) => (
              <li key={u.id} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {u.name || u.email}
                    {u.username ? <span className="ml-2 font-mono text-xs text-zinc-500">{u.username}</span> : null}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {u.email}
                    {u.companyLabel ? ` · ${u.companyLabel}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    {u.access.length ? u.access.join(" · ") : "No access grants"}
                  </p>
                </div>
                {u.alreadyAssigned ? (
                  <span className={`${badgeClass} bg-zinc-100 text-zinc-700`}>Already assigned</span>
                ) : (
                  <button
                    type="button"
                    disabled={pending || u.access.length === 0}
                    className={secondaryButtonClass}
                    onClick={() => choose(u)}
                  >
                    Preview
                  </button>
                )}
              </li>
            ))}
          </ul>
        )
      ) : null}

      {chosen ? (
        <div className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm">
            Assign <span className="font-medium">{chosen.name || chosen.email}</span>
            {chosen.companyLabel ? ` (${chosen.companyLabel})` : ""}. The manager will be able to see:
          </p>
          {units.length === 0 ? (
            <p className="text-sm text-zinc-600">This user has no active access to delegate.</p>
          ) : (
            <ScopeChecklist units={units} selected={selected} onToggle={toggle} name="assign-scope" />
          )}
          <p className="text-xs text-zinc-500">
            {selectedUnits.length} selected · {certCountLabel(selectedCerts)} visible today. Access this user gains
            later will need separate approval.
          </p>
          <div className="flex gap-2">
            <button type="button" disabled={pending || selected.size === 0} className={buttonClass} onClick={confirm}>
              Confirm assignment
            </button>
            <button type="button" disabled={pending} className={secondaryButtonClass} onClick={() => setChosen(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <FormFlash state={state} />
    </div>
  );
}

export function ManagerAccessPanel({
  managerId,
  managerIsActive,
  assignments,
  loadError,
}: {
  managerId: string;
  managerIsActive: boolean;
  assignments: ManagerAssignmentView[];
  loadError: string | null;
}) {
  return (
    <div className="space-y-8">
      {loadError ? <FormFlash state={{ error: loadError }} /> : null}
      {!managerIsActive ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This manager is deactivated, so none of the access below is currently in effect.
        </p>
      ) : null}

      <section>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Assigned customer users</h3>
        {assignments.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No users assigned yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {assignments.map((a) => (
              <AssignmentCard key={a.id} assignment={a} />
            ))}
          </ul>
        )}
      </section>

      {managerIsActive ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Assign a customer user</h3>
          <p className="text-xs text-zinc-500">
            The manager sees only the sites and company-level documents you approve here, across any customer
            company. Assigning never gives the manager user-management or admin rights.
          </p>
          <AssignUserForm managerId={managerId} />
        </section>
      ) : null}
    </div>
  );
}
