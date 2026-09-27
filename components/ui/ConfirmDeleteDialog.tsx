import { Button, Dialog } from '@indianous/base-ds'
import type { ReactNode } from 'react'

interface ConfirmDeleteDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  deleting: boolean
  title: string
  description?: string
  children?: ReactNode
}

export function ConfirmDeleteDialog({
  open,
  onClose,
  onConfirm,
  deleting,
  title,
  description,
  children,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={deleting}>Cancelar</Button>
          <Button variant="danger" onClick={() => { Promise.resolve(onConfirm()).catch(() => {}) }} isLoading={deleting}>Confirmar</Button>
        </div>
      }
    >
      {children}
    </Dialog>
  )
}
