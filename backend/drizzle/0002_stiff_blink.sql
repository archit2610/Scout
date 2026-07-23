ALTER TABLE "messages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "messages" CASCADE;--> statement-breakpoint
ALTER TABLE "memory_chunks" DROP CONSTRAINT "memory_chunks_conversation_id_conversations_id_fk";
--> statement-breakpoint
DROP INDEX "memory_chunks_conversation_idx";--> statement-breakpoint
ALTER TABLE "memory_chunks" ADD COLUMN "report_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "memory_chunks" ADD CONSTRAINT "memory_chunks_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN "summary";--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN "summary_embedding";--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN "message_count";--> statement-breakpoint
ALTER TABLE "memory_chunks" DROP COLUMN "conversation_id";--> statement-breakpoint
ALTER TABLE "memory_chunks" DROP COLUMN "source_type";--> statement-breakpoint
ALTER TABLE "memory_chunks" DROP COLUMN "source_id";