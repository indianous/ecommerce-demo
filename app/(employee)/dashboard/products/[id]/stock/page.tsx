import { ProductStockContent } from './ProductStockContent'

export default async function ProductStockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProductStockContent id={id} />
}
