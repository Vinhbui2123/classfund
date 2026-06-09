CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"target_amount" integer NOT NULL,
	"status" varchar(10) DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"description" varchar(200) NOT NULL,
	"amount" integer NOT NULL,
	"expense_date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" varchar(100) NOT NULL,
	"normalized_name" varchar(100) NOT NULL,
	"student_id" varchar(50),
	"contact_info" varchar(100),
	"reference_code" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_student_id_unique" UNIQUE("student_id"),
	CONSTRAINT "members_reference_code_unique" UNIQUE("reference_code")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"campaign_id" integer NOT NULL,
	"amount_paid" integer NOT NULL,
	"payment_method" varchar(20) DEFAULT 'transfer' NOT NULL,
	"note" text,
	"payment_date" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "normalized_name_idx" ON "members" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "reference_code_idx" ON "members" USING btree ("reference_code");--> statement-breakpoint
CREATE INDEX "member_campaign_idx" ON "transactions" USING btree ("member_id","campaign_id");