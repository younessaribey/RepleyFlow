-- CreateTable
CREATE TABLE "YouCanStore" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "webhookSecret" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeRecordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YouCanStore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "YouCanStore_storeId_key" ON "YouCanStore"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "YouCanStore_webhookSecret_key" ON "YouCanStore"("webhookSecret");

-- CreateIndex
CREATE UNIQUE INDEX "YouCanStore_storeRecordId_key" ON "YouCanStore"("storeRecordId");

-- AddForeignKey
ALTER TABLE "YouCanStore" ADD CONSTRAINT "YouCanStore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YouCanStore" ADD CONSTRAINT "YouCanStore_storeRecordId_fkey" FOREIGN KEY ("storeRecordId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
