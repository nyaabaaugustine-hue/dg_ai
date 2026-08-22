-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CompatibilityStatus" AS ENUM ('COMPATIBLE', 'INCOMPATIBLE', 'CONDITIONAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('REQUIRED', 'COMPLEMENTARY', 'COMMONLY_REPLACED_WITH', 'INSPECT', 'PREVENTIVE', 'ALTERNATIVE', 'UPGRADE', 'ACCESSORY', 'RELATED', 'INCOMPATIBLE');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('RECOMMENDATION_ACCEPTED', 'RECOMMENDATION_REJECTED', 'WRONG_PART', 'MISUNDERSTOOD_LOCAL_NAME', 'PRICE_CORRECTED', 'COMPATIBILITY_CORRECTED', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('MANUAL', 'CATALOGUE', 'MANUFACTURER_DOCUMENTATION', 'TECHNICAL_DOCUMENT', 'PRICE_LIST', 'OTHER');

-- CreateEnum
CREATE TYPE "KnowledgeType" AS ENUM ('FUNCTION', 'SYMPTOMS', 'FAILURE_MODES', 'DIAGNOSTIC_CLUES', 'INSTALLATION_NOTES', 'MAINTENANCE', 'ENGINEERING_EXPLANATION', 'WARNING', 'GENERAL');

