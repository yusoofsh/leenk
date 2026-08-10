-- Better Auth 1.7 release candidates require an issuer on account rows.
-- Credential accounts use the synthetic local issuer.
ALTER TABLE "account" ADD COLUMN "issuer" text NOT NULL DEFAULT 'local:credential';
