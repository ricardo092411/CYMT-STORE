export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

type MetaPixelEventParameters = Record<string, unknown>;

type MetaPixelProduct = {
  productId: string;
  name: string;
  price: number;
  quantity?: number;
};

type MetaPixelCheckoutItem = Pick<MetaPixelProduct, "productId" | "quantity">;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function isMetaPixelEnabled() {
  return Boolean(META_PIXEL_ID);
}

function trackMetaPixelEvent(event: string, parameters?: MetaPixelEventParameters) {
  if (!isMetaPixelEnabled() || typeof window === "undefined" || !window.fbq) return;

  if (parameters) {
    window.fbq("track", event, parameters);
    return;
  }

  window.fbq("track", event);
}

function productParameters(product: MetaPixelProduct): MetaPixelEventParameters {
  return {
    content_ids: [product.productId],
    content_name: product.name,
    content_type: "product",
    value: product.price,
    currency: "USD",
    ...(product.quantity && product.quantity > 0 ? { quantity: product.quantity } : {}),
  };
}

export function trackMetaPixelPageView() {
  trackMetaPixelEvent("PageView");
}

export function trackMetaPixelViewContent(product: MetaPixelProduct) {
  trackMetaPixelEvent("ViewContent", productParameters(product));
}

export function trackMetaPixelAddToCart(product: MetaPixelProduct) {
  trackMetaPixelEvent("AddToCart", productParameters(product));
}

export function trackMetaPixelInitiateCheckout(items: MetaPixelCheckoutItem[], value: number) {
  trackMetaPixelEvent("InitiateCheckout", {
    content_ids: [...new Set(items.map((item) => item.productId))],
    content_type: "product",
    value,
    currency: "USD",
    num_items: items.reduce((total, item) => total + (item.quantity ?? 0), 0),
  });
}
