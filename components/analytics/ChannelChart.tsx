'use client'

import { formatBRL } from '@/lib/format'
import type { ChannelConversionResponse } from '@/types'

// Categórico, 2 séries (validado via skill dataviz — CVD/contraste PASS):
// cadastros = azul primário, compradores = verde.
const SIGNUPS_COLOR = '#2563eb'
const BUYERS_COLOR = '#16a34a'

function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

interface Props {
  data: ChannelConversionResponse[]
}

export function ChannelChart({ data }: Props) {
  const max = Math.max(1, ...data.map((c) => Math.max(c.signups, c.buyers)))

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SIGNUPS_COLOR }} />
          Cadastros
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BUYERS_COLOR }} />
          Compradores
        </span>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-4">Nenhum canal com dado no período.</p>
      ) : (
        <ul className="flex flex-col gap-3 mb-6">
          {data.map((channel) => (
            <li key={channel.channel} data-channel={channel.channel}>
              <div className="text-sm font-medium mb-1">{channel.channel}</div>
              <div
                className="h-3 mb-0.5"
                role="img"
                aria-label={`${channel.channel}: ${channel.signups} cadastros`}
                title={`${channel.channel}: ${channel.signups} cadastros`}
              >
                <div
                  className="h-3"
                  style={{ width: `${(channel.signups / max) * 100}%`, backgroundColor: SIGNUPS_COLOR, borderRadius: '0 4px 4px 0' }}
                />
              </div>
              <div
                className="h-3"
                role="img"
                aria-label={`${channel.channel}: ${channel.buyers} compradores`}
                title={`${channel.channel}: ${channel.buyers} compradores`}
              >
                <div
                  className="h-3"
                  style={{ width: `${(channel.buyers / max) * 100}%`, backgroundColor: BUYERS_COLOR, borderRadius: '0 4px 4px 0' }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left p-2 border-b">Canal</th>
            <th className="text-left p-2 border-b">Cadastros</th>
            <th className="text-left p-2 border-b">Compradores</th>
            <th className="text-left p-2 border-b">Conversão</th>
            <th className="text-left p-2 border-b">Receita</th>
            <th className="text-left p-2 border-b">Ticket médio</th>
          </tr>
        </thead>
        <tbody>
          {data.map((channel) => (
            <tr key={channel.channel} className="border-b">
              <td className="p-2">{channel.channel}</td>
              <td className="p-2">{channel.signups}</td>
              <td className="p-2">{channel.buyers}</td>
              <td className="p-2">{formatPercent(channel.conversionRate)}</td>
              <td className="p-2">{formatBRL(channel.revenue)}</td>
              <td className="p-2">{formatBRL(channel.averageOrderValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
