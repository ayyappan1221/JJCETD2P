CREATE TYPE "public"."issue_status" AS ENUM('ACTIVE', 'PARTIALLY_RETURNED', 'RETURNED');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('REQUEST_SUBMITTED', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'COMPONENT_ISSUED', 'RETURN_DUE_SOON', 'COMPONENT_OVERDUE', 'REQUEST_CANCELLED', 'LOW_STOCK_ALERT');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'ISSUED');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('ADMIN', 'D2P_INCHARGE', 'LAB_STAFF', 'STUDENT');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('RECEIPT', 'ISSUE', 'RETURN', 'ADJUSTMENT');--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid,
	"before_state" jsonb,
	"after_state" jsonb,
	"correlation_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "borrowing_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(30) NOT NULL,
	"student_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"purpose" text,
	"requested_return_date" timestamp with time zone NOT NULL,
	"status" "request_status" DEFAULT 'PENDING' NOT NULL,
	"decision_by_id" uuid,
	"decision_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "borrowing_requests_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category_id" uuid,
	"description" text,
	"unit" varchar(30) DEFAULT 'pcs' NOT NULL,
	"total_quantity" integer DEFAULT 0 NOT NULL,
	"available_quantity" integer DEFAULT 0 NOT NULL,
	"issued_quantity" integer DEFAULT 0 NOT NULL,
	"storage_location" varchar(100),
	"min_stock_threshold" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "components_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "issue_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(30) NOT NULL,
	"request_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"quantity_issued" integer NOT NULL,
	"issued_by_id" uuid NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expected_return_date" timestamp with time zone NOT NULL,
	"status" "issue_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issue_records_reference_unique" UNIQUE("reference"),
	CONSTRAINT "issue_records_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"related_entity_type" varchar(50),
	"related_entity_id" uuid,
	"is_read" boolean DEFAULT false NOT NULL,
	"dedupe_key" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"roll_number" varchar(50),
	"department" varchar(100),
	"phone" varchar(20),
	"password_hash" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "return_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(30) NOT NULL,
	"issue_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"returned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"received_by_id" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "return_records_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(30) NOT NULL,
	"component_id" uuid NOT NULL,
	"type" "stock_movement_type" NOT NULL,
	"quantity_delta" integer NOT NULL,
	"reason" text NOT NULL,
	"performed_by_id" uuid NOT NULL,
	"related_issue_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_movements_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrowing_requests" ADD CONSTRAINT "borrowing_requests_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrowing_requests" ADD CONSTRAINT "borrowing_requests_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrowing_requests" ADD CONSTRAINT "borrowing_requests_decision_by_id_profiles_id_fk" FOREIGN KEY ("decision_by_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "components" ADD CONSTRAINT "components_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_records" ADD CONSTRAINT "issue_records_request_id_borrowing_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."borrowing_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_records" ADD CONSTRAINT "issue_records_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_records" ADD CONSTRAINT "issue_records_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_records" ADD CONSTRAINT "issue_records_issued_by_id_profiles_id_fk" FOREIGN KEY ("issued_by_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_profiles_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_records" ADD CONSTRAINT "return_records_issue_id_issue_records_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issue_records"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_records" ADD CONSTRAINT "return_records_received_by_id_profiles_id_fk" FOREIGN KEY ("received_by_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_performed_by_id_profiles_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_related_issue_id_issue_records_id_fk" FOREIGN KEY ("related_issue_id") REFERENCES "public"."issue_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "br_student_id_idx" ON "borrowing_requests" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "br_component_id_idx" ON "borrowing_requests" USING btree ("component_id");--> statement-breakpoint
CREATE INDEX "br_status_idx" ON "borrowing_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "br_created_at_idx" ON "borrowing_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "components_category_id_idx" ON "components" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "components_code_idx" ON "components" USING btree ("code");--> statement-breakpoint
CREATE INDEX "components_name_idx" ON "components" USING btree ("name");--> statement-breakpoint
CREATE INDEX "ir_student_id_idx" ON "issue_records" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "ir_component_id_idx" ON "issue_records" USING btree ("component_id");--> statement-breakpoint
CREATE INDEX "ir_status_idx" ON "issue_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ir_expected_return_idx" ON "issue_records" USING btree ("expected_return_date");--> statement-breakpoint
CREATE INDEX "notif_recipient_idx" ON "notifications" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "notif_is_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "notif_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "profiles_auth_user_id_idx" ON "profiles" USING btree ("auth_user_id");--> statement-breakpoint
CREATE INDEX "rr_issue_id_idx" ON "return_records" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "sm_component_id_idx" ON "stock_movements" USING btree ("component_id");--> statement-breakpoint
CREATE INDEX "sm_type_idx" ON "stock_movements" USING btree ("type");--> statement-breakpoint
CREATE INDEX "sm_created_at_idx" ON "stock_movements" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_user_role_idx" ON "user_roles" USING btree ("user_id","role");