-- CreateEnum
CREATE TYPE "ConversationRole" AS ENUM ('USER', 'ASSISTANT', 'TOOL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'CONFIRMED', 'CANCELLED', 'CONVERTED');

-- CreateTable
CREATE TABLE "manufacturers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manufacturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "generation" TEXT,
    "engine" TEXT,
    "year_from" INTEGER,
    "year_to" INTEGER,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_grades" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "subcategory" TEXT,
    "part_number" TEXT,
    "vehicle_system" TEXT,
    "manufacturer_id" TEXT,
    "stock_qty" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_aliases" (
    "id" TEXT NOT NULL,
    "part_id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "source" TEXT,
    "confidence" DOUBLE PRECISION DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_prices" (
    "id" TEXT NOT NULL,
    "part_id" TEXT NOT NULL,
    "quality_grade_id" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_compatibility" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "part_id" TEXT NOT NULL,
    "status" "CompatibilityStatus" NOT NULL DEFAULT 'UNKNOWN',
    "notes" TEXT,
    "source" TEXT,
    "confidence" DOUBLE PRECISION DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_compatibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_relationships" (
    "id" TEXT NOT NULL,
    "source_part_id" TEXT NOT NULL,
    "target_part_id" TEXT NOT NULL,
    "relationship_type" "RelationshipType" NOT NULL,
    "reason" TEXT,
    "confidence" DOUBLE PRECISION DEFAULT 1,
    "source" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engineering_knowledge" (
    "id" TEXT NOT NULL,
    "part_id" TEXT,
    "vehicle_id" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "kind" "KnowledgeType" NOT NULL DEFAULT 'GENERAL',
    "source" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engineering_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "manufacturer" TEXT,
    "url" TEXT,
    "document_type" "DocumentType" NOT NULL DEFAULT 'OTHER',
    "extracted_text" TEXT,
    "metadata" JSONB,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "chunk_text" TEXT NOT NULL,
    "chunk_index" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "trigger_part_id" TEXT NOT NULL,
    "recommended_part_id" TEXT NOT NULL,
    "recommendation_type" "RelationshipType" NOT NULL,
    "reason" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "confidence" DOUBLE PRECISION DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "human_feedback" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "part_id" TEXT,
    "feedback_type" "FeedbackType" NOT NULL,
    "user_input" TEXT,
    "ai_response" TEXT,
    "correction_text" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "human_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "title" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" "ConversationRole" NOT NULL,
    "content" TEXT NOT NULL,
    "tools_called" JSONB,
    "retrieved_records" JSONB,
    "model" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "session_id" TEXT,
    "customer_name" TEXT,
    "vehicle_id" TEXT,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_query_logs" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "conversation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_query_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_items" (
    "id" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "part_id" TEXT NOT NULL,
    "quality_grade_id" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "is_recommended" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "manufacturers_name_key" ON "manufacturers"("name");

-- CreateIndex
CREATE INDEX "vehicles_manufacturer_model_idx" ON "vehicles"("manufacturer", "model");

-- CreateIndex
CREATE UNIQUE INDEX "quality_grades_code_key" ON "quality_grades"("code");

-- CreateIndex
CREATE INDEX "parts_name_idx" ON "parts"("name");

-- CreateIndex
CREATE INDEX "parts_part_number_idx" ON "parts"("part_number");

-- CreateIndex
CREATE INDEX "part_aliases_alias_idx" ON "part_aliases"("alias");

-- CreateIndex
CREATE INDEX "part_aliases_part_id_idx" ON "part_aliases"("part_id");

-- CreateIndex
CREATE INDEX "part_prices_part_id_active_idx" ON "part_prices"("part_id", "active");

-- CreateIndex
CREATE INDEX "part_prices_quality_grade_id_idx" ON "part_prices"("quality_grade_id");

-- CreateIndex
CREATE UNIQUE INDEX "part_compatibility_vehicle_id_part_id_key" ON "part_compatibility"("vehicle_id", "part_id");

-- CreateIndex
CREATE INDEX "part_relationships_source_part_id_relationship_type_idx" ON "part_relationships"("source_part_id", "relationship_type");

-- CreateIndex
CREATE INDEX "engineering_knowledge_part_id_idx" ON "engineering_knowledge"("part_id");

-- CreateIndex
CREATE INDEX "knowledge_chunks_document_id_idx" ON "knowledge_chunks"("document_id");

-- CreateIndex
CREATE INDEX "recommendations_trigger_part_id_active_idx" ON "recommendations"("trigger_part_id", "active");

-- CreateIndex
CREATE INDEX "conversations_session_id_idx" ON "conversations"("session_id");

-- CreateIndex
CREATE INDEX "conversation_messages_conversation_id_idx" ON "conversation_messages"("conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_reference_key" ON "quotations"("reference");

-- CreateIndex
CREATE INDEX "quotations_session_id_idx" ON "quotations"("session_id");

-- CreateIndex
CREATE INDEX "search_query_logs_created_at_idx" ON "search_query_logs"("created_at");

-- CreateIndex
CREATE INDEX "search_query_logs_query_idx" ON "search_query_logs"("query");

-- AddForeignKey
ALTER TABLE "parts" ADD CONSTRAINT "parts_manufacturer_id_fkey" FOREIGN KEY ("manufacturer_id") REFERENCES "manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_aliases" ADD CONSTRAINT "part_aliases_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_prices" ADD CONSTRAINT "part_prices_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_prices" ADD CONSTRAINT "part_prices_quality_grade_id_fkey" FOREIGN KEY ("quality_grade_id") REFERENCES "quality_grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_compatibility" ADD CONSTRAINT "part_compatibility_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_compatibility" ADD CONSTRAINT "part_compatibility_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_relationships" ADD CONSTRAINT "part_relationships_source_part_id_fkey" FOREIGN KEY ("source_part_id") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_relationships" ADD CONSTRAINT "part_relationships_target_part_id_fkey" FOREIGN KEY ("target_part_id") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engineering_knowledge" ADD CONSTRAINT "engineering_knowledge_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engineering_knowledge" ADD CONSTRAINT "engineering_knowledge_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_trigger_part_id_fkey" FOREIGN KEY ("trigger_part_id") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_recommended_part_id_fkey" FOREIGN KEY ("recommended_part_id") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "human_feedback" ADD CONSTRAINT "human_feedback_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "human_feedback" ADD CONSTRAINT "human_feedback_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quality_grade_id_fkey" FOREIGN KEY ("quality_grade_id") REFERENCES "quality_grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

