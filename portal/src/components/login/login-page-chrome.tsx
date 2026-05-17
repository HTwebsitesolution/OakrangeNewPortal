import Link from "next/link";
import { brand } from "@/lib/copy/brand";

const login = brand.auth.login;

export function LoginTopBar() {
  return (
    <div className="mb-6 flex justify-end border-b border-oak-border pb-4">
      <Link
        href={login.websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-oak-muted transition-colors hover:text-oak-orange"
      >
        {login.websiteLabel} ↗
      </Link>
    </div>
  );
}

export function LoginSupportInfo() {
  return (
    <aside className="space-y-4 border-t border-oak-border pt-6 text-sm text-oak-muted">
      <p>
        {login.noCredentials}{" "}
        <Link
          href={login.contactUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-oak-orange hover:underline"
        >
          Contact us
        </Link>
        .
      </p>
      <p>{login.feedbackLead}</p>
      <div className="rounded-lg border border-oak-border bg-white/60 px-4 py-3">
        <p className="font-medium text-oak-navy">{login.vagNoticeTitle}</p>
        <p className="mt-1 leading-relaxed">
          {login.vagNotice}{" "}
          <Link
            href={login.contactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-oak-orange hover:underline"
          >
            Contact us
          </Link>
          .
        </p>
      </div>
    </aside>
  );
}

export function LoginPageFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mx-auto mt-8 w-full max-w-md space-y-3 text-center text-xs leading-relaxed text-oak-muted">
      <p>
        Copyright © {year} {login.companyLegal}
      </p>
      <p>{login.address}</p>
      <p>
        Tel:{" "}
        <a href={`tel:${login.phoneTel}`} className="font-medium text-oak-navy hover:text-oak-orange">
          {login.phone}
        </a>
      </p>
      <p>
        <a
          href={login.webDesignUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-oak-navy hover:text-oak-orange"
        >
          {login.webDesignLabel}
        </a>
      </p>
    </footer>
  );
}
