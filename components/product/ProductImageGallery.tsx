import { Carousel, Image } from 'base-ds'

interface Props {
  imageUrls: string[]
  productName: string
}

export function ProductImageGallery({ imageUrls, productName }: Props) {
  if (imageUrls.length === 0) {
    return (
      <div
        role="img"
        aria-label={productName}
        className="flex aspect-[3/4] items-center justify-center rounded bg-muted text-muted-foreground"
      />
    )
  }

  return (
    <Carousel
      items={imageUrls.map((url, i) => (
        <Image
          key={url}
          src={url}
          alt={`${productName} — imagem ${i + 1}`}
          aspectRatio="portrait"
          objectFit="contain"
          className="rounded"
        />
      ))}
    />
  )
}
