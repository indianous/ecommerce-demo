'use client'

import { useState } from 'react'
import { Alert, Button, Card, Checkbox, Icon, Text } from 'base-ds'
import { CopyButton } from '@/components/ui/CopyButton'
import { downloadBlob } from '@/lib/downloadBlob'

interface Props {
  codes: string[]
  onContinue: () => void
  continueLabel?: string
}

/** Os códigos de recuperação aparecem uma vez só: a pessoa confirma que guardou antes de seguir. */
export function RecoveryCodesPanel({ codes, onContinue, continueLabel = 'Continuar' }: Props) {
  const [saved, setSaved] = useState(false)
  const text = codes.join('\n')

  const handleDownload = () => {
    const content = `Códigos de recuperação — cada um vale uma vez só.\n\n${text}\n`
    downloadBlob(new Blob([content], { type: 'text/plain;charset=utf-8' }), 'codigos-de-recuperacao.txt')
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert variant="warning" title="Guarde estes códigos">
        <Text>
          Estes códigos não serão mostrados de novo. Se perder o celular, cada um deles permite entrar uma vez no
          lugar do código do app.
        </Text>
      </Alert>

      <Card className="p-4">
        <ul className="grid grid-cols-2 gap-2">
          {codes.map((code) => (
            <li key={code}>
              <Text className="font-mono tracking-wider">{code}</Text>
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <CopyButton value={text} label="códigos de recuperação" />
        <Button type="button" variant="outline" size="sm" leftIcon={<Icon name="Download" size="sm" />} onClick={handleDownload}>
          Baixar .txt
        </Button>
      </div>

      <Checkbox
        id="recovery-codes-saved"
        label="Guardei os códigos em um lugar seguro"
        checked={saved}
        onChange={(e) => setSaved(e.target.checked)}
      />

      <Button type="button" variant="primary" disabled={!saved} onClick={onContinue}>
        {continueLabel}
      </Button>
    </div>
  )
}
