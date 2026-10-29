/**
 * CYMT STORE — Global site configuration.
 *
 * Central place for brand strings, contact data, social links and the
 * list of interests shown in the Club CYMT modal.
 * Everything the brand might tweak lives here — no code changes required.
 */

export const site = {
  name: "CYMT STORE",
  legalName: "CYMT Store",
  shortName: "CYMT",
  tagline: "Streetwear Unicos",
  description:
    "CYMT STORE — Streetwear premium. Drops exclusivos de Anime, Rock, Naturaleza, Retro y Mas.",
  url: "https://cymt-store.vercel.app",
  locale: "es-SV",
  country: "El Salvador",
  city: "San Salvador",
  currency: "USD",
  currencySymbol: "$",

  logo: {
    src: "/logo/logo-cymt.png",
    alt: "CYMT STORE",
    /** Recommended display width for the wordmark in the header (px). */
    width: 132,
  },

  /**
   * WhatsApp configuration.
   * - link: the public click-to-chat link used by contact / floating buttons.
   * - number: OPTIONAL. Add the store number (country code, digits only),
   *   e.g. "50370000000", so checkout opens a direct chat with the order
   *   pre-filled. If left empty, checkout opens WhatsApp with the message
   *   pre-filled for the customer to send.
   */
  whatsapp: {
    link: "https://wa.me/message/GCATESYVFB3LH1",
    number: "50369992468",
  },

  social: {
    instagram: "https://www.instagram.com/cymt_store/",
    tiktok: "https://www.tiktok.com/@cymt2026",
    facebook: "https://www.facebook.com/profile.php?id=61590390429257",
    whatsapp: "https://wa.me/50369992468",
  },

  /** Interests offered in the Club CYMT signup. */
  interests: [
    "Anime",
    "Rock",
    "Videojuegos",
    "Naturaleza",
    "Dinosaurios",
    "Ediciones Limitadas",
    "Promociones",
  ] as const,

  /** Made-to-order promise shown across the experience. */
  productionNote:
    "Entregas En 48 Horas. La fabricación inicia una vez confirmado el pago por transferencia bancaria.",

  /** Rotating announcement bar messages. */
  announcements: [
    "✨ PRODUCCIÓN Al Detalle — Calidad premium hecha para ti",
    "🚚 ENVÍOS A TODO EL SALVADOR",
    "🔥 NUEVO DROP DISPONIBLE — DROP ANIME & DROP RETRO",
    "🖤 ÚNETE AL CLUB CYMT — Acceso a drops exclusivos",
  ],
} as const;

export type SiteInterest = (typeof site.interests)[number];
