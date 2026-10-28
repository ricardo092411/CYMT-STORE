export type ConfectionSpecification = { label: string; value: string };

export type ConfectionCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isPublished: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ConfectionProductImage = {
  id: number;
  productId: number;
  storagePath: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
};

export type ConfectionProduct = {
  id: number;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string | null;
  specifications: ConfectionSpecification[];
  priceNote: string | null;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  images: ConfectionProductImage[];
};

export type ConfectionMetrics = { categoryCount: number; productCount: number; publishedCount: number; draftCount: number };
export type ConfectionCategoryPayload = { name: string; slug: string; description: string | null; sortOrder: number; isPublished: boolean };
export type ConfectionProductPayload = { categoryId: number; name: string; slug: string; shortDescription: string; description: string | null; specifications: ConfectionSpecification[]; priceNote: string | null; sortOrder: number; isPublished: boolean };
export type ConfectionImagePayload = { id?: number; storagePath: string; altText: string | null; sortOrder: number; isPrimary: boolean };
