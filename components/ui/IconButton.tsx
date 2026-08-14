'use client'
import type { ComponentProps } from 'react'
import { Icon, Spinner } from 'base-ds'
import { Tooltip } from '@/components/ui/Tooltip'

export type IconName = ComponentProps<typeof Icon>['name']

type IconButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
type IconButtonSize = 'sm' | 'md' | 'lg'

const SIZE_CLASSES: Record<IconButtonSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
}

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
  ghost: 'bg-transparent text-foreground hover:bg-muted',
  outline: 'border border-border bg-transparent text-foreground hover:bg-muted',
  danger: 'bg-destructive text-destructive-foreground hover:bg-destructive-hover',
}

const BASE_CLASSES =
  'inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'

interface CommonProps {
  icon: IconName
  label: string
  variant?: IconButtonVariant
  size?: IconButtonSize
  className?: string
  isLoading?: boolean
}

type AsButton = CommonProps & { as?: 'button' } & Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'aria-label' | 'className'
  >
type AsLink = CommonProps & { as: 'a'; href: string } & Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    'aria-label' | 'className'
  >

export function IconButton(props: AsButton | AsLink) {
  const { icon, label, variant = 'ghost', size = 'md', className, isLoading = false, ...rest } = props
  const sizeClass = SIZE_CLASSES[size]
  const variantClass = VARIANT_CLASSES[variant]
  const classes = [BASE_CLASSES, sizeClass, variantClass, className].filter(Boolean).join(' ')

  const content = isLoading ? (
    <Spinner size="sm" aria-label="Carregando..." />
  ) : (
    <Icon name={icon} size={size === 'lg' ? 'lg' : 'sm'} />
  )

  return (
    <Tooltip label={label}>
      {props.as === 'a' ? (
        <a
          aria-label={label}
          aria-busy={isLoading ? 'true' : undefined}
          className={classes}
          {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {content}
        </a>
      ) : (
        <button
          type="button"
          aria-label={label}
          aria-busy={isLoading ? 'true' : undefined}
          className={classes}
          {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
          disabled={isLoading || (rest as React.ButtonHTMLAttributes<HTMLButtonElement>).disabled}
        >
          {content}
        </button>
      )}
    </Tooltip>
  )
}
