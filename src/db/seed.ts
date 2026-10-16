import { db } from "@/db";
import {
  anime,
  libraryEntries,
  partyMessages,
  partyParticipants,
  reviews,
  users,
  watchParties,
} from "@/db/schema";
import { SEED_ANIME } from "@/db/seed-data/anime";
import { hashPassword } from "@/lib/password";
import { slugify } from "@/lib/utils";

// Small deterministic PRNG so the demo data is stable across runs.
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEMO_USERS = [
  { email: "sakura@anisync.app", username: "sakura", displayName: "Sakura Tanaka", avatarColor: "#ec4899", role: "admin", bio: "Curator-in-chief. Will defend Frieren's pacing until the end of time." },
  { email: "kenji@anisync.app", username: "kenji", displayName: "Kenji Mori", avatarColor: "#22d3ee", role: "member", bio: "Shonen enjoyer. Hosting weekly Friday night watch parties." },
  { email: "yuki@anisync.app", username: "yuki", displayName: "Yuki Sato", avatarColor: "#8b5cf6", role: "member", bio: "Sci-fi and mecha only. Evangelion is a comedy, fight me." },
  { email: "aiko@anisync.app", username: "aiko", displayName: "Aiko Nakamura", avatarColor: "#f97316", role: "member", bio: "Slice of life connoisseur. Tea, cake, and K-On! reruns." },
  { email: "ren@anisync.app", username: "ren", displayName: "Ren Kobayashi", avatarColor: "#34d399", role: "member", bio: "Sports anime made me start running. Still slow." },
  { email: "hana@anisync.app", username: "hana", displayName: "Hana Ito", avatarColor: "#fbbf24", role: "member", bio: "Horror nights are my thing. Lights off, volume up." },
  { email: "daichi@anisync.app", username: "daichi", displayName: "Daichi Watanabe", avatarColor: "#3b82f6", role: "member", bio: "Working through the Ghibli catalogue with my kids." },
];

const REVIEW_TEMPLATES: { title: string; body: string; rating: number }[] = [
  { title: "An absolute masterpiece", body: "Every episode builds on the last with purpose. The character work is phenomenal, the pacing never drags, and the finale pays off threads set up in the very first episode. I cannot recommend this enough.", rating: 10 },
  { title: "Peak animation, slightly uneven writing", body: "Visually this is on another level — the fight choreography and lighting alone are worth the watch. The writing stumbles in the middle arc, but the highs are so high that it hardly matters.", rating: 8 },
  { title: "Took a few episodes to click", body: "I almost dropped it after episode three. I'm glad I didn't. Once the main cast comes together it becomes incredibly hard to stop watching. The soundtrack carries several key scenes.", rating: 8 },
  { title: "Comfort viewing at its finest", body: "Nothing here will change your life, and that's the point. It's warm, funny, and beautifully animated. Perfect for winding down after a long day.", rating: 9 },
  { title: "Emotionally devastating in the best way", body: "I was not prepared. The final arc had me in pieces, and the way the series earns those moments through quiet character beats is masterful. Bring tissues.", rating: 10 },
  { title: "Great premise, rushed ending", body: "The first half is some of the tightest storytelling I've seen in the genre. Unfortunately the last few episodes cram in too much, and some resolutions feel unearned. Still very much worth watching.", rating: 7 },
  { title: "Rewatched for the third time", body: "This show gets better every time. Details I missed on the first watch suddenly matter, and the foreshadowing is relentless. A genuine classic.", rating: 10 },
  { title: "Fun but forgettable", body: "I had a good time with it week to week, but a month later I struggle to remember specific moments. Solid production values, likeable cast, not much staying power.", rating: 6 },
  { title: "The hype is real", body: "I went in skeptical because everyone kept recommending it. Turns out everyone was right. The protagonist's growth is handled with a maturity you rarely see.", rating: 9 },
  { title: "Style over substance, and I love it", body: "The direction is bold, the colour palette is unreal, and the music slaps. The plot is thin, but honestly I was too busy admiring every frame to care.", rating: 8 },
  { title: "Underrated gem", body: "Why does nobody talk about this? The world-building is subtle and the characters feel like real people with real problems. Give it a chance.", rating: 9 },
  { title: "Perfect watch party material", body: "We watched this with a group of eight and the chat never stopped. Every episode ends on a hook that demands discussion. Ideal for a weekend binge.", rating: 8 },
  { title: "Bold, strange, and unforgettable", body: "It takes big swings and most of them land. Some viewers will bounce off the tonal shifts, but if you're on its wavelength there is nothing else like it.", rating: 9 },
  { title: "Good adaptation of the source", body: "As a manga reader I was worried about cuts, but the adaptation makes smart choices about what to expand and what to trim. The added scenes genuinely improve the story.", rating: 8 },
  { title: "Slow burn that pays off", body: "Patience is required. The first cour is methodical to a fault, but the second cour rewards you with some of the most satisfying payoffs in recent memory.", rating: 8 },
  { title: "Not for me, but I see the appeal", body: "Technically impressive and clearly made with love. I just never connected with the lead character, and the humour missed more than it hit for me.", rating: 6 },
];

