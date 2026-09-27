import { ImageGallery } from '@indianous/base-ds'

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
    <ImageGallery
      images={imageUrls.map((url, i) => ({
        src: url,
        alt: `${productName} — imagem ${i + 1}`,
      }))}
      thumbnailPosition="side"
      aspectRatio="portrait"
      objectFit="contain"
    />
  )
}
