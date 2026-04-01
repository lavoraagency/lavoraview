export interface Model {
  id: string;
  name: string;
  max_recent_reels: number | null;
  viral_view_threshold: number | null;
  platforms: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountGroup {
  id: string;
  name: string;
  model_id: string;
  group_type: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  instagram_username: string;
  platform: string | null;
  model_id: string | null;
  account_group_id: string | null;
  va_name: string | null;
  va_telegram: string | null;
  editor_name: string | null;
  account_slot: number | null;
  status: string | null;
  tags: string[] | null;
  is_active: boolean;
  source: string | null;
  notes: string | null;
  started_posting: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  model?: Model;
  account_group?: AccountGroup;
}

export interface ProfileSnapshot {
  id: string;
  profile_id: string;
  followers: number | null;
  following: number | null;
  media_count: number | null;
  total_reel_views: number | null;
  total_reel_likes: number | null;
  total_reel_comments: number | null;
  total_reel_shares: number | null;
  reels_tracked: number | null;
  scraped_at: string;
}

export interface Reel {
  id: string;
  profile_id: string;
  instagram_reel_id: string | null;
  shortcode: string | null;
  caption: string | null;
  thumbnail_url: string | null;
  reel_url: string | null;
  posted_at: string | null;
  current_views: number | null;
  current_likes: number | null;
  current_comments: number | null;
  current_shares: number | null;
  is_viral_tracked: boolean | null;
  last_daily_views: number | null;
  first_seen_at: string | null;
  last_scraped_at: string | null;
  // Joined
  profile?: Profile;
}

export interface ReelSnapshot {
  id: string;
  reel_id: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  views_delta: number | null;
  likes_delta: number | null;
  comments_delta: number | null;
  shares_delta: number | null;
  scraped_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface Filters {
  modelId: string | null;
  groupId: string | null;
  status: string | null;
  tags: string[];
  search: string;
  dateFrom: Date | null;
  dateTo: Date | null;
}
