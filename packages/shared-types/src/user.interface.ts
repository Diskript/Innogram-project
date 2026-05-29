// User interface based on Prisma schema
// Note: DTOs are for validation, interfaces are for data shapes

// Minimal interfaces for relations
interface Account {
  id: string;
  userId: string;
  email: string;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Post {
  id: string;
  userId: string;
  content: string;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  parentCommentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Asset {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Posts_Assets {
  id: string;
  postId: string;
  assetId: string;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Users_Follows {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  // Primary fields
  id: string;
  role: string;
  disabled: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Audit fields
  createdBy?: string | null;
  updatedBy?: string | null;

  // Profile fields
  userName: string;
  displayName: string;
  birthday: Date;
  bio: string;
  avatarUrl: string;
  isPublic: boolean;
  deleted: boolean;

  // Relations (optional, may be populated based on query)
  creator?: User | null;
  updater?: User | null;
  createdUsers?: User[];
  updatedUsers?: User[];

  // Account relations
  accounts?: Account[];

  // Post relations
  createdPosts?: Post[];
  updatedPosts?: Post[];

  // Comment relations
  createdComments?: Comment[];
  updatedComments?: Comment[];
  comments?: Comment[];

  // Asset relations
  createdAssets?: Asset[];
  updatedAssets?: Asset[];

  // Post-Asset relations
  postsAssets?: Posts_Assets[];
  createdPostsAssets?: Posts_Assets[];
  updatedPostsAssets?: Posts_Assets[];

  // Follow relations
  followers?: Users_Follows[];
  following?: Users_Follows[];
}

// Partial user interface for public profile (limited fields)
export interface UserPublicProfile {
  id: string;
  userName: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  isPublic: boolean;
}

// User with counts for efficient queries
export interface UserWithCounts extends User {
  _count?: {
    posts: number;
    followers: number;
    following: number;
    comments: number;
  };
}

// User creation payload
export interface CreateUserPayload {
  userName: string;
  displayName: string;
  birthday: Date;
  bio?: string;
  avatarUrl?: string;
  isPublic?: boolean;
}

// User update payload
export interface UpdateUserPayload {
  displayName?: string;
  birthday?: Date;
  bio?: string;
  avatarUrl?: string;
  isPublic?: boolean;
  disabled?: boolean;
}
