"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CompanySearchRow } from "@/lib/admin/company-search";
import { inputClass, labelClass } from "@/lib/ui/classes";

type Props = {
  value: CompanySearchRow | null;
  onChange: (company: CompanySearchRow | null) => void;
  disabled?: boolean;
  required?: boolean;
  label?: string;
};

export function CustomerSearchSelect({
  value,
  onChange,
  disabled = false,
  required = false,
  label = "Company",
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CompanySearchRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const search = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/companies/search?q=${encodeURIComponent(term.trim())}`,
        { credentials: "same-origin" }
      );
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        setError("Search failed — please refresh the page and try again.");
        setResults([]);
        return;
      }
      const payload = (await res.json()) as {
        companies?: CompanySearchRow[];
        error?: string;
      };
      if (!res.ok) {
        setError(payload.error ?? `Search failed (${res.status}).`);
        setResults([]);
        return;
      }
      setResults(payload.companies ?? []);
      setHighlightIndex(payload.companies?.length ? 0 : -1);
    } catch {
      setError("Search failed — network error.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (value) {
      setQuery("");
      setResults([]);
      setOpen(false);
      return;
    }

    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void search(term);
    }, 280);

    return () => window.clearTimeout(timer);
  }, [query, value, search]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function selectCompany(company: CompanySearchRow) {
    onChange(company);
    setQuery("");
    setResults([]);
    setOpen(false);
    setHighlightIndex(-1);
  }

  function clearSelection() {
    onChange(null);
    setQuery("");
    setResults([]);
    setOpen(false);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setOpen(true);
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown" && results.length > 0) {
      event.preventDefault();
      setHighlightIndex((i) => (i + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp" && results.length > 0) {
      event.preventDefault();
      setHighlightIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
      return;
    }

    if (event.key === "Enter" && open && highlightIndex >= 0 && results[highlightIndex]) {
      event.preventDefault();
      selectCompany(results[highlightIndex]);
    }
  }

  const showDropdown =
    open && !value && !disabled && (loading || results.length > 0 || query.trim().length >= 2);

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={`${listId}-input`} className={labelClass}>
        {label} {required ? <span className="text-oak-danger">*</span> : null}
      </label>

      {value ? (
        <div className="mt-1 flex items-start gap-2 rounded-lg border border-oak-border bg-slate-50 px-3 py-2 text-sm text-oak-charcoal">
          <div className="min-w-0 flex-1">
            <span className="font-mono text-xs font-semibold text-oak-navy">
              {value.customerIdReadable}
            </span>
            <span className="mx-2 text-oak-muted">·</span>
            <span>{value.companyName}</span>
            {value.status === "inactive" ? (
              <span className="ml-2 text-xs text-amber-700">(inactive)</span>
            ) : null}
          </div>
          {!disabled ? (
            <button
              type="button"
              onClick={clearSelection}
              className="shrink-0 text-xs font-medium text-oak-orange hover:underline"
            >
              Change
            </button>
          ) : null}
        </div>
      ) : (
        <input
          ref={inputRef}
          id={`${listId}-input`}
          type="search"
          autoComplete="off"
          disabled={disabled}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Company ID, company name, or contact name"
          className={inputClass}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={`${listId}-listbox`}
          aria-autocomplete="list"
        />
      )}

      <input type="hidden" name="company_id" value={value?.id ?? ""} required={required} />

      {showDropdown ? (
        <ul
          id={`${listId}-listbox`}
          role="listbox"
          className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-oak-border bg-white py-1 text-sm shadow-lg"
        >
          {loading ? (
            <li className="px-3 py-2 text-oak-muted">Searching…</li>
          ) : results.length === 0 ? (
            <li className="px-3 py-2 text-oak-muted">
              {query.trim().length < 2
                ? "Type at least 2 characters"
                : "No companies found"}
            </li>
          ) : (
            results.map((company, index) => (
              <li key={company.id} role="option" aria-selected={highlightIndex === index}>
                <button
                  type="button"
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-orange-50 ${
                    highlightIndex === index ? "bg-orange-50" : ""
                  }`}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => selectCompany(company)}
                >
                  <span className="font-mono text-xs font-semibold text-oak-navy">
                    {company.customerIdReadable}
                  </span>
                  <span className="text-oak-charcoal">{company.companyName}</span>
                  {company.status === "inactive" ? (
                    <span className="text-xs text-amber-700">Inactive company</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}

      {error ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {!value && !error ? (
        <p className="mt-1 text-xs text-oak-muted">
          Search by company ID (e.g. OAK-1001), company name, or contact name — not portal user
          names.
        </p>
      ) : null}
    </div>
  );
}
