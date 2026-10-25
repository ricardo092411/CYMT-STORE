export type MachinerySpecification = {
  label: string;
  value: string;
};

export type MachineryCategory = {
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

export type MachineryProductImage = {
  id: number;
  productId: number;
  storagePath: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
};

export type MachineryProduct = {
  id: number;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string | null;
  specifications: MachinerySpecification[];
  priceNote: string | null;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  images: MachineryProductImage[];
};

export type MachineryMetrics = {
  categoryCount: number;
  productCount: number;
  publishedCount: number;
  draftCount: number;
};

export type MachineryCategoryPayload = {
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isPublished: boolean;
};

export type MachineryProductPayload = {
  categoryId: number;
  name: string;
  slug: string;
  shortDescription: string;
  description: string | null;
  specifications: MachinerySpecification[];
  priceNote: string | null;
  sortOrder: number;
  isPublished: boolean;
};

export type MachineryImagePayload = {
  id?: number;
  storagePath: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
};
