'use client'

import { BarChart } from '@indianous/base-ds'
import { formatBRL } from '@/lib/format'
import type { ChannelConversionResponse } from '@/types'

function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

interface Props {
  data: ChannelConversionResponse[]
}

export function ChannelChart({ data }: Props) {
  return (
    <div>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-4">Nenhum canal com dado no período.</p>
      ) : (
        <div className="mb-6">
          <BarChart
            data={data.map((channel) => ({
              label: channel.channel,
              values: [channel.signups, channel.buyers],
            }))}
            seriesNames={['Cadastros', 'Compradores']}
            orientation="horizontal"
          />
        </div>
      )}

      <table aria-label="Detalhamento por canal" className="w-full text-sm border-collapse">
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
