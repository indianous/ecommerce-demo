"use client";
import { Badge, Button, Card, Heading, Image, Text } from "base-ds";
import { useCartStore } from "@/stores/cart.store";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import type { Product } from "@/types";

interface Props {
  product: Product;
}

function ImagePlaceholder({ name }: { name: string }) {
  return (
    <div
      role="img"
      aria-label={name}
      className="flex items-center justify-center aspect-[3/4] bg-muted rounded text-muted-foreground"
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    </div>
  );
}

export function ProductCard({ product }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const { placeholderImageUrl } = useSiteSettings();
  const inStock = product.stockQuantity > 0;
  const imageSrc = product.imageUrl ?? placeholderImageUrl ?? null;
  const formattedPrice = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(product.price);

  return (
    <Card variant="outlined" className="flex flex-col gap-2">
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={product.name}
          aspectRatio="portrait"
          objectFit="contain"
          className="rounded"
        />
      ) : (
        <ImagePlaceholder name={product.name} />
      )}

      <Badge variant="default" size="sm" className="w-fit">
        {product.categoryName}
      </Badge>
      <Heading as="h3" size="xl">
        {product.name}
      </Heading>

      {product.description && (
        <Text size="sm" color="muted" className="line-clamp-2">
          {product.description}
        </Text>
      )}

      <div className="mt-auto flex items-center justify-between gap-2">
        <Text weight="bold" size="lg">
          {formattedPrice}
        </Text>

        {inStock ? (
          <Button
            type="button"
            size="sm"
            onClick={() =>
              addItem({
                productId: product.id,
                name: product.name,
                price: product.price,
                imageUrl: product.imageUrl,
              })
            }
          >
            Adicionar ao carrinho
          </Button>
        ) : (
          <Badge variant="danger" size="sm">
            Sem estoque
          </Badge>
        )}
      </div>
    </Card>
  );
}
