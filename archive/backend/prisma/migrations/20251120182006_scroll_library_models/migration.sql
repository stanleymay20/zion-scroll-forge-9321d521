-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('QUIZ', 'ESSAY', 'PROJECT', 'ORAL_DEFENSE', 'PEER_REVIEW', 'FORMATIVE', 'SUMMATIVE', 'REFLECTIVE');

-- CreateEnum
CREATE TYPE "CourseLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'STRATEGIC');

-- CreateEnum
CREATE TYPE "Discipline" AS ENUM ('THEOLOGY', 'COMPUTER_SCIENCE', 'BUSINESS', 'ENGINEERING', 'EDUCATION', 'HEALTHCARE', 'LAW', 'ARTS');

-- CreateEnum
CREATE TYPE "ErrorSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ModuleStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "Phase" AS ENUM ('PLANNING', 'CONTENT_DEVELOPMENT', 'PRODUCTION', 'QUALITY_REVIEW', 'PILOT_TESTING', 'LAUNCH');

-- CreateEnum
CREATE TYPE "PhaseStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SystemType" AS ENUM ('GOVERNMENT', 'BUSINESS', 'EDUCATION', 'HEALTHCARE', 'NONPROFIT', 'CHURCH', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "RigorLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'STRATEGIC');

-- CreateEnum
CREATE TYPE "StrictnessProfile" AS ENUM ('STRICT_SPIRITUAL', 'BALANCED', 'LIGHT_CHECK');

-- CreateEnum
CREATE TYPE "ErrorType" AS ENUM ('THEOLOGICAL_DRIFT', 'TONE_PROBLEM', 'SPIRITUALIZATION_OF_LAZINESS', 'BABYLONIAN_FLATTENING');

-- CreateEnum
CREATE TYPE "ProgressionLevel" AS ENUM ('AWARENESS_VOCABULARY', 'UNDERSTANDING_ANALYSIS', 'APPLICATION_PROBLEM_SOLVING', 'SYSTEM_DESIGN_GOVERNANCE', 'MULTIPLICATION_TEACHING');

-- CreateEnum
CREATE TYPE "AcademicLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "DiagramType" AS ENUM ('MERMAID', 'CHART', 'ILLUSTRATION');

-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('ACADEMIC', 'BIBLICAL', 'WEB');

-- CreateEnum
CREATE TYPE "SummaryType" AS ENUM ('CHAPTER', 'SECTION');

-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('QUESTION', 'PROBLEM', 'REFLECTION');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('ACADEMIC', 'BIBLICAL', 'WEB', 'BOOK');

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('PREREQUISITE', 'RELATED', 'EXTENDS', 'CONTRADICTS');

-- CreateEnum
CREATE TYPE "ReadingItemType" AS ENUM ('BOOK', 'ARTICLE', 'VIDEO', 'WEBSITE');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'ESSAY', 'SHORT_ANSWER');

-- CreateEnum
CREATE TYPE "SearchType" AS ENUM ('SEMANTIC', 'PROPHETIC', 'KEYWORD');

