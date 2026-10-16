CREATE TABLE "anime" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"title_japanese" text DEFAULT '' NOT NULL,
	"synopsis" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'TV' NOT NULL,
	"episodes" integer DEFAULT 12 NOT NULL,
	"episode_length" integer DEFAULT 24 NOT NULL,
	"status" text DEFAULT 'finished' NOT NULL,
	"year" integer NOT NULL,
	"season" text DEFAULT 'Spring' NOT NULL,
	"studio" text DEFAULT '' NOT NULL,
	"rating" real DEFAULT 7.5 NOT NULL,
	"popularity" integer DEFAULT 0 NOT NULL,
	"genres" text[] DEFAULT '{}' NOT NULL,
	"art_key" text DEFAULT 'fantasy' NOT NULL,
	"hue_shift" integer DEFAULT 0 NOT NULL,
	"accent_color" text DEFAULT '#8b5cf6' NOT NULL,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "library_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"anime_id" integer NOT NULL,
	"status" text DEFAULT 'plan_to_watch' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"score" integer,
	"favorite" boolean DEFAULT false NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "party_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"party_id" integer NOT NULL,
	"user_id" integer,
	"body" text NOT NULL,
	"type" text DEFAULT 'chat' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "party_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"party_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"anime_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"contains_spoilers" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"avatar_color" text DEFAULT '#8b5cf6' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watch_parties" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"host_id" integer NOT NULL,
	"anime_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"episode" integer DEFAULT 1 NOT NULL,
	"max_participants" integer DEFAULT 10 NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'live' NOT NULL,
	"scheduled_for" timestamp with time zone,
	"playback_state" text DEFAULT 'paused' NOT NULL,
	"playback_position" real DEFAULT 0 NOT NULL,
	"playback_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "anime" ADD CONSTRAINT "anime_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_entries" ADD CONSTRAINT "library_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_entries" ADD CONSTRAINT "library_entries_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_messages" ADD CONSTRAINT "party_messages_party_id_watch_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."watch_parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_messages" ADD CONSTRAINT "party_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_participants" ADD CONSTRAINT "party_participants_party_id_watch_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."watch_parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_participants" ADD CONSTRAINT "party_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_parties" ADD CONSTRAINT "watch_parties_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_parties" ADD CONSTRAINT "watch_parties_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "anime_slug_idx" ON "anime" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "anime_title_idx" ON "anime" USING btree ("title");--> statement-breakpoint
CREATE UNIQUE INDEX "library_user_anime_idx" ON "library_entries" USING btree ("user_id","anime_id");--> statement-breakpoint
CREATE INDEX "library_user_idx" ON "library_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "party_messages_party_idx" ON "party_messages" USING btree ("party_id");--> statement-breakpoint
CREATE UNIQUE INDEX "party_participants_unique_idx" ON "party_participants" USING btree ("party_id","user_id");--> statement-breakpoint
CREATE INDEX "reviews_anime_idx" ON "reviews" USING btree ("anime_id");--> statement-breakpoint
CREATE INDEX "reviews_user_idx" ON "reviews" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_idx" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "watch_parties_code_idx" ON "watch_parties" USING btree ("code");--> statement-breakpoint
CREATE INDEX "watch_parties_status_idx" ON "watch_parties" USING btree ("status");