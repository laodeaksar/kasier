ALTER TABLE "sales" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "idempotency_request_hash" text;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_idempotency_key_unique" UNIQUE("idempotency_key");