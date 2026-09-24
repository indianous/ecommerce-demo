'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Button, Card, Container, Dialog, FormField, Heading, Icon, Radio, SearchField, Select, Switch, Text, Textarea, useToast } from 'base-ds'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { AddressForm, EMPTY_ADDRESS, type NewAddress } from '@/components/forms/AddressForm'
import { ManualOrderItemsForm, addLine, lineError, linesSubtotal, type ManualOrderLine } from '@/components/forms/ManualOrderItemsForm'
import { EMPTY_QUICK_CUSTOMER, QuickCustomerForm, toQuickCustomerInput, type QuickCustomerFormState } from '@/components/forms/QuickCustomerForm'
import { PickupLocationList } from '@/components/checkout-shared/PickupLocationList'
import { ShippingOptionsList } from '@/components/checkout-shared/ShippingOptionsList'
import { CopyButton } from '@/components/ui/CopyButton'
import { authFetch } from '@/lib/authFetch'
import { formatBRL } from '@/lib/format'
import { PAYMENT_METHOD_LABELS } from '@/lib/payment-labels'
import { useAuthStore } from '@/stores/auth.store'
import type {
  Address,
  AdminOrderDetailResponse,
  CustomerLookup,
  DeliveryMethod,
  DistributionCenter,
  ManualOrderInput,
  PaymentMethod,
  PaymentMethodsByDelivery,
  Product,
  ShippingQuote,
} from '@/types'

const NOTES_MAX = 500

/** Com o pagamento já recebido pela equipe, qualquer forma serve; pagar na retirada só com retirada. */
const RECEIVED_METHODS: Record<DeliveryMethod, PaymentMethod[]> = {
  DELIVERY: ['PIX', 'CREDIT_CARD'],
  PICKUP: ['PAY_ON_PICKUP', 'PIX', 'CREDIT_CARD'],
}

async function messageOf(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { message?: string } | null
  return data?.message ?? fallback
}

type Shipping = { loading: boolean; error: string | null; free: boolean; options: ShippingQuote[] }
const NO_SHIPPING: Shipping = { loading: false, error: null, free: false, options: [] }

