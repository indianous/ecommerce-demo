'use client'

import { useState } from 'react'
import { Button, Dialog, FileUpload, FormField, Icon, Text, useToast } from '@indianous/base-ds'
import { useAuthStore } from '@/stores/auth.store'
import type { ProductImportReport } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onImported: () => void
}

export function ProductImportDialog({ open, onClose, onImported }: Props) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [report, setReport] = useState<ProductImportReport | null>(null)

  const handleFilesChange = (files: File[]) => {
    setFile(files[0] ?? null)
    setReport(null)
  }

  const handleImport = async () => {
    if (!file || !accessToken) return
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/products/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
      })
      if (!res.ok) throw new Error()
      const data: ProductImportReport = await res.json()
      setReport(data)
      onImported()
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao importar o arquivo CSV.' })
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setReport(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Importar produtos via CSV">
      <div className="flex flex-col gap-4">
        <FormField label="Arquivo CSV" id="product-import-file">
          <FileUpload accept=".csv" multiple={false} onChange={handleFilesChange} />
        </FormField>

        {report && (
          <div className="flex flex-col gap-3">
            <Text size="sm">{report.createdCount} produto(s) criado(s).</Text>

            {report.warnings.length > 0 && (
              <div className="flex flex-col gap-1">
                <Text size="sm" weight="bold">Avisos</Text>
                <ul className="flex flex-col gap-1">
                  {report.warnings.map((w, i) => (
                    <li key={i}>
                      <Text size="sm" color="muted">Linha {w.row}: {w.message}</Text>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.errors.length > 0 && (
              <div className="flex flex-col gap-1">
                <Text size="sm" weight="bold">Erros</Text>
                <ul className="flex flex-col gap-1">
                  {report.errors.map((e, i) => (
                    <li key={i}>
                      <Text size="sm" color="destructive">Linha {e.row}: {e.message}</Text>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <Button
          iconOnly
          leftIcon={<Icon name="Upload" size="sm" />}
          aria-label="Confirmar importação"
          variant="primary"
          isLoading={importing}
          disabled={!file}
          onClick={handleImport}
          className="self-start"
        />
      </div>
    </Dialog>
  )
}
