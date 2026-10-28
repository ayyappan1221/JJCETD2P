UPDATE "user_roles" SET "role" = 'D2P_INCHARGE' WHERE "role" = 'LAB_STAFF';--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."role";--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('ADMIN', 'D2P_INCHARGE', 'STUDENT');--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "role" SET DATA TYPE "public"."role" USING "role"::"public"."role";--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "first_name" varchar(100);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "last_name" varchar(100);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "register_number" varchar(50);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "spr_number" varchar(50);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "mobile_number" varchar(20);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "academic_year" varchar(20);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "section" varchar(5);