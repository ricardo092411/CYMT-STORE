export type DropTheme = string | null;

export interface Drop {
  slug: string;
  name: string;
  title: string | null;
  description: string | null;
  banner: string | null;
  image: string | null;
  theme: DropTheme;
  live: boolean;
  releaseDate: string | null;
}