-- CreateEnum
CREATE TYPE "AnimationType" AS ENUM ('INTERACTIVE', 'VIDEO', 'SIMULATION');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('PDF', 'EPUB', 'HTML', 'PRINT_READY');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AgentTaskType" AS ENUM ('GENERATE_TEXTBOOK', 'GENERATE_CHAPTER', 'FORMAT_CONTENT', 'FACT_CHECK', 'VALIDATE_THEOLOGY', 'CREATE_EMBEDDINGS', 'BUILD_KNOWLEDGE_GRAPH');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "phase_progress_id" TEXT NOT NULL,
    "approver_id" TEXT NOT NULL,
    "approver_name" TEXT NOT NULL,
    "approver_role" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "comments" TEXT,
    "approved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "course_module_id" TEXT NOT NULL,
    "type" "AssessmentType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "aligned_objectives" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentQualityReport" (
    "id" TEXT NOT NULL,
    "quality_review_id" TEXT NOT NULL,
    "rigor_level" DOUBLE PRECISION NOT NULL,
    "alignment" DOUBLE PRECISION NOT NULL,
    "fairness" DOUBLE PRECISION NOT NULL,
    "clarity" DOUBLE PRECISION NOT NULL,
    "issues" TEXT[],
    "recommendations" TEXT[],

    CONSTRAINT "AssessmentQualityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiblicalFoundation" (
    "id" TEXT NOT NULL,
    "spiritual_integration_id" TEXT NOT NULL,
    "theological_themes" TEXT[],
    "christ_centered_perspective" TEXT NOT NULL,

    CONSTRAINT "BiblicalFoundation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "course_project_id" TEXT NOT NULL,
    "total_allocated" DOUBLE PRECISION NOT NULL,
    "remaining_funds" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetCategory" (
    "id" TEXT NOT NULL,
    "budget_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "allocated" DOUBLE PRECISION NOT NULL,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remaining" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BudgetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Caption" (
    "id" TEXT NOT NULL,
    "lecture_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "format" TEXT NOT NULL,

    CONSTRAINT "Caption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Change" (
    "id" TEXT NOT NULL,
    "iteration_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "affected_components" TEXT[],
    "implemented_by" TEXT NOT NULL,
    "implemented_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistResult" (
    "id" TEXT NOT NULL,
    "quality_review_id" TEXT NOT NULL,
    "criterion" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,

    CONSTRAINT "ChecklistResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competency" (
    "id" TEXT NOT NULL,
    "deployment_pathway_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "assessment_method" TEXT NOT NULL,

    CONSTRAINT "Competency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentQualityReport" (
    "id" TEXT NOT NULL,
    "quality_review_id" TEXT NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "clarity" DOUBLE PRECISION NOT NULL,
    "depth" DOUBLE PRECISION NOT NULL,
    "scholarly_standards" DOUBLE PRECISION NOT NULL,
    "issues" TEXT[],
    "recommendations" TEXT[],

    CONSTRAINT "ContentQualityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseFeedback" (
    "id" TEXT NOT NULL,
    "outcome_data_id" TEXT NOT NULL,
    "course_project_id" TEXT NOT NULL,
    "strengths" TEXT[],
    "improvements" TEXT[],
    "real_world_relevance" DOUBLE PRECISION NOT NULL,
    "preparation_quality" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CourseFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseModule" (
    "id" TEXT NOT NULL,
    "course_project_id" TEXT NOT NULL,
    "courseId" TEXT,
    "week_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ModuleStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseProject" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "level" "CourseLevel" NOT NULL,
    "prerequisites" TEXT[],
    "current_phase" "Phase" NOT NULL DEFAULT 'PLANNING',
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "target_launch_date" TIMESTAMP(3),
    "actual_launch_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deliverable" (
    "id" TEXT NOT NULL,
    "phase_progress_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "completed_date" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "assigned_to" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeploymentPathway" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "concept_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "real_world_application" TEXT NOT NULL,
    "systems_to_transform" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeploymentPathway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "portfolio_asset_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Example" (
    "id" TEXT NOT NULL,
    "lecture_notes_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "code" TEXT,
    "explanation" TEXT NOT NULL,

    CONSTRAINT "Example_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "budget_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by" TEXT NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gap" (
    "id" TEXT NOT NULL,
    "readiness_report_id" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "remediation" TEXT NOT NULL,

    CONSTRAINT "Gap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactMetric" (
    "id" TEXT NOT NULL,
    "project_requirements_id" TEXT,
    "deployment_pathway_id" TEXT,
    "outcome_data_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "measurement_method" TEXT NOT NULL,
    "target_value" TEXT NOT NULL,

    CONSTRAINT "ImpactMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "module_feedback_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "reported_by" TEXT NOT NULL,
    "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Iteration" (
    "id" TEXT NOT NULL,
    "pilot_program_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "Priority" NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Iteration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningObjective" (
    "id" TEXT NOT NULL,
    "course_module_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bloom_level" TEXT NOT NULL,
    "assessment_methods" TEXT[],

    CONSTRAINT "LearningObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lecture" (
    "id" TEXT NOT NULL,
    "course_module_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "transcript" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lecture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LectureNotes" (
    "id" TEXT NOT NULL,
    "lecture_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "key_concepts" TEXT[],
    "pdf_url" TEXT NOT NULL,
    "page_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LectureNotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "course_module_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "file_size" BIGINT,
    "format" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "timeline_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "phase" "Phase" NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "completed_date" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "dependencies" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleFeedback" (
    "id" TEXT NOT NULL,
    "pilot_program_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "comments" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModuleFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outcome" (
    "id" TEXT NOT NULL,
    "project_connection_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "measurement_method" TEXT NOT NULL,
    "target_date" TIMESTAMP(3) NOT NULL,
    "achieved" BOOLEAN NOT NULL DEFAULT false,
    "evidence" TEXT,

    CONSTRAINT "Outcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutcomeData" (
    "id" TEXT NOT NULL,
    "graduate_id" TEXT NOT NULL,
    "deployment_id" TEXT NOT NULL,
    "systems_transformed" TEXT[],
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutcomeData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhaseProgress" (
    "id" TEXT NOT NULL,
    "course_project_id" TEXT NOT NULL,
    "phase" "Phase" NOT NULL,
    "status" "PhaseStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "start_date" TIMESTAMP(3),
    "completion_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhaseProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PilotProgram" (
    "id" TEXT NOT NULL,
    "course_project_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "launch_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PilotProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PilotStudent" (
    "id" TEXT NOT NULL,
    "pilot_program_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "enrolled_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completion_status" TEXT NOT NULL,

    CONSTRAINT "PilotStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioAsset" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "course_project_id" TEXT NOT NULL,
    "project_title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "real_world_impact" TEXT NOT NULL,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeProblem" (
    "id" TEXT NOT NULL,
    "lecture_notes_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "hints" TEXT[],

    CONSTRAINT "PracticeProblem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectConnection" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "system_type" "SystemType" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "mentor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectRequirements" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "deliverables" TEXT[],
    "real_world_application" TEXT NOT NULL,
    "timeline" TEXT NOT NULL,
    "resources" TEXT[],

    CONSTRAINT "ProjectRequirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityReview" (
    "id" TEXT NOT NULL,
    "course_project_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "review_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overall_score" DOUBLE PRECISION NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "feedback" TEXT NOT NULL,
    "recommendations" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "options" TEXT[],
    "correct_answer" TEXT,
    "explanation" TEXT,
    "points" INTEGER NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "module_feedback_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "max_score" INTEGER NOT NULL,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadinessReport" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "knowledge_score" DOUBLE PRECISION NOT NULL,
    "skill_score" DOUBLE PRECISION NOT NULL,
    "deployment_readiness" DOUBLE PRECISION NOT NULL,
    "recommendations" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadinessReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReflectionQuestion" (
    "id" TEXT NOT NULL,
    "spiritual_integration_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "guiding_thoughts" TEXT[],

    CONSTRAINT "ReflectionQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "lecture_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "citation" TEXT,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rubric" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "total_points" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rubric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricCriterion" (
    "id" TEXT NOT NULL,
    "rubric_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RubricCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricLevel" (
    "id" TEXT NOT NULL,
    "rubric_criterion_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "points" INTEGER NOT NULL,

    CONSTRAINT "RubricLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scripture" (
    "id" TEXT NOT NULL,
    "biblical_foundation_id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "application" TEXT NOT NULL,

    CONSTRAINT "Scripture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpiritualIntegration" (
    "id" TEXT NOT NULL,
    "course_module_id" TEXT NOT NULL,
    "worldview_perspective" TEXT NOT NULL,
    "prayer_points" TEXT[],
    "character_development" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpiritualIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamingUrl" (
    "id" TEXT NOT NULL,
    "video_asset_id" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "bitrate" INTEGER NOT NULL,

    CONSTRAINT "StreamingUrl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "course_project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "responsibilities" TEXT[],
    "assigned_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimony" (
    "id" TEXT NOT NULL,
    "outcome_data_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Testimony_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timeline" (
    "id" TEXT NOT NULL,
    "course_project_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "target_launch_date" TIMESTAMP(3) NOT NULL,
    "estimated_end_date" TIMESTAMP(3),
    "actual_launch_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoAsset" (
    "id" TEXT NOT NULL,
    "lecture_id" TEXT NOT NULL,
    "courseId" TEXT,
    "url" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "thumbnails" TEXT[],
    "duration" INTEGER NOT NULL,
    "file_size" BIGINT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoQualityReport" (
    "id" TEXT NOT NULL,
    "quality_review_id" TEXT NOT NULL,
    "audio_quality" DOUBLE PRECISION NOT NULL,
    "visual_clarity" DOUBLE PRECISION NOT NULL,
    "engagement" DOUBLE PRECISION NOT NULL,
    "technical_issues" TEXT[],
    "recommendations" TEXT[],

    CONSTRAINT "VideoQualityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollBook" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "subject" TEXT NOT NULL,
    "level" "AcademicLevel" NOT NULL,
    "course_reference" TEXT,
    "integrity_hash" TEXT NOT NULL,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrollBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollBookMetadata" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "author_agent" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "scroll_integrity_hash" TEXT NOT NULL,
    "generation_date" TIMESTAMP(3) NOT NULL,
    "last_validated" TIMESTAMP(3) NOT NULL,
    "quality_score" DOUBLE PRECISION NOT NULL,
    "theological_alignment" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ScrollBookMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollChapter" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "reading_time" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrollChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollDiagram" (
    "id" TEXT NOT NULL,
    "book_id" TEXT,
    "chapter_id" TEXT,
    "type" "DiagramType" NOT NULL,
    "content" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrollDiagram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollReference" (
    "id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "type" "ReferenceType" NOT NULL,
    "citation" TEXT NOT NULL,
    "url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrollReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollSummary" (
    "id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "type" "SummaryType" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrollSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollExercise" (
    "id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "type" "ExerciseType" NOT NULL,
    "content" TEXT NOT NULL,
    "solution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrollExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollCourseMaterial" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "textbook_id" TEXT,
    "workbook_id" TEXT,
    "lecture_slides" TEXT[],
    "study_pack_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrollCourseMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollKnowledgeNode" (
    "id" TEXT NOT NULL,
    "chapter_id" TEXT,
    "concept" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "embeddings" DOUBLE PRECISION[],
    "related_books" TEXT[],
    "related_chapters" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrollKnowledgeNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollRelationship" (
    "id" TEXT NOT NULL,
    "source_node_id" TEXT NOT NULL,
    "target_node_id" TEXT NOT NULL,
    "type" "RelationType" NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrollRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollSource" (
    "id" TEXT NOT NULL,
    "knowledge_node_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "url" TEXT,
    "credibility_score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrollSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollStudyPack" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "summary_booklet" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrollStudyPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollQuestion" (
    "id" TEXT NOT NULL,
    "course_material_id" TEXT,
    "study_pack_id" TEXT,
    "quiz_id" TEXT,
    "type" "QuestionType" NOT NULL,
    "content" TEXT NOT NULL,
    "options" TEXT[],
    "correct_answer" TEXT,
    "explanation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrollQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollFlashcard" (
    "id" TEXT NOT NULL,
    "study_pack_id" TEXT NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrollFlashcard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollCheatSheet" (
    "id" TEXT NOT NULL,
    "study_pack_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrollCheatSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollQuiz" (
    "id" TEXT NOT NULL,
    "study_pack_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "time_limit" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrollQuiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollReadingListItem" (
    "id" TEXT NOT NULL,
    "course_material_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "type" "ReadingItemType" NOT NULL,
    "url" TEXT,
    "required" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrollReadingListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollSearchQuery" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "type" "SearchType" NOT NULL,
    "filters" JSONB,
    "limit" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrollSearchQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollSearchResult" (
    "id" TEXT NOT NULL,
    "search_query_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "chapter_id" TEXT,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "relevance_score" DOUBLE PRECISION NOT NULL,
    "prophetic_relevance" DOUBLE PRECISION,
    "concept_connections" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrollSearchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollReadingSession" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "chapter_id" TEXT,
    "scroll_position" INTEGER NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_accessed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrollReadingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollAnnotation" (
    "id" TEXT NOT NULL,
    "reading_session_id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "start_offset" INTEGER NOT NULL,
    "end_offset" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrollAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollBookmark" (
    "id" TEXT NOT NULL,
    "reading_session_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "scroll_position" INTEGER NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrollBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollAudioNarration" (
    "id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "audio_url" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "transcript" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrollAudioNarration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollAnimation" (
    "id" TEXT NOT NULL,
    "concept_id" TEXT NOT NULL,
    "type" "AnimationType" NOT NULL,
    "content" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrollAnimation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollExportRequest" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "options" JSONB,
    "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
    "download_url" TEXT,
    "file_size" BIGINT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "ScrollExportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrollAgentTask" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "type" "AgentTaskType" NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "ScrollAgentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ScrollDiagramToScrollStudyPack" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "idx_assessment_module" ON "Assessment"("course_module_id");

-- CreateIndex
CREATE INDEX "idx_course_module_course" ON "CourseModule"("course_project_id");

-- CreateIndex
CREATE UNIQUE INDEX "CourseProject_code_key" ON "CourseProject"("code");

-- CreateIndex
CREATE INDEX "idx_course_project_code" ON "CourseProject"("code");

-- CreateIndex
CREATE INDEX "idx_course_project_status" ON "CourseProject"("status");

-- CreateIndex
CREATE INDEX "idx_deployment_pathway_module" ON "DeploymentPathway"("module_id");

-- CreateIndex
CREATE INDEX "idx_lecture_module" ON "Lecture"("course_module_id");

-- CreateIndex
CREATE INDEX "idx_phase_progress_course" ON "PhaseProgress"("course_project_id");

-- CreateIndex
CREATE INDEX "idx_phase_progress_phase" ON "PhaseProgress"("phase");

-- CreateIndex
CREATE INDEX "idx_pilot_program_course" ON "PilotProgram"("course_project_id");

-- CreateIndex
CREATE INDEX "idx_portfolio_asset_course" ON "PortfolioAsset"("course_project_id");

-- CreateIndex
CREATE INDEX "idx_portfolio_asset_student" ON "PortfolioAsset"("student_id");

-- CreateIndex
CREATE INDEX "idx_quality_review_course" ON "QualityReview"("course_project_id");

-- CreateIndex
CREATE UNIQUE INDEX "Timeline_course_project_id_key" ON "Timeline"("course_project_id");

-- CreateIndex
CREATE INDEX "idx_scroll_book_subject" ON "ScrollBook"("subject");

-- CreateIndex
CREATE INDEX "idx_scroll_book_level" ON "ScrollBook"("level");

-- CreateIndex
CREATE INDEX "idx_scroll_book_course_ref" ON "ScrollBook"("course_reference");

-- CreateIndex
CREATE UNIQUE INDEX "ScrollBookMetadata_book_id_key" ON "ScrollBookMetadata"("book_id");

-- CreateIndex
CREATE INDEX "idx_scroll_chapter_book" ON "ScrollChapter"("book_id");

-- CreateIndex
CREATE INDEX "idx_scroll_chapter_order" ON "ScrollChapter"("order_index");

-- CreateIndex
CREATE INDEX "idx_scroll_course_material_course" ON "ScrollCourseMaterial"("course_id");

-- CreateIndex
CREATE INDEX "idx_scroll_knowledge_node_concept" ON "ScrollKnowledgeNode"("concept");

-- CreateIndex
CREATE UNIQUE INDEX "ScrollRelationship_source_node_id_target_node_id_type_key" ON "ScrollRelationship"("source_node_id", "target_node_id", "type");

-- CreateIndex
CREATE INDEX "idx_scroll_study_pack_course" ON "ScrollStudyPack"("course_id");

-- CreateIndex
CREATE INDEX "idx_scroll_search_query_user" ON "ScrollSearchQuery"("user_id");

-- CreateIndex
CREATE INDEX "idx_scroll_search_query_type" ON "ScrollSearchQuery"("type");

-- CreateIndex
CREATE INDEX "idx_scroll_search_result_query" ON "ScrollSearchResult"("search_query_id");

-- CreateIndex
CREATE INDEX "idx_scroll_search_result_relevance" ON "ScrollSearchResult"("relevance_score");

-- CreateIndex
CREATE INDEX "idx_scroll_reading_session_user" ON "ScrollReadingSession"("user_id");

-- CreateIndex
CREATE INDEX "idx_scroll_reading_session_book" ON "ScrollReadingSession"("book_id");

-- CreateIndex
CREATE INDEX "idx_scroll_export_request_user" ON "ScrollExportRequest"("user_id");

-- CreateIndex
CREATE INDEX "idx_scroll_export_request_status" ON "ScrollExportRequest"("status");

-- CreateIndex
CREATE INDEX "idx_scroll_agent_task_agent" ON "ScrollAgentTask"("agent_id");

-- CreateIndex
CREATE INDEX "idx_scroll_agent_task_status" ON "ScrollAgentTask"("status");

-- CreateIndex
CREATE INDEX "idx_scroll_agent_task_type" ON "ScrollAgentTask"("type");

-- CreateIndex
CREATE UNIQUE INDEX "_ScrollDiagramToScrollStudyPack_AB_unique" ON "_ScrollDiagramToScrollStudyPack"("A", "B");

-- CreateIndex
CREATE INDEX "_ScrollDiagramToScrollStudyPack_B_index" ON "_ScrollDiagramToScrollStudyPack"("B");

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_phase_progress_id_fkey" FOREIGN KEY ("phase_progress_id") REFERENCES "PhaseProgress"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_course_module_id_fkey" FOREIGN KEY ("course_module_id") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AssessmentQualityReport" ADD CONSTRAINT "AssessmentQualityReport_quality_review_id_fkey" FOREIGN KEY ("quality_review_id") REFERENCES "QualityReview"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BiblicalFoundation" ADD CONSTRAINT "BiblicalFoundation_spiritual_integration_id_fkey" FOREIGN KEY ("spiritual_integration_id") REFERENCES "SpiritualIntegration"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_course_project_id_fkey" FOREIGN KEY ("course_project_id") REFERENCES "CourseProject"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BudgetCategory" ADD CONSTRAINT "BudgetCategory_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Caption" ADD CONSTRAINT "Caption_lecture_id_fkey" FOREIGN KEY ("lecture_id") REFERENCES "Lecture"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Change" ADD CONSTRAINT "Change_iteration_id_fkey" FOREIGN KEY ("iteration_id") REFERENCES "Iteration"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ChecklistResult" ADD CONSTRAINT "ChecklistResult_quality_review_id_fkey" FOREIGN KEY ("quality_review_id") REFERENCES "QualityReview"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Competency" ADD CONSTRAINT "Competency_deployment_pathway_id_fkey" FOREIGN KEY ("deployment_pathway_id") REFERENCES "DeploymentPathway"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ContentQualityReport" ADD CONSTRAINT "ContentQualityReport_quality_review_id_fkey" FOREIGN KEY ("quality_review_id") REFERENCES "QualityReview"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CourseFeedback" ADD CONSTRAINT "CourseFeedback_course_project_id_fkey" FOREIGN KEY ("course_project_id") REFERENCES "CourseProject"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CourseFeedback" ADD CONSTRAINT "CourseFeedback_outcome_data_id_fkey" FOREIGN KEY ("outcome_data_id") REFERENCES "OutcomeData"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CourseModule" ADD CONSTRAINT "CourseModule_course_project_id_fkey" FOREIGN KEY ("course_project_id") REFERENCES "CourseProject"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_phase_progress_id_fkey" FOREIGN KEY ("phase_progress_id") REFERENCES "PhaseProgress"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_portfolio_asset_id_fkey" FOREIGN KEY ("portfolio_asset_id") REFERENCES "PortfolioAsset"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Example" ADD CONSTRAINT "Example_lecture_notes_id_fkey" FOREIGN KEY ("lecture_notes_id") REFERENCES "LectureNotes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Gap" ADD CONSTRAINT "Gap_readiness_report_id_fkey" FOREIGN KEY ("readiness_report_id") REFERENCES "ReadinessReport"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ImpactMetric" ADD CONSTRAINT "ImpactMetric_deployment_pathway_id_fkey" FOREIGN KEY ("deployment_pathway_id") REFERENCES "DeploymentPathway"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ImpactMetric" ADD CONSTRAINT "ImpactMetric_outcome_data_id_fkey" FOREIGN KEY ("outcome_data_id") REFERENCES "OutcomeData"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ImpactMetric" ADD CONSTRAINT "ImpactMetric_project_requirements_id_fkey" FOREIGN KEY ("project_requirements_id") REFERENCES "ProjectRequirements"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_module_feedback_id_fkey" FOREIGN KEY ("module_feedback_id") REFERENCES "ModuleFeedback"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Iteration" ADD CONSTRAINT "Iteration_pilot_program_id_fkey" FOREIGN KEY ("pilot_program_id") REFERENCES "PilotProgram"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "LearningObjective" ADD CONSTRAINT "LearningObjective_course_module_id_fkey" FOREIGN KEY ("course_module_id") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Lecture" ADD CONSTRAINT "Lecture_course_module_id_fkey" FOREIGN KEY ("course_module_id") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "LectureNotes" ADD CONSTRAINT "LectureNotes_lecture_id_fkey" FOREIGN KEY ("lecture_id") REFERENCES "Lecture"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_course_module_id_fkey" FOREIGN KEY ("course_module_id") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_timeline_id_fkey" FOREIGN KEY ("timeline_id") REFERENCES "Timeline"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ModuleFeedback" ADD CONSTRAINT "ModuleFeedback_pilot_program_id_fkey" FOREIGN KEY ("pilot_program_id") REFERENCES "PilotProgram"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_project_connection_id_fkey" FOREIGN KEY ("project_connection_id") REFERENCES "ProjectConnection"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PhaseProgress" ADD CONSTRAINT "PhaseProgress_course_project_id_fkey" FOREIGN KEY ("course_project_id") REFERENCES "CourseProject"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PilotProgram" ADD CONSTRAINT "PilotProgram_course_project_id_fkey" FOREIGN KEY ("course_project_id") REFERENCES "CourseProject"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PilotStudent" ADD CONSTRAINT "PilotStudent_pilot_program_id_fkey" FOREIGN KEY ("pilot_program_id") REFERENCES "PilotProgram"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PortfolioAsset" ADD CONSTRAINT "PortfolioAsset_course_project_id_fkey" FOREIGN KEY ("course_project_id") REFERENCES "CourseProject"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PracticeProblem" ADD CONSTRAINT "PracticeProblem_lecture_notes_id_fkey" FOREIGN KEY ("lecture_notes_id") REFERENCES "LectureNotes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProjectRequirements" ADD CONSTRAINT "ProjectRequirements_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "QualityReview" ADD CONSTRAINT "QualityReview_course_project_id_fkey" FOREIGN KEY ("course_project_id") REFERENCES "CourseProject"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_module_feedback_id_fkey" FOREIGN KEY ("module_feedback_id") REFERENCES "ModuleFeedback"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ReflectionQuestion" ADD CONSTRAINT "ReflectionQuestion_spiritual_integration_id_fkey" FOREIGN KEY ("spiritual_integration_id") REFERENCES "SpiritualIntegration"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_lecture_id_fkey" FOREIGN KEY ("lecture_id") REFERENCES "Lecture"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Rubric" ADD CONSTRAINT "Rubric_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RubricCriterion" ADD CONSTRAINT "RubricCriterion_rubric_id_fkey" FOREIGN KEY ("rubric_id") REFERENCES "Rubric"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RubricLevel" ADD CONSTRAINT "RubricLevel_rubric_criterion_id_fkey" FOREIGN KEY ("rubric_criterion_id") REFERENCES "RubricCriterion"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Scripture" ADD CONSTRAINT "Scripture_biblical_foundation_id_fkey" FOREIGN KEY ("biblical_foundation_id") REFERENCES "BiblicalFoundation"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SpiritualIntegration" ADD CONSTRAINT "SpiritualIntegration_course_module_id_fkey" FOREIGN KEY ("course_module_id") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StreamingUrl" ADD CONSTRAINT "StreamingUrl_video_asset_id_fkey" FOREIGN KEY ("video_asset_id") REFERENCES "VideoAsset"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_course_project_id_fkey" FOREIGN KEY ("course_project_id") REFERENCES "CourseProject"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Testimony" ADD CONSTRAINT "Testimony_outcome_data_id_fkey" FOREIGN KEY ("outcome_data_id") REFERENCES "OutcomeData"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Timeline" ADD CONSTRAINT "Timeline_course_project_id_fkey" FOREIGN KEY ("course_project_id") REFERENCES "CourseProject"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "VideoAsset" ADD CONSTRAINT "VideoAsset_lecture_id_fkey" FOREIGN KEY ("lecture_id") REFERENCES "Lecture"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "VideoQualityReport" ADD CONSTRAINT "VideoQualityReport_quality_review_id_fkey" FOREIGN KEY ("quality_review_id") REFERENCES "QualityReview"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ScrollBookMetadata" ADD CONSTRAINT "ScrollBookMetadata_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "ScrollBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollChapter" ADD CONSTRAINT "ScrollChapter_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "ScrollBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollDiagram" ADD CONSTRAINT "ScrollDiagram_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "ScrollBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollDiagram" ADD CONSTRAINT "ScrollDiagram_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "ScrollChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollReference" ADD CONSTRAINT "ScrollReference_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "ScrollChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollSummary" ADD CONSTRAINT "ScrollSummary_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "ScrollChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollExercise" ADD CONSTRAINT "ScrollExercise_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "ScrollChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollCourseMaterial" ADD CONSTRAINT "ScrollCourseMaterial_textbook_id_fkey" FOREIGN KEY ("textbook_id") REFERENCES "ScrollBook"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollCourseMaterial" ADD CONSTRAINT "ScrollCourseMaterial_study_pack_id_fkey" FOREIGN KEY ("study_pack_id") REFERENCES "ScrollStudyPack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollKnowledgeNode" ADD CONSTRAINT "ScrollKnowledgeNode_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "ScrollChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollRelationship" ADD CONSTRAINT "ScrollRelationship_source_node_id_fkey" FOREIGN KEY ("source_node_id") REFERENCES "ScrollKnowledgeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollRelationship" ADD CONSTRAINT "ScrollRelationship_target_node_id_fkey" FOREIGN KEY ("target_node_id") REFERENCES "ScrollKnowledgeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollSource" ADD CONSTRAINT "ScrollSource_knowledge_node_id_fkey" FOREIGN KEY ("knowledge_node_id") REFERENCES "ScrollKnowledgeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollQuestion" ADD CONSTRAINT "ScrollQuestion_course_material_id_fkey" FOREIGN KEY ("course_material_id") REFERENCES "ScrollCourseMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollQuestion" ADD CONSTRAINT "ScrollQuestion_study_pack_id_fkey" FOREIGN KEY ("study_pack_id") REFERENCES "ScrollStudyPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollQuestion" ADD CONSTRAINT "ScrollQuestion_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "ScrollQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollFlashcard" ADD CONSTRAINT "ScrollFlashcard_study_pack_id_fkey" FOREIGN KEY ("study_pack_id") REFERENCES "ScrollStudyPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollCheatSheet" ADD CONSTRAINT "ScrollCheatSheet_study_pack_id_fkey" FOREIGN KEY ("study_pack_id") REFERENCES "ScrollStudyPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollQuiz" ADD CONSTRAINT "ScrollQuiz_study_pack_id_fkey" FOREIGN KEY ("study_pack_id") REFERENCES "ScrollStudyPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollReadingListItem" ADD CONSTRAINT "ScrollReadingListItem_course_material_id_fkey" FOREIGN KEY ("course_material_id") REFERENCES "ScrollCourseMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollSearchResult" ADD CONSTRAINT "ScrollSearchResult_search_query_id_fkey" FOREIGN KEY ("search_query_id") REFERENCES "ScrollSearchQuery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollSearchResult" ADD CONSTRAINT "ScrollSearchResult_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "ScrollBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollReadingSession" ADD CONSTRAINT "ScrollReadingSession_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "ScrollBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollAnnotation" ADD CONSTRAINT "ScrollAnnotation_reading_session_id_fkey" FOREIGN KEY ("reading_session_id") REFERENCES "ScrollReadingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollAnnotation" ADD CONSTRAINT "ScrollAnnotation_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "ScrollChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollBookmark" ADD CONSTRAINT "ScrollBookmark_reading_session_id_fkey" FOREIGN KEY ("reading_session_id") REFERENCES "ScrollReadingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollAudioNarration" ADD CONSTRAINT "ScrollAudioNarration_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "ScrollChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollExportRequest" ADD CONSTRAINT "ScrollExportRequest_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "ScrollBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ScrollDiagramToScrollStudyPack" ADD CONSTRAINT "_ScrollDiagramToScrollStudyPack_A_fkey" FOREIGN KEY ("A") REFERENCES "ScrollDiagram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ScrollDiagramToScrollStudyPack" ADD CONSTRAINT "_ScrollDiagramToScrollStudyPack_B_fkey" FOREIGN KEY ("B") REFERENCES "ScrollStudyPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
