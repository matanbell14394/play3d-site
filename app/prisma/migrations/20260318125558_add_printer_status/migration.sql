-- CreateTable
CREATE TABLE "PrinterStatus" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "status" TEXT NOT NULL DEFAULT 'offline',
    "taskName" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "makerWorldUrl" TEXT,
    "modelImageUrl" TEXT,
    "modelTitle" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrinterStatus_pkey" PRIMARY KEY ("id")
);
