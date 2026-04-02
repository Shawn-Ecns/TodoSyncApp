-- AlterTable
ALTER TABLE "todos" ADD COLUMN     "due_date" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "todos_user_id_due_date_idx" ON "todos"("user_id", "due_date");
