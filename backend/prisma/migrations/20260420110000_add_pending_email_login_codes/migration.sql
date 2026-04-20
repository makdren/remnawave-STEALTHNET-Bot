-- CreateTable
CREATE TABLE "pending_email_login_codes" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_email_login_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pending_email_login_codes_client_id_idx" ON "pending_email_login_codes"("client_id");

-- CreateIndex
CREATE INDEX "pending_email_login_codes_email_idx" ON "pending_email_login_codes"("email");

-- CreateIndex
CREATE INDEX "pending_email_login_codes_expires_at_idx" ON "pending_email_login_codes"("expires_at");

-- AddForeignKey
ALTER TABLE "pending_email_login_codes" ADD CONSTRAINT "pending_email_login_codes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
