-- pgTAP smoke: schema + RLS enabled (run with `supabase db test` against local DB).
BEGIN;

SELECT plan(14);

SELECT has_table('public', 'companies');

SELECT has_table('public', 'sites');

SELECT has_table('public', 'profiles');

SELECT has_table('public', 'user_site_access');

SELECT has_table('public', 'certificate_documents');

SELECT has_table('public', 'audit_logs');

SELECT row_security_on('public', 'companies');

SELECT row_security_on('public', 'sites');

SELECT row_security_on('public', 'profiles');

SELECT row_security_on('public', 'user_site_access');

SELECT row_security_on('public', 'certificate_documents');

SELECT row_security_on('public', 'audit_logs');

SELECT has_column('public', 'certificate_documents', 'document_type');

SELECT has_column('public', 'certificate_documents', 'published_at');

SELECT *
FROM finish();

ROLLBACK;
