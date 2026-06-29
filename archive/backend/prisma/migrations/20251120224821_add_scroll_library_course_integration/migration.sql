-- CreateTable
CREATE TABLE "scroll_student_material_access" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "course_material_id" TEXT NOT NULL,
    "access_granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cache_invalidated_at" TIMESTAMP(3),

    CONSTRAINT "scroll_student_material_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scroll_student_progress" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "materials_accessed" TEXT[],
    "completion_percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scroll_student_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scroll_material_update_notifications" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "course_material_id" TEXT NOT NULL,
    "update_type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "notified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged_at" TIMESTAMP(3),

    CONSTRAINT "scroll_material_update_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scroll_material_versions" (
    "id" TEXT NOT NULL,
    "course_material_id" TEXT NOT NULL,
    "material_type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scroll_material_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scroll_completion_analytics" (
    "student_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "completion_percentage" DOUBLE PRECISION NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scroll_completion_analytics_pkey" PRIMARY KEY ("student_id","course_id")
);

-- CreateTable
CREATE TABLE "scroll_past_questions" (
    "id" TEXT NOT NULL,
    "course_material_id" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "content" TEXT NOT NULL,
    "options" TEXT[],
    "correct_answer" TEXT,
    "explanation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scroll_past_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_scroll_student_access_student" ON "scroll_student_material_access"("student_id");

-- CreateIndex
CREATE INDEX "idx_scroll_student_access_material" ON "scroll_student_material_access"("course_material_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_student_material_access" ON "scroll_student_material_access"("student_id", "course_material_id");

-- CreateIndex
CREATE INDEX "idx_scroll_student_progress_student" ON "scroll_student_progress"("student_id");

-- CreateIndex
CREATE INDEX "idx_scroll_student_progress_course" ON "scroll_student_progress"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_student_course_progress" ON "scroll_student_progress"("student_id", "course_id");

-- CreateIndex
CREATE INDEX "idx_scroll_update_notification_student" ON "scroll_material_update_notifications"("student_id");

-- CreateIndex
CREATE INDEX "idx_scroll_update_notification_ack" ON "scroll_material_update_notifications"("acknowledged");

-- CreateIndex
CREATE INDEX "idx_scroll_material_version_material" ON "scroll_material_versions"("course_material_id");

-- CreateIndex
CREATE INDEX "idx_scroll_completion_analytics_student" ON "scroll_completion_analytics"("student_id");

-- CreateIndex
CREATE INDEX "idx_scroll_completion_analytics_course" ON "scroll_completion_analytics"("course_id");

-- CreateIndex
CREATE INDEX "idx_scroll_past_question_material" ON "scroll_past_questions"("course_material_id");

-- AddForeignKey
ALTER TABLE "scroll_student_material_access" ADD CONSTRAINT "scroll_student_material_access_course_material_id_fkey" FOREIGN KEY ("course_material_id") REFERENCES "ScrollCourseMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scroll_material_versions" ADD CONSTRAINT "scroll_material_versions_course_material_id_fkey" FOREIGN KEY ("course_material_id") REFERENCES "ScrollCourseMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scroll_past_questions" ADD CONSTRAINT "scroll_past_questions_course_material_id_fkey" FOREIGN KEY ("course_material_id") REFERENCES "ScrollCourseMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
