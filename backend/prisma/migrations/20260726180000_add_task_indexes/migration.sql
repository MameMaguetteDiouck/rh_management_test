-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_creatorId_idx" ON "Task"("creatorId");

-- CreateIndex
CREATE INDEX "Task_validatorId_idx" ON "Task"("validatorId");

-- CreateIndex
CREATE INDEX "Task_assignedById_idx" ON "Task"("assignedById");
