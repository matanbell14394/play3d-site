-- CreateTable
CREATE TABLE "ActiveVisitor" (
    "sessionId" TEXT NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActiveVisitor_pkey" PRIMARY KEY ("sessionId")
);
