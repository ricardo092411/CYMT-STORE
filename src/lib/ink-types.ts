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
