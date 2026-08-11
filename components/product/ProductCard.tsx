"use client";
import Link from "next/link";
import { Badge, Button, Card, Heading, Image, Rating, Text } from "base-ds";
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
  const onPromotion = product.onPromotion ?? false;
  const effectivePrice = product.effectivePrice ?? product.price;
  const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <Card variant="outlined" className="flex flex-col gap-2">
      <Link href={`/catalog/${product.slug}`} className="flex flex-col gap-2">
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

        <div className="flex items-center gap-2">
          <Badge variant="default" size="sm" className="w-fit">
            {product.categoryName}
          </Badge>
          {onPromotion && (
            <Badge variant="danger" size="sm" className="w-fit">
              Promoção
            </Badge>
          )}
        </div>
        <Heading as="h3" size="xl">
          {product.name}
        </Heading>

        {Boolean(product.reviewCount) && (
          <Rating value={Math.round(product.averageRating ?? 0)} readOnly size="sm" />
        )}

        {product.description && (
          <Text size="sm" color="muted" className="line-clamp-2">
            {product.description}
          </Text>
        )}
      </Link>

      <div className="mt-auto flex items-center justify-between gap-2">
        <div className="flex flex-col">
          {onPromotion && (
            <Text size="sm" color="muted" className="line-through">
              {formatBRL(product.price)}
            </Text>
          )}
          <Text weight="bold" size="lg">
            {formatBRL(effectivePrice)}
          </Text>
        </div>

        {inStock ? (
          <Button
            type="button"
            size="sm"
            onClick={() =>
              addItem({
                productId: product.id,
                name: product.name,
                price: effectivePrice,
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
