# CYMT STORE — Assets

Estructura de imágenes de la tienda. Todo se sirve desde `/public`.

```
public/
├── logo/            # Logotipo de la marca (logo-cymt.png)
└── images/
    ├── hero/        # Imágenes del Hero / home
    ├── banners/     # Banners de cada Drop
    ├── products/    # Mockups de productos (WebP/JPG)
    ├── collections/ # (reservado) imágenes de colecciones futuras
    ├── icons/       # (reservado) iconos personalizados
    └── avatars/     # (reservado) avatares / testimonials futuros
```

## Cómo agregar un mockup de producto

1. Coloca la imagen en `public/images/products/` (ej. `mi-camiseta.jpg`).
2. En `src/data/catalog.ts`, agrega la ruta al arreglo `images` del producto:

   ```ts
   images: ["/images/products/mi-camiseta.jpg"],
   ```

3. Listo. Si un producto no tiene imagen, se muestra automáticamente una
   tarjeta de marca elegante (no se rompe nada).

> Recomendado: usa imágenes con fondo oscuro/neutral, formato JPG o WebP, y
> relación de aspecto ~4:5 para las tarjetas.
