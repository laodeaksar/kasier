CREATE TYPE "public"."payment_method" AS ENUM('lunas', 'utang');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debt_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"debt_id" text NOT NULL,
	"amount" integer NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debt_payments_amount_positive" CHECK ("debt_payments"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"sale_id" text NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debts_amount_positive" CHECK ("debts"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"buy_price" integer NOT NULL,
	"sell_price" integer NOT NULL,
	"photo_url" text,
	"stock" numeric(12, 3) DEFAULT '0' NOT NULL,
	"show_in_catalog" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_stock_non_negative" CHECK ("products"."stock" >= 0),
	CONSTRAINT "products_buy_price_non_negative" CHECK ("products"."buy_price" >= 0),
	CONSTRAINT "products_sell_price_non_negative" CHECK ("products"."sell_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"sale_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit_price" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sale_items_sale_id_product_id_pk" PRIMARY KEY("sale_id","product_id"),
	CONSTRAINT "sale_items_quantity_positive" CHECK ("sale_items"."quantity" > 0),
	CONSTRAINT "sale_items_unit_price_non_negative" CHECK ("sale_items"."unit_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" text PRIMARY KEY NOT NULL,
	"total" integer NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"customer_id" text,
	"created_by" text NOT NULL,
	"voided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_total_non_negative" CHECK ("sales"."total" >= 0)
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "stock_ins" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"buy_price" integer NOT NULL,
	"received_date" date NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_ins_quantity_positive" CHECK ("stock_ins"."quantity" > 0),
	CONSTRAINT "stock_ins_buy_price_non_negative" CHECK ("stock_ins"."buy_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'kasir' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_role_valid" CHECK ("user"."role" in ('kasir', 'pemilik'))
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ins" ADD CONSTRAINT "stock_ins_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ins" ADD CONSTRAINT "stock_ins_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "debts_sale_id_unique" ON "debts" USING btree ("sale_id");