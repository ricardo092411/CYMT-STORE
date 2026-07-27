"use client";

import { CartDrawer } from "@/components/cart/cart-drawer";
import { SearchOverlay } from "@/components/search/search-overlay";
import { ClubModal } from "@/components/club/club-modal";
import { EditorPanel } from "@/components/editor/editor-panel";

/**
 * Mounts the global overlays (cart drawer, search, club modal) once, near the
 * root, so any component can trigger them through the store.
 * EditorPanel se auto-desactiva por completo cuando EDIT_MODE = false.
 */
export function GlobalChrome() {
  return (
    <>
      <CartDrawer />
      <SearchOverlay />
      <ClubModal />
      <EditorPanel />
    </>
  );
}
