import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  index,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------- Users & Sessions ----------
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    avatarColor: text("avatar_color").notNull().default("#8b5cf6"),
    bio: text("bio").notNull().default(""),
    role: text("role").notNull().default("member"), // 'admin' | 'member'
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email), uniqueIndex("users_username_idx").on(t.username)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    token: text("token").notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("sessions_token_idx").on(t.token), index("sessions_user_idx").on(t.userId)],
);

// ---------- Anime catalog ----------
export const anime = pgTable(
  "anime",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    titleJapanese: text("title_japanese").notNull().default(""),
    synopsis: text("synopsis").notNull().default(""),
    type: text("type").notNull().default("TV"), // TV | Movie | OVA | ONA | Special
    episodes: integer("episodes").notNull().default(12),
    episodeLength: integer("episode_length").notNull().default(24), // minutes
    status: text("status").notNull().default("finished"), // airing | finished | upcoming
    year: integer("year").notNull(),
    season: text("season").notNull().default("Spring"), // Winter | Spring | Summer | Fall
    studio: text("studio").notNull().default(""),
    rating: real("rating").notNull().default(7.5), // 0 - 10
    popularity: integer("popularity").notNull().default(0),
    genres: text("genres").array().notNull().default([]),
    artKey: text("art_key").notNull().default("fantasy"),
    hueShift: integer("hue_shift").notNull().default(0),
    accentColor: text("accent_color").notNull().default("#8b5cf6"),
    createdById: integer("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("anime_slug_idx").on(t.slug), index("anime_title_idx").on(t.title)],
);

// ---------- Library ----------
export const libraryEntries = pgTable(
  "library_entries",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    animeId: integer("anime_id")
      .notNull()
      .references(() => anime.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("plan_to_watch"), // watching | completed | plan_to_watch | on_hold | dropped
    progress: integer("progress").notNull().default(0),
    score: integer("score"), // 1-10
    favorite: boolean("favorite").notNull().default(false),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("library_user_anime_idx").on(t.userId, t.animeId), index("library_user_idx").on(t.userId)],
);

// ---------- Reviews ----------
export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    animeId: integer("anime_id")
      .notNull()
      .references(() => anime.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(), // 1-10
    title: text("title").notNull(),
    body: text("body").notNull(),
    containsSpoilers: boolean("contains_spoilers").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reviews_anime_idx").on(t.animeId), index("reviews_user_idx").on(t.userId)],
);

// ---------- Watch parties ----------
export const watchParties = pgTable(
  "watch_parties",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    hostId: integer("host_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    animeId: integer("anime_id")
      .notNull()
      .references(() => anime.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    episode: integer("episode").notNull().default(1),
    maxParticipants: integer("max_participants").notNull().default(10),
    isPrivate: boolean("is_private").notNull().default(false),
    status: text("status").notNull().default("live"), // scheduled | live | ended
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    playbackState: text("playback_state").notNull().default("paused"), // playing | paused
    playbackPosition: real("playback_position").notNull().default(0), // seconds
    playbackUpdatedAt: timestamp("playback_updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("watch_parties_code_idx").on(t.code), index("watch_parties_status_idx").on(t.status)],
);

export const partyParticipants = pgTable(
  "party_participants",
  {
    id: serial("id").primaryKey(),
    partyId: integer("party_id")
      .notNull()
      .references(() => watchParties.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("party_participants_unique_idx").on(t.partyId, t.userId)],
);

export const partyMessages = pgTable(
  "party_messages",
  {
    id: serial("id").primaryKey(),
    partyId: integer("party_id")
      .notNull()
      .references(() => watchParties.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    type: text("type").notNull().default("chat"), // chat | system | reaction
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("party_messages_party_idx").on(t.partyId)],
);

// ---------- Relations ----------
export const usersRelations = relations(users, ({ many }) => ({
  libraryEntries: many(libraryEntries),
  reviews: many(reviews),
  hostedParties: many(watchParties),
}));

export const animeRelations = relations(anime, ({ many, one }) => ({
  libraryEntries: many(libraryEntries),
  reviews: many(reviews),
  parties: many(watchParties),
  createdBy: one(users, { fields: [anime.createdById], references: [users.id] }),
}));

export const libraryRelations = relations(libraryEntries, ({ one }) => ({
  user: one(users, { fields: [libraryEntries.userId], references: [users.id] }),
  anime: one(anime, { fields: [libraryEntries.animeId], references: [anime.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  anime: one(anime, { fields: [reviews.animeId], references: [anime.id] }),
}));

export const partiesRelations = relations(watchParties, ({ one, many }) => ({
  host: one(users, { fields: [watchParties.hostId], references: [users.id] }),
  anime: one(anime, { fields: [watchParties.animeId], references: [anime.id] }),
  participants: many(partyParticipants),
  messages: many(partyMessages),
}));

export const participantsRelations = relations(partyParticipants, ({ one }) => ({
  party: one(watchParties, { fields: [partyParticipants.partyId], references: [watchParties.id] }),
  user: one(users, { fields: [partyParticipants.userId], references: [users.id] }),
}));

export const messagesRelations = relations(partyMessages, ({ one }) => ({
  party: one(watchParties, { fields: [partyMessages.partyId], references: [watchParties.id] }),
  user: one(users, { fields: [partyMessages.userId], references: [users.id] }),
}));

// ---------- Types ----------
export type User = typeof users.$inferSelect;
export type Anime = typeof anime.$inferSelect;
export type NewAnime = typeof anime.$inferInsert;
export type LibraryEntry = typeof libraryEntries.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type WatchParty = typeof watchParties.$inferSelect;
export type PartyParticipant = typeof partyParticipants.$inferSelect;
export type PartyMessage = typeof partyMessages.$inferSelect;
