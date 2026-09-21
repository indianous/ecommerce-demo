/** Link `wa.me` do telefone (o telefone de contato do site também é o WhatsApp); `null` se não for um telefone. */
export function whatsappUrl(phone: string | null | undefined): string | null {
  const digits = phone?.replace(/\D/g, '') ?? ''
  if (digits.length < 10 || digits.length > 13) return null
  const withCountry = digits.length <= 11 ? `55${digits}` : digits
  return `https://wa.me/${withCountry}`
}
