'use client'

import { useState } from 'react'

interface Option<T extends string> {
  value: T
  label: string
}

interface DuelingPicklistProps<T extends string> {
  availableLabel?: string
  selectedLabel?: string
  options: Option<T>[]
  value: T[]
  onChange: (selected: T[]) => void
  disabled?: boolean
}

export function DuelingPicklist<T extends string>({
  availableLabel = 'Disponível',
  selectedLabel = 'Selecionado',
  options,
  value,
  onChange,
  disabled = false,
}: DuelingPicklistProps<T>) {
  const [highlighted, setHighlighted] = useState<T | null>(null)

  const selectedSet = new Set(value)
  const available = options
    .filter((o) => !selectedSet.has(o.value))
    .sort((a, b) => a.label.localeCompare(b.label))
  const selected = options.filter((o) => selectedSet.has(o.value))

  const moveRight = () => {
    if (!highlighted || selectedSet.has(highlighted)) return
    onChange([...value, highlighted])
    setHighlighted(null)
  }

  const moveLeft = () => {
    if (!highlighted || !selectedSet.has(highlighted)) return
    onChange(value.filter((v) => v !== highlighted))
    setHighlighted(null)
  }

  const moveAllRight = () => {
    onChange(options.map((o) => o.value))
    setHighlighted(null)
  }

  const moveAllLeft = () => {
    onChange([])
    setHighlighted(null)
  }

  const renderList = (items: Option<T>[], label: string) => (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-semibold">{label}</span>
      <ul
        role="listbox"
        aria-label={label}
        className="border border-gray-300 rounded min-w-40 min-h-28 overflow-y-auto p-1 list-none m-0"
      >
        {items.map((item) => (
          <li
            key={item.value}
            role="option"
            aria-selected={highlighted === item.value}
            className={`px-2 py-1.5 rounded cursor-pointer select-none ${
              highlighted === item.value
                ? 'bg-blue-500 text-white'
                : 'hover:bg-gray-100'
            }`}
            onClick={() => {
              if (!disabled) setHighlighted(item.value)
            }}
          >
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <div className="flex gap-3 items-center">
      {renderList(available, availableLabel)}

      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          aria-label="→"
          onClick={moveRight}
          disabled={disabled}
          className="px-2 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed min-w-9"
        >
          →
        </button>
        <button
          type="button"
          aria-label="→→"
          onClick={moveAllRight}
          disabled={disabled}
          className="px-2 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed min-w-9"
        >
          →→
        </button>
        <button
          type="button"
          aria-label="←←"
          onClick={moveAllLeft}
          disabled={disabled}
          className="px-2 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed min-w-9"
        >
          ←←
        </button>
        <button
          type="button"
          aria-label="←"
          onClick={moveLeft}
          disabled={disabled}
          className="px-2 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed min-w-9"
        >
          ←
        </button>
      </div>

      {renderList(selected, selectedLabel)}
    </div>
  )
}
