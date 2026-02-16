-- CreateTable
CREATE TABLE "itinerary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itinerary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_day" (
    "id" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "transportMode" TEXT NOT NULL DEFAULT 'walking',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itinerary_day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_place" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "imageUrl" TEXT,
    "description" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "openingHours" TEXT,
    "ticketRequired" BOOLEAN NOT NULL DEFAULT false,
    "price" DOUBLE PRECISION,
    "visitDurationMinutes" INTEGER NOT NULL DEFAULT 90,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itinerary_place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_note" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itinerary_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_checklist_item" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itinerary_checklist_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "itinerary_userId_createdAt_idx" ON "itinerary"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "itinerary_day_itineraryId_dayNumber_key" ON "itinerary_day"("itineraryId", "dayNumber");

-- CreateIndex
CREATE INDEX "itinerary_day_itineraryId_date_idx" ON "itinerary_day"("itineraryId", "date");

-- CreateIndex
CREATE INDEX "itinerary_place_dayId_orderIndex_idx" ON "itinerary_place"("dayId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "itinerary_note_dayId_key" ON "itinerary_note"("dayId");

-- CreateIndex
CREATE INDEX "itinerary_checklist_item_dayId_orderIndex_idx" ON "itinerary_checklist_item"("dayId", "orderIndex");

-- AddForeignKey
ALTER TABLE "itinerary" ADD CONSTRAINT "itinerary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_day" ADD CONSTRAINT "itinerary_day_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "itinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_place" ADD CONSTRAINT "itinerary_place_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "itinerary_day"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_note" ADD CONSTRAINT "itinerary_note_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "itinerary_day"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_checklist_item" ADD CONSTRAINT "itinerary_checklist_item_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "itinerary_day"("id") ON DELETE CASCADE ON UPDATE CASCADE;
