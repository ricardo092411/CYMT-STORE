export type HomeHero = {
  badge: string;
  titlePrefix: string;
  titleHighlight: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  imageUrl: string | null;
  imageAlt: string;
};

export type HomeHeroContent = Omit<HomeHero, "imageUrl">;

export type HomeHeroSource = "database" | "row-missing" | "table-unavailable";