const CHAT_LINES = [
  "okay the OP for this episode goes HARD",
  "wait who is that??",
  "no spoilers please I'm still catching up 🙏",
  "the animation in this scene is insane",
  "I've seen this one 3 times and still cry",
  "pause pause I need snacks",
  "this soundtrack lives in my head rent free",
  "called it. absolutely called it.",
  "can we rewind like 10 seconds I missed that line",
  "the voice acting here is top tier",
  "brb grabbing tea 🍵",
  "lmaooo that face",
  "okay this is where it gets good",
  "I forgot how brutal this arc is",
  "this is my favorite episode of the whole series",
  "the lighting in this shot >>>",
  "who's hosting next week?",
  "we are NOT skipping the ED tonight",
  "he's so cool it's actually unfair",
  "this is peak fiction and I will not be taking questions",
];

export async function seedDatabase() {
  const rand = mulberry32(42);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
  const hours = (h: number) => new Date(Date.now() + h * 60 * 60 * 1000);

  // Users ----------------------------------------------------------------
  const passwordHash = hashPassword("password123");
  const insertedUsers = await db
    .insert(users)
    .values(DEMO_USERS.map((u) => ({ ...u, passwordHash })))
    .returning();
  const admin = insertedUsers[0];
  const byUsername = Object.fromEntries(insertedUsers.map((u) => [u.username, u]));

  // Anime ----------------------------------------------------------------
  const insertedAnime = await db
    .insert(anime)
    .values(
      SEED_ANIME.map((a, i) => ({
        slug: slugify(a.title),
        title: a.title,
        titleJapanese: a.jp,
        synopsis: a.synopsis,
        type: a.type,
        episodes: a.episodes,
        episodeLength: a.episodeLength ?? 24,
        status: a.status,
        year: a.year,
        season: a.season,
        studio: a.studio,
        rating: a.rating,
        popularity: a.popularity,
        genres: a.genres,
        artKey: a.artKey,
        hueShift: a.hue,
        accentColor: a.accent,
        createdById: admin.id,
        createdAt: new Date(Date.now() - (SEED_ANIME.length - i) * 36 * 60 * 60 * 1000),
      })),
    )
    .returning();
  const bySlug = Object.fromEntries(insertedAnime.map((a) => [a.slug, a]));

  // Library entries --------------------------------------------------------
  const libraryRows: (typeof libraryEntries.$inferInsert)[] = [];
  const statuses = ["watching", "completed", "completed", "completed", "plan_to_watch", "plan_to_watch", "on_hold", "dropped"];
  for (const user of insertedUsers) {
    const count = randInt(14, 24);
    const shuffled = [...insertedAnime].sort(() => rand() - 0.5).slice(0, count);
    shuffled.forEach((a, idx) => {
      const status = idx < 3 ? "watching" : pick(statuses);
      const total = a.episodes;
      let progress = 0;
      if (status === "completed") progress = total;
      else if (status === "watching" || status === "on_hold") progress = Math.max(1, Math.floor(total * rand() * 0.9));
      else if (status === "dropped") progress = Math.max(1, Math.floor(total * rand() * 0.4));
      const score = status === "completed" || status === "dropped" || status === "watching" ? (rand() > 0.3 ? randInt(5, 10) : null) : null;
      libraryRows.push({
        userId: user.id,
        animeId: a.id,
        status,
        progress: Math.min(progress, total),
        score,
        favorite: status === "completed" && rand() > 0.7,
        updatedAt: new Date(Date.now() - randInt(0, 40) * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - randInt(40, 400) * 60 * 60 * 1000),
      });
    });
  }
  await db.insert(libraryEntries).values(libraryRows);

  // Reviews ---------------------------------------------------------------
  const reviewRows: (typeof reviews.$inferInsert)[] = [];
  const popular = [...insertedAnime].sort((a, b) => b.popularity - a.popularity).slice(0, 36);
  for (const a of popular) {
    const reviewerCount = randInt(1, 3);
    const reviewers = [...insertedUsers].sort(() => rand() - 0.5).slice(0, reviewerCount);
    for (const u of reviewers) {
      const t = pick(REVIEW_TEMPLATES);
      reviewRows.push({
        userId: u.id,
        animeId: a.id,
        rating: Math.max(1, Math.min(10, t.rating + randInt(-1, 1))),
        title: t.title,
        body: t.body,
        containsSpoilers: rand() > 0.8,
        createdAt: new Date(Date.now() - randInt(2, 600) * 60 * 60 * 1000),
      });
    }
  }
  await db.insert(reviews).values(reviewRows);

  // Watch parties ----------------------------------------------------------
  type PartySeed = {
    code: string;
    host: string;
    anime: string;
    name: string;
    description: string;
    episode: number;
    status: "scheduled" | "live" | "ended";
    max: number;
    isPrivate?: boolean;
    scheduledFor?: Date;
    playing?: boolean;
    position?: number;
    guests: string[];
    chat: number;
    endedAt?: Date;
  };

  const parties: PartySeed[] = [
    { code: "FRIEREN", host: "sakura", anime: "frieren-beyond-journey-s-end", name: "Frieren Friday — the Aura episode", description: "Weekly rewatch. We're at the best arc. No spoilers for first-timers!", episode: 10, status: "live", max: 10, playing: true, position: 312, guests: ["kenji", "aiko", "daichi", "hana", "yuki"], chat: 14 },
    { code: "SHONEN1", host: "kenji", anime: "jujutsu-kaisen", name: "JJK S1 binge night", description: "Catching up before the Culling Game. Join anytime.", episode: 7, status: "live", max: 8, playing: true, position: 95, guests: ["ren", "hana"], chat: 8 },
    { code: "MECHA99", host: "yuki", anime: "neon-genesis-evangelion", name: "Eva deep dive (pause for discussion)", description: "We pause every ten minutes to over-analyze. You've been warned.", episode: 16, status: "live", max: 6, playing: false, position: 540, guests: ["daichi"], chat: 6 },
    { code: "COZY22", host: "aiko", anime: "laid-back-camp", name: "Cozy camp Sunday", description: "Blankets mandatory. Hot chocolate strongly encouraged.", episode: 1, status: "scheduled", max: 10, scheduledFor: hours(3), guests: ["sakura", "hana"], chat: 2 },
    { code: "SPIKE01", host: "ren", anime: "haikyuu", name: "Haikyuu!! Spring tournament", description: "Starting from the Aoba Johsai match. Prepare to scream.", episode: 20, status: "scheduled", max: 10, scheduledFor: hours(27), guests: ["kenji"], chat: 1 },
    { code: "GHIBLI7", host: "daichi", anime: "spirited-away", name: "Ghibli movie night", description: "Family-friendly watch. Kids are joining on my account.", episode: 1, status: "scheduled", max: 10, isPrivate: true, scheduledFor: hours(72), guests: [], chat: 0 },
    { code: "HORROR3", host: "hana", anime: "the-promised-neverland", name: "Lights off: Promised Neverland finale", description: "", episode: 12, status: "ended", max: 10, position: 1380, guests: ["sakura", "kenji", "yuki", "aiko", "ren", "daichi"], chat: 12, endedAt: hours(-20) },
    { code: "BEBOP00", host: "yuki", anime: "cowboy-bebop", name: "See you space cowboy", description: "Ballad of Fallen Angels. The episode that made me love anime.", episode: 5, status: "ended", max: 6, position: 1400, guests: ["sakura", "ren"], chat: 9, endedAt: hours(-70) },
    { code: "SILENT9", host: "sakura", anime: "a-silent-voice", name: "A Silent Voice (bring tissues)", description: "", episode: 1, status: "ended", max: 10, position: 7800, guests: ["aiko", "hana", "daichi"], chat: 7, endedAt: hours(-160) },
  ];

  for (const p of parties) {
    const host = byUsername[p.host];
    const a = bySlug[p.anime];
    if (!host || !a) continue;
    const createdAt = p.status === "ended" ? new Date((p.endedAt ?? hours(-24)).getTime() - 2 * 60 * 60 * 1000) : hours(-randInt(1, 6));
    const [party] = await db
      .insert(watchParties)
      .values({
        code: p.code,
        hostId: host.id,
        animeId: a.id,
        name: p.name,
        description: p.description,
        episode: p.episode,
        maxParticipants: p.max,
        isPrivate: p.isPrivate ?? false,
        status: p.status,
        scheduledFor: p.scheduledFor ?? null,
        playbackState: p.playing ? "playing" : "paused",
        playbackPosition: p.position ?? 0,
        playbackUpdatedAt: new Date(),
        createdAt,
        updatedAt: createdAt,
        endedAt: p.endedAt ?? null,
      })
      .returning();

    const members = [host, ...p.guests.map((g) => byUsername[g]).filter(Boolean)];
    if (p.status !== "ended") {
      await db.insert(partyParticipants).values(
        members.map((m, i) => ({
          partyId: party.id,
          userId: m.id,
          joinedAt: new Date(createdAt.getTime() + i * 3 * 60 * 1000),
          lastSeenAt: new Date(),
        })),
      );
    }

    const messages: (typeof partyMessages.$inferInsert)[] = [];
    messages.push({ partyId: party.id, userId: null, type: "system", body: `${host.displayName} opened the room`, createdAt });
    members.slice(1).forEach((m, i) => {
      messages.push({ partyId: party.id, userId: null, type: "system", body: `${m.displayName} joined`, createdAt: new Date(createdAt.getTime() + (i + 1) * 3 * 60 * 1000) });
    });
    const usedLines = [...CHAT_LINES].sort(() => rand() - 0.5);
    for (let i = 0; i < p.chat; i++) {
      const author = pick(members);
      messages.push({
        partyId: party.id,
        userId: author.id,
        type: rand() > 0.85 ? "reaction" : "chat",
        body: rand() > 0.85 ? pick(["🔥", "😂", "😭", "👏"]) : usedLines[i % usedLines.length],
        createdAt: new Date(createdAt.getTime() + (members.length * 3 + i * 2) * 60 * 1000),
      });
    }
    if (p.status === "ended") {
      messages.push({ partyId: party.id, userId: null, type: "system", body: "The host ended the party", createdAt: p.endedAt ?? new Date() });
    }
    await db.insert(partyMessages).values(messages);
  }

  return { users: insertedUsers.length, anime: insertedAnime.length };
}
