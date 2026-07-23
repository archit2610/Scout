ALTER TABLE "conversations" DROP CONSTRAINT "conversations_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "memory_chunks" DROP CONSTRAINT "memory_chunks_report_id_reports_id_fk";
--> statement-breakpoint
ALTER TABLE "reports" DROP CONSTRAINT "reports_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "memory_chunks" ALTER COLUMN "embedding" SET DATA TYPE vector(768);--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "embedding" SET DATA TYPE vector(768);--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "anonymous_visitor_id" text;--> statement-breakpoint
ALTER TABLE "memory_chunks" ADD COLUMN "conversation_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "used_memory" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_chunks" ADD CONSTRAINT "memory_chunks_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_chunks" ADD CONSTRAINT "memory_chunks_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conv_user_idx" ON "conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conv_guest_idx" ON "conversations" USING btree ("anonymous_visitor_id");--> statement-breakpoint
CREATE INDEX "memory_chunks_conversation_idx" ON "memory_chunks" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "reports_conversation_idx" ON "reports" USING btree ("conversation_id");