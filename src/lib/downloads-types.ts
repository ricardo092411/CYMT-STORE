export type DigitalSpecification = { label: string; value: string };
export type DigitalOrderStatus = "pending_payment" | "payment_review" | "paid" | "payment_failed" | "cancelled" | "refunded";
export type DigitalPaymentMethod = "bank_transfer" | "paypal";

export type DigitalCategory = { id: number; name: string; slug: string; description: string | null; sortOrder: number; isPublished: boolean; productCount: number; createdAt: string; updatedAt: string };
export type DigitalPreview = { id: number; productId: number; storagePath: string; altText: string | null; sortOrder: number; isPrimary: boolean; createdAt: string };
/** Private path is returned only from Admin-protected endpoints, never public catalog or order responses. */
export type DigitalFile = { id: number; productId: number; storagePath: string; originalName: string; mimeType: string | null; sizeBytes: number | null; sortOrder: number; createdAt: string };
export type DigitalProduct = { id: number; categoryId: number; categoryName: string; categorySlug: string; name: string; slug: string; shortDescription: string; description: string | null; specifications: DigitalSpecification[]; priceCents: number; currency: "USD"; sortOrder: number; isPublished: boolean; createdAt: string; updatedAt: string; previews: DigitalPreview[]; files: DigitalFile[] };
export type DigitalCategoryPayload = { name: string; slug: string; description: string | null; sortOrder: number; isPublished: boolean };
export type DigitalProductPayload = { categoryId: number; name: string; slug: string; shortDescription: string; description: string | null; specifications: DigitalSpecification[]; priceCents: number; sortOrder: number; isPublished: boolean };
export type DigitalPreviewPayload = { id?: number; storagePath: string; altText: string | null; sortOrder: number; isPrimary: boolean };
export type DigitalFilePayload = { id?: number; storagePath: string; originalName: string; mimeType: string | null; sizeBytes: number | null; sortOrder: number };
export type DigitalOrderSummary = { publicId: string; customerEmail: string; customerName: string | null; paymentMethod: DigitalPaymentMethod; status: DigitalOrderStatus; totalCents: number; currency: "USD"; productName: string; createdAt: string; paidAt: string | null };
