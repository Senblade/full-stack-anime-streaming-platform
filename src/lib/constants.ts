export const APP_NAME = "AniSync";
export const MAX_PARTY_SIZE = 10;
export const SESSION_COOKIE = "anisync_session";

export const GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Historical",
  "Horror",
  "Isekai",
  "Mecha",
  "Music",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Superhero",
  "Supernatural",
  "Thriller",
] as const;

export const ANIME_TYPES = ["TV", "Movie", "OVA", "ONA", "Special"] as const;
export const ANIME_STATUSES = [
  { value: "airing", label: "Currently Airing" },
  { value: "finished", label: "Finished Airing" },
  { value: "upcoming", label: "Upcoming" },
] as const;
export const SEASONS = ["Winter", "Spring", "Summer", "Fall"] as const;

export const ART_KEYS = [
  { value: "action", label: "Action / Shonen" },
  { value: "fantasy", label: "Fantasy / Isekai" },
  { value: "scifi", label: "Sci-Fi / Mecha" },
  { value: "romance", label: "Romance / Drama" },
  { value: "slice", label: "Slice of Life / Comedy" },
  { value: "horror", label: "Horror / Thriller" },
  { value: "sports", label: "Sports" },
  { value: "adventure", label: "Adventure" },
] as const;
export type ArtKey = (typeof ART_KEYS)[number]["value"];

/** Demo stream clips used by the synced watch-party player (keyed by art style). */
export const ART_VIDEOS: Record<string, string> = {
  action: "https://videos.pexels.com/video-files/36325459/15405321_1920_1080_30fps.mp4",
  fantasy: "https://videos.pexels.com/video-files/8025555/8025555-uhd_3840_2160_24fps.mp4",
  scifi: "https://videos.pexels.com/video-files/34719182/14717093_1920_1080_30fps.mp4",
  romance: "https://videos.pexels.com/video-files/15039469/15039469-hd_1920_1080_30fps.mp4",
  slice: "https://videos.pexels.com/video-files/29005888/12543809_2560_1440_30fps.mp4",
  horror: "https://videos.pexels.com/video-files/35574240/15074411_3840_2160_24fps.mp4",
  sports: "https://videos.pexels.com/video-files/7062434/7062434-hd_1920_1080_24fps.mp4",
  adventure: "https://videos.pexels.com/video-files/34659098/14690800_3840_2160_30fps.mp4",
};

export const LIBRARY_STATUSES = [
  { value: "watching", label: "Watching", color: "#22d3ee" },
  { value: "completed", label: "Completed", color: "#34d399" },
  { value: "plan_to_watch", label: "Plan to Watch", color: "#a78bfa" },
  { value: "on_hold", label: "On Hold", color: "#fbbf24" },
  { value: "dropped", label: "Dropped", color: "#f87171" },
] as const;
export type LibraryStatus = (typeof LIBRARY_STATUSES)[number]["value"];

export const PARTY_STATUSES = ["scheduled", "live", "ended"] as const;
export type PartyStatus = (typeof PARTY_STATUSES)[number];

export const AVATAR_COLORS = [
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#22d3ee",
  "#34d399",
  "#fbbf24",
  "#f43f5e",
  "#3b82f6",
  "#a3e635",
  "#14b8a6",
];

export const REACTIONS = ["🔥", "😂", "😭", "👏", "😱", "❤️"];