export function ManualOrderContent({ ordersPath = '/dashboard/orders' }: { ordersPath?: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'ADMIN'
  const canReceive = isAdmin || !!user?.permissions?.includes('MANAGE_PAYMENTS')
  const canViewOrders = isAdmin || !!user?.permissions?.includes('MANAGE_ORDERS')

  // 1. Cliente
  const [customer, setCustomer] = useState<CustomerLookup | null>(null)
  const [customerResults, setCustomerResults] = useState<CustomerLookup[] | null>(null)
  const [searchingCustomers, setSearchingCustomers] = useState(false)
  const [customerDialog, setCustomerDialog] = useState(false)
  const [customerForm, setCustomerForm] = useState<QuickCustomerFormState>(EMPTY_QUICK_CUSTOMER)
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [existingCustomer, setExistingCustomer] = useState<CustomerLookup | null>(null)

  // 2. Itens
  const [lines, setLines] = useState<ManualOrderLine[]>([])
  const [productResults, setProductResults] = useState<Product[] | null>(null)
  const [searchingProducts, setSearchingProducts] = useState(false)

  // 3. Entrega
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressId, setAddressId] = useState('')
  const [addressDialog, setAddressDialog] = useState(false)
  const [newAddress, setNewAddress] = useState<NewAddress>(EMPTY_ADDRESS)
  const [savingAddress, setSavingAddress] = useState(false)
  const [shipping, setShipping] = useState<Shipping>(NO_SHIPPING)
  const [serviceId, setServiceId] = useState('')
  const [centers, setCenters] = useState<DistributionCenter[]>([])
  const [centerId, setCenterId] = useState('')

  // 4. Pagamento e resumo
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodsByDelivery | null>(null)
  const [paymentReceived, setPaymentReceived] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<AdminOrderDetailResponse | null>(null)

  useEffect(() => {
    fetch('/api/site/distribution-centers')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: DistributionCenter[]) => {
        setCenters(data)
        setCenterId((current) => current || (data[0]?.id ?? ''))
      })
      .catch(() => setCenters([]))
    fetch('/api/site/payment-methods')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PaymentMethodsByDelivery | null) => setPaymentMethods(data))
      .catch(() => setPaymentMethods(null))
  }, [])

  const itemsValid = lines.length > 0 && lines.every((l) => !lineError(l))

  // ── Frete: recotado quando mudam endereço ou itens (nunca num efeito) ────

  const quote = async (customerId: string, nextAddressId: string, nextLines: ManualOrderLine[]) => {
    setServiceId('')
    if (!nextAddressId || nextLines.length === 0 || nextLines.some((l) => lineError(l))) {
      setShipping(NO_SHIPPING)
      return
    }
    setShipping({ ...NO_SHIPPING, loading: true })
    try {
      const res = await authFetch('/api/admin/manual-orders/shipping-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          addressId: nextAddressId,
          items: nextLines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
        }),
      })
      if (!res.ok) {
        setShipping({ ...NO_SHIPPING, error: await messageOf(res, 'Erro ao calcular o frete') })
        return
      }
      const data = (await res.json()) as { options?: ShippingQuote[]; freeShipping?: boolean }
      setShipping({ loading: false, error: null, free: !!data.freeShipping, options: data.options ?? [] })
    } catch {
      setShipping({ ...NO_SHIPPING, error: 'Erro ao calcular o frete' })
    }
  }

  const requoteIfDelivery = (nextLines: ManualOrderLine[], nextAddressId = addressId, method = deliveryMethod) => {
    if (method === 'DELIVERY' && customer) void quote(customer.id, nextAddressId, nextLines)
  }

  // ── Cliente ──────────────────────────────────────────────────────────────

  const searchCustomers = async (term: string) => {
    if (!term.trim()) {
      setCustomerResults(null)
      return
    }
    setSearchingCustomers(true)
    try {
      const res = await authFetch(`/api/admin/manual-orders/customers?search=${encodeURIComponent(term.trim())}`)
      setCustomerResults(res.ok ? ((await res.json()) as CustomerLookup[]) : [])
    } finally {
      setSearchingCustomers(false)
    }
  }

  const selectCustomer = async (selected: CustomerLookup) => {
    setCustomer(selected)
    setCustomerResults(null)
    setCustomerDialog(false)
    setExistingCustomer(null)
    setDeliveryMethod(null)
    setShipping(NO_SHIPPING)
    setServiceId('')
    const res = await authFetch(`/api/admin/manual-orders/customers/${selected.id}/addresses`)
    const list = res.ok ? ((await res.json()) as Address[]) : []
    setAddresses(list)
    setAddressId(list[0]?.id ?? '')
  }

  const openCustomerDialog = () => {
    setCustomerForm(EMPTY_QUICK_CUSTOMER)
    setExistingCustomer(null)
    setCustomerDialog(true)
  }

  const saveCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingCustomer(true)
    try {
      const res = await authFetch('/api/admin/manual-orders/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toQuickCustomerInput(customerForm)),
      })
      if (res.status === 409) {
        const data = (await res.json().catch(() => null)) as { message?: string; customer?: CustomerLookup } | null
        if (data?.customer) {
          setExistingCustomer(data.customer)
        } else {
          toast({ variant: 'destructive', description: data?.message ?? 'E-mail já cadastrado.' })
        }
        return
      }
      if (!res.ok) {
        toast({ variant: 'destructive', description: await messageOf(res, 'Erro ao cadastrar o cliente.') })
        return
      }
      await selectCustomer((await res.json()) as CustomerLookup)
    } finally {
      setSavingCustomer(false)
    }
  }

  // ── Itens ────────────────────────────────────────────────────────────────

  const searchProducts = async (term: string) => {
    if (!term.trim()) {
      setProductResults(null)
      return
    }
    setSearchingProducts(true)
    try {
      const res = await fetch(`/api/catalog/products?search=${encodeURIComponent(term.trim())}&size=10`)
      setProductResults(res.ok ? ((await res.json()) as { content: Product[] }).content : [])
    } finally {
      setSearchingProducts(false)
    }
  }

  const changeLines = (next: ManualOrderLine[]) => {
    setLines(next)
    requoteIfDelivery(next)
  }

  // ── Entrega ──────────────────────────────────────────────────────────────

  const chooseDelivery = (method: DeliveryMethod) => {
    setDeliveryMethod(method)
    setPaymentMethod(null)
    if (method === 'DELIVERY') requoteIfDelivery(lines, addressId, method)
  }

  const chooseAddress = (id: string) => {
    setAddressId(id)
    requoteIfDelivery(lines, id)
  }

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customer) return
    setSavingAddress(true)
    try {
      const res = await authFetch(`/api/admin/manual-orders/customers/${customer.id}/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newAddress, isDefault: addresses.length === 0 }),
      })
      if (!res.ok) {
        toast({ variant: 'destructive', description: await messageOf(res, 'Erro ao cadastrar o endereço.') })
        return
      }
      const saved = (await res.json()) as Address
      setAddresses((list) => [...list, saved])
      setAddressDialog(false)
      setNewAddress(EMPTY_ADDRESS)
      chooseAddress(saved.id)
    } finally {
      setSavingAddress(false)
    }
  }

  // ── Pagamento, resumo e envio ────────────────────────────────────────────

  const isPickup = deliveryMethod === 'PICKUP'
  const deliveryReady = isPickup
    ? !!centerId
    : deliveryMethod === 'DELIVERY' && !!addressId && !shipping.loading && !shipping.error && (shipping.free || !!serviceId)
  const methods: PaymentMethod[] = deliveryMethod
    ? (paymentReceived ? RECEIVED_METHODS[deliveryMethod] : (paymentMethods?.[deliveryMethod] ?? []))
    : []
  const effectiveMethod = paymentMethod && methods.includes(paymentMethod) ? paymentMethod : (methods[0] ?? null)
  const subtotal = linesSubtotal(lines)
  const shippingCost = isPickup || shipping.free ? 0 : (shipping.options.find((o) => o.serviceId === serviceId)?.price ?? 0)

  const submit = async () => {
    if (!customer || !deliveryMethod || !effectiveMethod) return
    const body: ManualOrderInput = {
      customerId: customer.id,
      items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      deliveryMethod,
      addressId: isPickup ? null : addressId,
      pickupLocationId: isPickup ? centerId : null,
      shippingServiceId: isPickup || shipping.free ? null : serviceId,
      paymentMethod: effectiveMethod,
      paymentReceived,
      notes: notes.trim() || null,
    }
    setSubmitting(true)
    try {
      const res = await authFetch('/api/admin/manual-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        toast({ variant: 'destructive', description: await messageOf(res, 'Erro ao criar o pedido.') })
        return
      }
      setCreated((await res.json()) as AdminOrderDetailResponse)
    } catch {
      toast({ variant: 'destructive', description: 'Erro de conexão. Tente novamente.' })
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setCustomer(null)
    setCustomerResults(null)
    setLines([])
    setProductResults(null)
    setDeliveryMethod(null)
    setAddresses([])
    setAddressId('')
    setShipping(NO_SHIPPING)
    setServiceId('')
    setPaymentReceived(false)
    setPaymentMethod(null)
    setNotes('')
    setCreated(null)
  }

  if (created) {
    return (
      <PermissionGuard permissions={['CREATE_ORDERS']}>
        <Container className="flex flex-col gap-4">
          <Heading as="h1" size="2xl">Pedido #{created.orderNumber} criado</Heading>
          <Card>
            <div className="flex flex-col gap-3">
              <Text>{created.customerName} — {created.customerEmail}</Text>
              <div className="flex flex-wrap gap-2">
                <Badge variant={created.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                  {created.paymentStatus === 'PAID' ? 'Pago' : 'Pagamento pendente'}
                </Badge>
                <Badge variant="info">Total {formatBRL(created.totalAmount)}</Badge>
              </div>
              {created.paymentCheckoutUrl && (
                <div className="flex flex-col gap-1">
                  <Text size="sm" color="muted">Link de pagamento para enviar ao cliente</Text>
                  <span className="inline-flex flex-wrap items-center gap-2 break-all">
                    <Text size="sm">{created.paymentCheckoutUrl}</Text>
                    <CopyButton value={created.paymentCheckoutUrl} label="link de pagamento" />
                  </span>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {canViewOrders && (
                  <Button leftIcon={<Icon name="Eye" size="sm" />} variant="primary" onClick={() => router.push(`${ordersPath}/${created.id}`)}>
                    Ver pedido
                  </Button>
                )}
                <Button leftIcon={<Icon name="Plus" size="sm" />} variant="outline" onClick={reset}>Novo pedido</Button>
              </div>
            </div>
          </Card>
        </Container>
      </PermissionGuard>
    )
  }

  return (
    <PermissionGuard permissions={['CREATE_ORDERS']}>
      <Container className="flex flex-col gap-4">
        <Heading as="h1" size="2xl">Novo pedido</Heading>

        <Card header={<Heading as="h2" size="xl">Cliente</Heading>}>
          {customer ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Text weight="semibold">{customer.name}</Text>
                <Text size="sm" color="muted">{customer.email}</Text>
              </div>
              <Button leftIcon={<Icon name="RefreshCw" size="sm" />} variant="outline" size="sm" onClick={reset}>Trocar cliente</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <SearchField id="manual-order-customer-search" label="Buscar cliente"
                placeholder="Nome, e-mail, telefone ou CPF..." onSearch={(term) => void searchCustomers(term)} isLoading={searchingCustomers} />
              {customerResults !== null && (
                customerResults.length === 0 ? (
                  <Text size="sm" color="muted">Nenhum cliente encontrado.</Text>
                ) : (
                  <ul className="flex flex-col gap-2" aria-label="Clientes encontrados">
                    {customerResults.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                        <Text size="sm">{c.name} — {c.email}{c.phone ? ` — ${c.phone}` : ''}</Text>
                        <Button size="sm" variant="outline" aria-label={`Selecionar ${c.name}`} onClick={() => void selectCustomer(c)}>
                          Selecionar
                        </Button>
                      </li>
                    ))}
                  </ul>
                )
              )}
              <div>
                <Button leftIcon={<Icon name="UserPlus" size="sm" />} variant="outline" onClick={openCustomerDialog}>Novo cliente</Button>
              </div>
            </div>
          )}
        </Card>

        {customer && (
          <Card header={<Heading as="h2" size="xl">Itens</Heading>}>
            <ManualOrderItemsForm
              lines={lines}
              onQuantityChange={(productId, quantity) =>
                changeLines(lines.map((l) => (l.product.id === productId ? { ...l, quantity } : l)))}
              onRemove={(productId) => changeLines(lines.filter((l) => l.product.id !== productId))}
              searchResults={productResults}
              searching={searchingProducts}
              onSearch={(term) => void searchProducts(term)}
              onAdd={(product) => changeLines(addLine(lines, product))}
            />
          </Card>
        )}

        {customer && itemsValid && (
          <Card header={<Heading as="h2" size="xl">Entrega</Heading>}>
            <div className="flex flex-col gap-4">
              <fieldset className="flex flex-wrap gap-4">
                <legend className="sr-only">Tipo de entrega</legend>
                <Radio id="manual-delivery-DELIVERY" name="manual-delivery" value="DELIVERY" label="Entrega"
                  checked={deliveryMethod === 'DELIVERY'} onChange={() => chooseDelivery('DELIVERY')} />
                <Radio id="manual-delivery-PICKUP" name="manual-delivery" value="PICKUP" label="Retirada"
                  disabled={centers.length === 0} checked={deliveryMethod === 'PICKUP'} onChange={() => chooseDelivery('PICKUP')} />
              </fieldset>

              {deliveryMethod === 'DELIVERY' && (
                <>
                  {addresses.length > 0 ? (
                    <FormField label="Endereço de entrega" id="manual-order-address">
                      <Select
                        id="manual-order-address"
                        value={addressId}
                        onChange={(e) => chooseAddress(e.target.value)}
                        options={addresses.map((a) => ({ value: a.id, label: `${a.street}, ${a.number} — ${a.city}/${a.state}` }))}
                      />
                    </FormField>
                  ) : (
                    <Text size="sm" color="muted">Este cliente ainda não tem endereço.</Text>
                  )}
                  <div>
                    <Button leftIcon={<Icon name="MapPin" size="sm" />} variant="outline" size="sm" onClick={() => setAddressDialog(true)}>
                      Novo endereço
                    </Button>
                  </div>
                  {addressId && (
                    <ShippingOptionsList
                      loading={shipping.loading}
                      error={shipping.error}
                      free={shipping.free}
                      options={shipping.options}
                      selectedServiceId={serviceId}
                      onSelect={setServiceId}
                    />
                  )}
                </>
              )}

              {isPickup && <PickupLocationList centers={centers} value={centerId} onChange={setCenterId} />}
            </div>
          </Card>
        )}

        {customer && itemsValid && deliveryReady && (
          <Card header={<Heading as="h2" size="xl">Pagamento e resumo</Heading>}>
            <div className="flex flex-col gap-4">
              {canReceive && (
                <Switch id="manual-payment-received" label="Pagamento já recebido" checked={paymentReceived}
                  onChange={(checked) => { setPaymentReceived(checked); setPaymentMethod(null) }} />
              )}
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium">Forma de pagamento</legend>
                {methods.length === 0 ? (
                  <Text role="alert" size="sm" color="destructive">Nenhuma forma de pagamento disponível para esta entrega.</Text>
                ) : (
                  methods.map((method) => (
                    <Radio key={method} id={`manual-payment-${method}`} name="manual-payment" value={method}
                      label={PAYMENT_METHOD_LABELS[method]} checked={effectiveMethod === method} onChange={() => setPaymentMethod(method)} />
                  ))
                )}
                {!paymentReceived && (
                  <Text size="sm" color="muted">O pedido fica com o pagamento pendente, pelo gateway ativo da loja.</Text>
                )}
              </fieldset>

              <FormField label="Observação" id="manual-order-notes" hint={`${notes.length}/${NOTES_MAX}`}>
                <Textarea id="manual-order-notes" value={notes} maxLength={NOTES_MAX} rows={3}
                  onChange={(e) => setNotes(e.target.value)} />
              </FormField>

              <div className="flex flex-col gap-1">
                <Text size="sm">Itens: {formatBRL(subtotal)}</Text>
                <Text size="sm">Frete: {isPickup ? 'retirada' : formatBRL(shippingCost)}</Text>
                <Text weight="semibold">Total do pedido: {formatBRL(subtotal + shippingCost)}</Text>
              </div>

              <div>
                <Button leftIcon={<Icon name="Check" size="sm" />} variant="primary" disabled={!effectiveMethod}
                  isLoading={submitting} onClick={() => void submit()}>
                  Criar pedido
                </Button>
              </div>
            </div>
          </Card>
        )}

        <Dialog open={customerDialog} onClose={() => setCustomerDialog(false)} title="Cadastrar cliente">
          <div className="flex flex-col gap-4">
            {existingCustomer && (
              <div className="flex flex-col gap-2">
                <Text size="sm">Já cadastrado: {existingCustomer.name} ({existingCustomer.email})</Text>
                <div>
                  <Button variant="primary" size="sm" onClick={() => void selectCustomer(existingCustomer)}>Usar este cliente</Button>
                </div>
              </div>
            )}
            <QuickCustomerForm
              form={customerForm}
              onChange={(patch) => { setCustomerForm((f) => ({ ...f, ...patch })); setExistingCustomer(null) }}
              onSubmit={(e) => void saveCustomer(e)}
              saving={savingCustomer}
            />
          </div>
        </Dialog>

        <Dialog open={addressDialog} onClose={() => setAddressDialog(false)} title="Novo endereço">
          <AddressForm
            address={newAddress}
            onChange={(patch) => setNewAddress((a) => ({ ...a, ...patch }))}
            onSubmit={(e) => void saveAddress(e)}
            saving={savingAddress}
          />
        </Dialog>
      </Container>
    </PermissionGuard>
  )
}
