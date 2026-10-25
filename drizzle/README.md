# CYMT Drizzle strategy

The existing CYMT database predates local Drizzle migration history. New schema changes are reviewed and applied explicitly; do not run `drizzle-kit migrate` against production without first establishing a proper baseline.

`0000_machinery_admin.sql` is an audited, manually controlled DDL change and is not recorded as an applied Drizzle migration.
