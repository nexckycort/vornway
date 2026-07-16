ALTER TABLE "user"
ADD COLUMN "username" TEXT;

CREATE UNIQUE INDEX "user_username_key"
ON "user"("username");
