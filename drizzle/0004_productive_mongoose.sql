CREATE TABLE "borrowing_request_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "issue_records" DROP CONSTRAINT "issue_records_request_id_unique";--> statement-breakpoint
ALTER TABLE "borrowing_requests" ALTER COLUMN "component_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "borrowing_requests" ALTER COLUMN "quantity" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "borrowing_request_items" ADD CONSTRAINT "borrowing_request_items_request_id_borrowing_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."borrowing_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrowing_request_items" ADD CONSTRAINT "borrowing_request_items_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bri_request_id_idx" ON "borrowing_request_items" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "bri_component_id_idx" ON "borrowing_request_items" USING btree ("component_id");