-- Promote one named account to site admin.
--
-- This deployment has no reachable database and no dependable shell, so a
-- migration is the only self-service way in: it ships in a pull request, is
-- reviewed like any other change, and applies itself on merge. Only the first
-- account ever created is promoted automatically, and that is not this person.
--
-- The account must already exist when this runs. A plain UPDATE would match no
-- rows and say nothing at all, so the outcome is announced either way and shows
-- up in the deploy log (pnpm prod:docker:logs).
DO $$
DECLARE
    target_email CONSTANT TEXT := 'nasim.dadizadeh@unitn.it';
    promoted INTEGER;
BEGIN
    UPDATE "User"
    SET "role" = 'ADMIN'::"Role"
    WHERE lower("email") = lower(target_email)
      AND "role" <> 'ADMIN'::"Role";

    GET DIAGNOSTICS promoted = ROW_COUNT;

    IF promoted > 0 THEN
        RAISE NOTICE 'Site admin bootstrap: promoted % to ADMIN.', target_email;
    ELSIF EXISTS (SELECT 1 FROM "User" WHERE lower("email") = lower(target_email)) THEN
        RAISE NOTICE 'Site admin bootstrap: % was already an ADMIN, nothing to do.', target_email;
    ELSE
        RAISE WARNING 'Site admin bootstrap: no account exists for %. Sign up with that address, then apply a follow-up migration to promote it.', target_email;
    END IF;
END $$;
