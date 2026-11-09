export type InkSpecification = {
  label: string;
  value: string;
};

export type InkProductImage = {
  id: number;
  productId: number;
  storagePath: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
};

export type InkMediaType = "image" | "video";

export type InkProductMedia = {
  id: number;
  productId: number;
  mediaType: InkMediaType;
  storagePath: string;
  title: string | null;
  caption: string | null;
  altText: string | null;
  sortOrder: number;
  createdAt: string;
};

export type InkLandingSettings = {
  heroStoragePath: string | null;
  heroAltText: string | null;
  updatedAt: string | null;
};

export type InkProduct = {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  description: string | null;
  specifications: InkSpecification[];
  priceNote: string | null;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  images: InkProductImage[];
  showcaseMedia: InkProductMedia[];
};

export type InkMetrics = {
  productCount: number;
  publishedCount: number;
  draftCount: number;
};

export type InkProductPayload = {
  name: string;
  slug: string;
  shortDescription: string;
  description: string | null;
  specifications: InkSpecification[];
  priceNote: string | null;
  sortOrder: number;
  isPublished: boolean;
};

export type InkImagePayload = {
  id?: number;
  storagePath: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export type InkProductMediaPayload = {
  id?: number;
  mediaType: InkMediaType;
  storagePath: string;
  title: string | null;
  caption: string | null;
  altText: string | null;
  sortOrder: number;
};

export type InkLandingSettingsPayload = {
  heroStoragePath: string | null;
  heroAltText: string | null;
};
