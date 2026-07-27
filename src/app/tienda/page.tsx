import type { Metadata } from "next";
import { ProductBrowser } from "@/components/product/product-browser";
import { Container } from "@/components/ui";
import { products } from "@/data/catalog";

export const metadata: Metadata = {
  title: "Tienda",
  description:
    "Explora todo el catálogo de CYMT STORE: camisetas, hoodies, gorras, stickers y más. Filtra por drop, variante, talla y precio.",
  alternates: { canonical: "/tienda" },
};

export default function TiendaPage() {
  return (
    <>
      <Container className="pt-12">
        <p className="eyebrow mb-3">Catálogo completo</p>
        <h1 className="font-display text-4xl font-bold md:text-5xl">Tienda</h1>
        <p className="mt-3 max-w-xl text-ink-muted">
          Todos los drops y productos en un solo lugar. Filtra por drop, variante, talla, precio y
          disponibilidad.
        </p>
      </Container>
      <ProductBrowser products={products} />
    </>
  );
}
