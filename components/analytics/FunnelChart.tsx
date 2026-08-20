'use client'

import { useState } from 'react'
import { Icon } from 'base-ds'
import type { FunnelResponse } from '@/types'

// Passo a passo: azul primário, do mais claro ao mais escuro (validado via
// skill dataviz — ramp ordinal, 5 degraus, monotone L, gap ΔL >= 0.06,
// contraste da ponta clara >= 2:1 contra a superfície).
const STAGE_COLORS = ['#60a5fa', '#3b82f6', '#2563eb', '#1e40af', '#172554']

interface Stage {
  key: string
  label: string
  value: number
  rateFromPrevious: number | null
  postLoginOnly: boolean
}

function buildStages(data: FunnelResponse): Stage[] {
  return [
    { key: 'visitors', label: 'Visitantes', value: data.visitors, rateFromPrevious: null, postLoginOnly: false },
    { key: 'productViews', label: 'Visualizou produto', value: data.productViews, rateFromPrevious: data.visitorToProductViewRate, postLoginOnly: true },
    { key: 'cartAdds', label: 'Adicionou ao carrinho', value: data.cartAdds, rateFromPrevious: data.productViewToCartAddRate, postLoginOnly: true },
    { key: 'checkoutsStarted', label: 'Iniciou checkout', value: data.checkoutsStarted, rateFromPrevious: data.cartAddToCheckoutRate, postLoginOnly: false },
    { key: 'purchasesCompleted', label: 'Comprou', value: data.purchasesCompleted, rateFromPrevious: data.checkoutToPurchaseRate, postLoginOnly: false },
  ]
}

function formatRate(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

interface Props {
  data: FunnelResponse
}

export function FunnelChart({ data }: Props) {
  const [showTable, setShowTable] = useState(false)
  const stages = buildStages(data)
  const max = Math.max(1, ...stages.map((s) => s.value))

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="text-sm text-muted-foreground hover:underline"
        >
          {showTable ? 'Ver como gráfico' : 'Ver como tabela'}
        </button>
      </div>

      {showTable ? (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 border-b">Etapa</th>
              <th className="text-left p-2 border-b">Contagem</th>
              <th className="text-left p-2 border-b">Taxa da etapa anterior</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((stage) => (
              <tr key={stage.key} className="border-b">
                <td className="p-2">{stage.label}</td>
                <td className="p-2">{stage.value}</td>
                <td className="p-2">{stage.rateFromPrevious === null ? '—' : formatRate(stage.rateFromPrevious)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ul className="flex flex-col gap-2">
          {stages.map((stage, index) => {
            const widthPct = (stage.value / max) * 100
            return (
              <li key={stage.key} data-stage={stage.key}>
                {index > 0 && stage.rateFromPrevious !== null && (
                  <div className="pl-1 text-xs text-muted-foreground mb-1">
                    <span className="font-medium">{formatRate(stage.rateFromPrevious)}</span> da etapa anterior
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm mb-1">
                  <span className="font-medium">{stage.label}</span>
                  {stage.postLoginOnly && (
                    <span
                      title="Reflete só clientes cadastrados, não visitante 100% anônimo"
                      className="inline-flex items-center gap-1 text-muted-foreground"
                    >
                      <Icon name="Info" size="sm" />
                      <span className="sr-only">Reflete só clientes cadastrados, não visitante 100% anônimo</span>
                    </span>
                  )}
                </div>
                <div
                  className="relative h-6"
                  role="img"
                  aria-label={`${stage.label}: ${stage.value}`}
                  title={`${stage.label}: ${stage.value}`}
                >
                  <div
                    className="h-6"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: STAGE_COLORS[index],
                      borderRadius: '0 4px 4px 0',
                    }}
                  />
                  <span className="ml-2 text-sm text-foreground">{stage.value}</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
