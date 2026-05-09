// Community service — wraps Supabase queries and adapts to the existing
// community type shape so we don't have to rewrite PostCard / CommentSection.
import { supabase } from "@/integrations/supabase/client";
import type {
  PostWithAuthor,
  CommentWithAuthor,
  UserProfile,
  FeedFilters,
  TrendingTopic,
} from "@/types/community";
import { PostType, PostVisibility, ModerationStatus } from "@/types/community";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

const fallbackUsername = (email: string | null, id: string) =>
  email ? email.split("@")[0] : id.slice(0, 8);

const splitName = (full?: string | null) => {
  if (!full) return { firstName: "Scroll", lastName: "Student" };
  const parts = full.trim().split(/\s+/);
  return {
    firstName: parts[0] || "Scroll",
    lastName: parts.slice(1).join(" ") || "Student",
  };
};

const adaptProfile = (p: ProfileRow): UserProfile => {
  const { firstName, lastName } = splitName(p.full_name);
  return {
    id: p.id,
    username: fallbackUsername(p.email, p.id),
    firstName,
    lastName,
    avatarUrl: p.avatar_url ?? undefined,
    bio: undefined,
    role: "student",
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
  };
};

type PostRow = {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  likes_count: number | null;
  comments_count: number | null;
  image_url: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string | null;
};

const hydratePost = (
  row: PostRow,
  author: UserProfile,
  isLiked: boolean,
): PostWithAuthor => ({
  id: row.id,
  authorId: row.user_id,
  content: row.content,
  type: PostType.TEXT,
  media: row.image_url
    ? [
        {
          id: `${row.id}-img`,
          type: "image" as never,
          url: row.image_url,
          filename: "image",
          mimetype: "image/*",
          size: 0,
          uploadedAt: row.created_at,
        },
      ]
    : [],
  visibility: PostVisibility.PUBLIC,
  isPinned: false,
  isEdited: !!row.updated_at && row.updated_at !== row.created_at,
  likesCount: row.likes_count ?? 0,
  commentsCount: row.comments_count ?? 0,
  sharesCount: 0,
  viewsCount: 0,
  flagged: false,
  moderationStatus: ModerationStatus.APPROVED,
  isPrayerRequest: false,
  scriptureReferences: [],
  hashtags: row.tags ?? [],
  mentions: [],
  createdAt: row.created_at,
  updatedAt: row.updated_at ?? row.created_at,
  author,
  isLiked,
});

async function fetchAuthorsByIds(ids: string[]): Promise<Map<string, UserProfile>> {
  const out = new Map<string, UserProfile>();
  if (ids.length === 0) return out;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .in("id", ids);
  (data ?? []).forEach((p) => out.set(p.id, adaptProfile(p as ProfileRow)));
  // Fill any missing entries with placeholder
  ids.forEach((id) => {
    if (!out.has(id)) {
      out.set(id, adaptProfile({ id, full_name: null, email: null, avatar_url: null }));
    }
  });
  return out;
}

export async function fetchFeed(
  filters: FeedFilters,
  limit: number,
  offset: number,
): Promise<{ posts: PostWithAuthor[]; hasMore: boolean }> {
  let q = supabase
    .from("community_posts")
    .select(
      "id, user_id, title, content, likes_count, comments_count, image_url, tags, created_at, updated_at",
      { count: "exact" },
    );

  if (filters.userId) q = q.eq("user_id", filters.userId);
  if (filters.hashtag) q = q.contains("tags", [filters.hashtag]);

  if (filters.sortBy === "popular" || filters.sortBy === "trending") {
    q = q.order("likes_count", { ascending: false }).order("created_at", { ascending: false });
  } else {
    q = q.order("created_at", { ascending: false });
  }

  q = q.range(offset, offset + limit - 1);

  const { data, error, count } = await q;
  if (error) throw error;
  const rows = (data ?? []) as PostRow[];
  const authors = await fetchAuthorsByIds(rows.map((r) => r.user_id));

  const { data: { user } } = await supabase.auth.getUser();
  let likedSet = new Set<string>();
  if (user && rows.length > 0) {
    const { data: likes } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", user.id)
      .in("post_id", rows.map((r) => r.id));
    likedSet = new Set((likes ?? []).map((l: { post_id: string }) => l.post_id));
  }

  const posts = rows.map((r) =>
    hydratePost(r, authors.get(r.user_id)!, likedSet.has(r.id)),
  );
  const total = count ?? offset + posts.length;
  return { posts, hasMore: offset + posts.length < total };
}

