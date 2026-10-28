# CYMT Drizzle strategy

The existing CYMT database predates local Drizzle migration history. New schema changes are reviewed and applied explicitly; do not run `drizzle-kit migrate` against production without first establishing a proper baseline.

`0000_machinery_admin.sql`, `0001_cmt_ink_admin.sql`, and `0002_confection_admin.sql` are audited, manually controlled DDL changes and are not recorded as applied Drizzle migrations. Do not add a local `_journal.json` or imply that any of these files has been applied remotely.
