export type WorkType =
  | "jeux"
  | "series"
  | "livres"
  | "manga"
  | "films"
  | "musique"
  | "concerts"
  | "mode";

export const WORK_TYPES: { value: WorkType; label: string }[] = [
  { value: "jeux", label: "Jeux" },
  { value: "series", label: "Séries" },
  { value: "livres", label: "Livres" },
  { value: "manga", label: "Manga" },
  { value: "films", label: "Films" },
  { value: "musique", label: "Musique" },
  { value: "concerts", label: "Concerts" },
  { value: "mode", label: "Mode" },
];

export const WORK_TYPE_LABEL: Record<WorkType, string> = Object.fromEntries(
  WORK_TYPES.map((t) => [t.value, t.label]),
) as Record<WorkType, string>;

export interface CastMember {
  id: number;
  name: string;
  character?: string;
  profileUrl?: string | null;
}

export interface Work {
  id: string;
  title: string;
  type: WorkType;
  subtitle?: string;
  coverIcon?: string;
  verified?: boolean;
  avg?: number | null;
  ratingsCount?: number;
  myRating?: number | null;
  episodes?: Episode[];
  // Enrichissement TMDB (films et séries uniquement).
  tmdbId?: number;
  tmdbType?: "movie" | "tv";
  posterUrl?: string | null;
  backdropUrl?: string | null;
  year?: number | null;
  overview?: string | null;
  cast?: CastMember[];
}

export interface Episode {
  id: string;
  title: string;
  number?: number;
  order?: number;
  avg?: number;
  ratingsCount?: number;
}

export interface User {
  id?: string;
  username: string;
  level?: string;
  points?: number;
  bio?: string;
  links?: { platform: string; handle: string }[];
  rank?: number;
}

export interface Post {
  id: string;
  body: string;
  spoiler?: boolean;
  score: number;
  createdAt: string;
  myVote?: 1 | -1 | 0;
  author: { username: string; level?: string };
  work: {
    id: string;
    title: string;
    type: WorkType;
    coverIcon?: string;
    tmdbId?: number;
    posterUrl?: string | null;
  };
}

export interface Community {
  id: string;
  slug: string;
  name: string;
  description?: string;
  memberCount: number;
  joined: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  level?: string;
  points: number;
}
