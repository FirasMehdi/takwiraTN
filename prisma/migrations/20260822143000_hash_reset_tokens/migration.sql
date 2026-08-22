-- Store only a SHA-256 hash of password reset tokens, never the raw value, so
-- a database snapshot cannot be turned into working reset links.
--
-- Existing rows are discarded rather than migrated: their stored values are raw
-- tokens, which could never match a hash lookup, and reset tokens are ephemeral
-- by design (one hour TTL). Any outstanding link simply needs re-requesting.
DELETE FROM "PasswordResetToken";

-- DropIndex
DROP INDEX "PasswordResetToken_token_key";

-- AlterTable
ALTER TABLE "PasswordResetToken" DROP COLUMN "token",
ADD COLUMN     "tokenHash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
