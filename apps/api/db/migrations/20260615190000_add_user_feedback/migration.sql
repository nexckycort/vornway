CREATE TYPE "UserFeedbackType" AS ENUM ('BUG', 'FEATURE_REQUEST');

CREATE TYPE "UserFeedbackStatus" AS ENUM (
    'OPEN',
    'IN_REVIEW',
    'PLANNED',
    'DONE',
    'REJECTED'
);

CREATE TABLE "user_feedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "UserFeedbackType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "UserFeedbackStatus" NOT NULL DEFAULT 'OPEN',
    "priority" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_feedback_user_id_created_at_idx"
ON "user_feedback"("user_id", "created_at" DESC);

CREATE INDEX "user_feedback_status_created_at_idx"
ON "user_feedback"("status", "created_at" DESC);

CREATE INDEX "user_feedback_type_created_at_idx"
ON "user_feedback"("type", "created_at" DESC);

ALTER TABLE "user_feedback"
ADD CONSTRAINT "user_feedback_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
