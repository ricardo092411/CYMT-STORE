"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useStore } from "@/providers/store-provider";
import { useLiveProducts } from "@/providers/editor-provider";
import { ProductCard } from "@/components/product/product-card";
import { Container, buttonVariants } from "@/components/ui";

export default function FavoritesPage() {
  const { favorites, hydrated } = useStore();
  const products = useLiveProducts();

  if (!hydrated) {
    return (
      <Container className="py-24">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-2" />
      </Container>
    );
  }

  const favProducts = products.filter((p) => favorites.includes(p.id));

  if (favProducts.length === 0) {
    return (
      <Container className="py-24">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-surface-2">
            <Heart className="h-7 w-7 text-ink-faint" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold">Aún no tienes favoritos</h1>
          <p className="mt-2 text-ink-muted">
            Toca el ❤️ en cualquier producto para guardarlo aquí.
          </p>
          <Link href="/tienda" className={`${buttonVariants({ variant: "primary" })} mt-6`}>
            Explorar tienda
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-12 md:py-16">
      <h1 className="font-display text-3xl font-bold md:text-4xl">
        Favoritos <span className="text-ink-muted">({favProducts.length})</span>
      </h1>
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
        {favProducts.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </Container>
  );
}
