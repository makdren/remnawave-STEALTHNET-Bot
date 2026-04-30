-- CreateTable
CREATE TABLE "pending_email_login_codes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pending_email_login_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_password_resets" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pending_password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pending_email_login_codes_email_idx" ON "pending_email_login_codes"("email");
CREATE INDEX "pending_email_login_codes_expires_at_idx" ON "pending_email_login_codes"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "pending_password_resets_token_key" ON "pending_password_resets"("token");
CREATE INDEX "pending_password_resets_email_idx" ON "pending_password_resets"("email");
CREATE INDEX "pending_password_resets_expires_at_idx" ON "pending_password_resets"("expires_at");