export async function createPost(input: {
  content: string;
  hashtags?: string[];
  imageUrl?: string;
}): Promise<PostWithAuthor> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to post");
  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      user_id: user.id,
      title: input.content.slice(0, 80),
      content: input.content,
      tags: input.hashtags ?? [],
      image_url: input.imageUrl ?? null,
    })
    .select(
      "id, user_id, title, content, likes_count, comments_count, image_url, tags, created_at, updated_at",
    )
    .single();
  if (error) throw error;
  const authors = await fetchAuthorsByIds([user.id]);
  return hydratePost(data as PostRow, authors.get(user.id)!, false);
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from("community_posts").delete().eq("id", postId);
  if (error) throw error;
}

export async function toggleLike(postId: string): Promise<{ liked: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to like posts");
  const { data: existing } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    await supabase.from("post_likes").delete().eq("id", existing.id);
    return { liked: false };
  }
  const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
  if (error) throw error;
  return { liked: true };
}

export async function reportPost(input: {
  postId: string;
  reason: string;
  details?: string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to report");
  const { error } = await supabase.from("post_reports").insert({
    post_id: input.postId,
    user_id: user.id,
    reason: input.reason,
    details: input.details ?? null,
  });
  if (error) throw error;
}

// ── Comments ────────────────────────────────────────────────────────────────
type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  likes_count: number | null;
  created_at: string;
};

const hydrateComment = (
  row: CommentRow,
  author: UserProfile,
): CommentWithAuthor => ({
  id: row.id,
  postId: row.post_id,
  authorId: row.user_id,
  content: row.content,
  isEdited: false,
  likesCount: row.likes_count ?? 0,
  flagged: false,
  moderationStatus: ModerationStatus.APPROVED,
  createdAt: row.created_at,
  updatedAt: row.created_at,
  author,
});

export async function fetchComments(postId: string): Promise<CommentWithAuthor[]> {
  const { data, error } = await supabase
    .from("post_comments")
    .select("id, post_id, user_id, content, likes_count, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as CommentRow[];
  const authors = await fetchAuthorsByIds(rows.map((r) => r.user_id));
  return rows.map((r) => hydrateComment(r, authors.get(r.user_id)!));
}

export async function addComment(postId: string, content: string): Promise<CommentWithAuthor> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to comment");
  const { data, error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, user_id: user.id, content })
    .select("id, post_id, user_id, content, likes_count, created_at")
    .single();
  if (error) throw error;
  const authors = await fetchAuthorsByIds([user.id]);
  return hydrateComment(data as CommentRow, authors.get(user.id)!);
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
  if (error) throw error;
}

// ── Trending hashtags (computed from tags column) ──────────────────────────
export async function fetchTrending(limit = 10): Promise<TrendingTopic[]> {
  const { data, error } = await supabase
    .from("community_posts")
    .select("tags, created_at")
    .gte("created_at", new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
    .not("tags", "is", null);
  if (error) throw error;
  const counts = new Map<string, number>();
  (data ?? []).forEach((r: { tags: string[] | null }) => {
    (r.tags ?? []).forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1));
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([hashtag, postCount], i) => ({
      id: `trend-${i}`,
      hashtag,
      postCount,
      engagementScore: postCount,
      trendingSince: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      isActive: true,
      createdAt: new Date().toISOString(),
    }));
}

// ── Follow graph ───────────────────────────────────────────────────────────
export async function followUser(targetId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to follow");
  if (user.id === targetId) throw new Error("You cannot follow yourself");
  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, following_id: targetId });
  if (error && error.code !== "23505") throw error;
}

export async function unfollowUser(targetId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetId);
}

export async function isFollowing(targetId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", targetId)
    .maybeSingle();
  return !!data;
}

export async function fetchSuggestedUsers(limit = 5): Promise<UserProfile[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  // Suggest profiles that current user does NOT yet follow (excluding self)
  const { data: following } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);
  const exclude = new Set<string>([user.id, ...(following ?? []).map((f: { following_id: string }) => f.following_id)]);
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .order("created_at", { ascending: false })
    .limit(limit + exclude.size);
  return ((data ?? []) as ProfileRow[])
    .filter((p) => !exclude.has(p.id))
    .slice(0, limit)
    .map(adaptProfile);
}

export async function searchPosts(query: string, limit = 5): Promise<PostWithAuthor[]> {
  const { data, error } = await supabase
    .from("community_posts")
    .select(
      "id, user_id, title, content, likes_count, comments_count, image_url, tags, created_at, updated_at",
    )
    .ilike("content", `%${query}%`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as PostRow[];
  const authors = await fetchAuthorsByIds(rows.map((r) => r.user_id));
  return rows.map((r) => hydratePost(r, authors.get(r.user_id)!, false));
}

export async function searchUsers(query: string, limit = 5): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as ProfileRow[]).map(adaptProfile);
}
