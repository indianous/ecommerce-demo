import { Carousel, Image } from '@indianous/base-ds'
import type { Banner } from '@/types'

interface Props {
  banners: Banner[]
}

export function BannerCarousel({ banners }: Props) {
  if (banners.length === 0) return null

  return (
    <Carousel
      loop
      items={banners.map((banner) => {
        const image = (
          <Image
            src={banner.imageUrl}
            alt="Banner promocional"
            aspectRatio="video"
            objectFit="cover"
            className="w-full rounded-lg"
          />
        )
        return banner.linkUrl ? (
          <a key={banner.id} href={banner.linkUrl} className="block w-full">
            {image}
          </a>
        ) : (
          <div key={banner.id} className="w-full">
            {image}
          </div>
        )
      })}
    />
  )
}
