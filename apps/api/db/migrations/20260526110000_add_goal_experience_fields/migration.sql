ALTER TABLE "goal"
ADD COLUMN "goalType" TEXT NOT NULL DEFAULT 'saving',
ADD COLUMN "emoji" TEXT,
ADD COLUMN "coverImageUrl" TEXT,
ADD COLUMN "themeColor" TEXT,
ADD COLUMN "contributionMode" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN "suggestedContributionAmount" DOUBLE PRECISION,
ADD COLUMN "completedAt" TIMESTAMP(3);
