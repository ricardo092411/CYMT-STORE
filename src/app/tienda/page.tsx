import type { Metadata } from "next";
import { ProductBrowser } from "@/components/product/product-browser";
import { Container } from "@/components/ui";
import { getProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Tienda",
  description:
    "Explora todo el catálogo de CYMT STORE.",
  alternates: {
    canonical: "/tienda",
  },
};

export default async function TiendaPage() {
  const products = await getProducts();

  return (
    <>
      <Container className="pt-12">
        <p className="eyebrow mb-3">Catálogo completo</p>

        <h1 className="font-display text-4xl font-bold md:text-5xl">
          Tienda
        </h1>

        <p className="mt-3 max-w-xl text-ink-muted">
          Todos los productos disponibles.
        </p>
      </Container>

      <ProductBrowser products={products as any} />
    </>
  );
}