import { readFileSync } from 'node:fs'
import path from 'node:path'
import { buildConfigSchema, CONFIG_DEFAULTS, validateConfig } from '../generator/generate'

const exampleConfig = JSON.parse(readFileSync(path.join(__dirname, '../data.config.json'), 'utf8'))

describe('validateConfig', () => {
  it('aceita a configuração do repositório', () => {
    expect(() => validateConfig(exampleConfig)).not.toThrow()
  })

  it('ignora a chave $schema', () => {
    expect(validateConfig({ $schema: './data.config.schema.json' })).toEqual(CONFIG_DEFAULTS)
  })

  it('usa o padrão para campo omitido', () => {
    const config = validateConfig({ products: 10 })
    expect(config.products).toBe(10)
    expect(config.customers).toBe(CONFIG_DEFAULTS.customers)
  })

  it.each([
    ['negativa', -1],
    ['fracionária', 2.5],
    ['texto', '10'],
    ['nula', null],
  ])('recusa quantidade %s citando o campo', (_, value) => {
    expect(() => validateConfig({ products: value })).toThrow(/products/)
  })

  it('recusa quantidade acima do máximo', () => {
    expect(() => validateConfig({ products: 100_000 })).toThrow(/products.*máximo/)
  })

  it('recusa entidade desconhecida', () => {
    expect(() => validateConfig({ produtos: 10 })).toThrow(/produtos/)
  })

  it('recusa configuração que não é objeto', () => {
    expect(() => validateConfig([])).toThrow()
    expect(() => validateConfig(null)).toThrow()
  })

  it('junta todos os erros numa mensagem só', () => {
    expect(() => validateConfig({ products: -1, customers: 'x' })).toThrow(/products[\s\S]*customers/)
  })

  describe('dependências entre entidades', () => {
    it('produtos exigem categorias', () => {
      expect(() => validateConfig({ categories: 0, products: 5 })).toThrow(/products.*categories/)
    })

    it('pedidos exigem produtos', () => {
      expect(() => validateConfig({ products: 0, orders: 5 })).toThrow(/orders.*products/)
    })

    it('avaliações exigem pedidos e não passam do número de pedidos', () => {
      expect(() => validateConfig({ orders: 0, reviews: 1 })).toThrow(/reviews.*orders/)
      expect(() => validateConfig({ orders: 10, reviews: 11 })).toThrow(/reviews.*orders/)
    })

    it('usos de cupom exigem cupons e não passam do número de pedidos', () => {
      expect(() => validateConfig({ coupons: 0, couponRedemptions: 1 })).toThrow(/couponRedemptions.*coupons/)
      expect(() => validateConfig({ orders: 10, couponRedemptions: 11 })).toThrow(/couponRedemptions.*orders/)
    })

    it('solicitações de alteração não passam do número de pedidos', () => {
      expect(() => validateConfig({ orders: 3, orderChangeRequests: 4 })).toThrow(/orderChangeRequests.*orders/)
    })

    it('notificações exigem pedidos', () => {
      expect(() => validateConfig({ orders: 0, reviews: 0, couponRedemptions: 0, orderChangeRequests: 0, notifications: 1 })).toThrow(
        /notifications.*orders/,
      )
    })

    it('promoções exigem produtos', () => {
      expect(() => validateConfig({ products: 0, orders: 0, reviews: 0, couponRedemptions: 0, orderChangeRequests: 0, notifications: 0, wishlistItems: 0, cartItems: 0, promotions: 1 })).toThrow(
        /promotions.*products/,
      )
    })

    it('cada produto precisa de ao menos uma movimentação de estoque (a entrada inicial)', () => {
      expect(() => validateConfig({ products: 10, stockMovements: 9 })).toThrow(/stockMovements.*products/)
    })

    it('lista de desejos e carrinho não passam do total de pares cliente × produto', () => {
      // 2 clientes gerados + o cliente fixo = 3; 3 × 2 produtos = 6 pares
      const base = { customers: 2, products: 2, stockMovements: 2, orders: 0, reviews: 0, couponRedemptions: 0, orderChangeRequests: 0, notifications: 0 }
      expect(() => validateConfig({ ...base, wishlistItems: 7 })).toThrow(/wishlistItems/)
      expect(() => validateConfig({ ...base, cartItems: 7 })).toThrow(/cartItems/)
      expect(() => validateConfig({ ...base, wishlistItems: 6, cartItems: 6 })).not.toThrow()
    })
  })
})

describe('data.config.schema.json', () => {
  it('está igual ao schema montado a partir de CONFIG_FIELDS (rode o gerador para atualizar)', () => {
    const schema = JSON.parse(readFileSync(path.join(__dirname, '../data.config.schema.json'), 'utf8'))
    expect(schema).toEqual(buildConfigSchema())
  })
})
