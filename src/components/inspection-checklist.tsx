'use client'

import { useState } from 'react'

export interface ChecklistItem {
  id: string
  item_name: string
  item_description: string | null
  passed: boolean | null
  notes: string | null
}

// Default checklist items for all inspections
export const DEFAULT_CHECKLIST_ITEMS: Omit<ChecklistItem, 'passed' | 'notes'>[] = [
  { id: 'brakes', item_name: 'Brakes', item_description: 'Check brake pads, discs, and fluid levels' },
  { id: 'lights', item_name: 'Lights & Signals', item_description: 'Headlights, taillights, indicators, hazard lights' },
  { id: 'tires', item_name: 'Tires & Wheels', item_description: 'Tire pressure, tread depth, wheel condition' },
  { id: 'mirrors', item_name: 'Mirrors & Visibility', item_description: 'Side mirrors, rearview mirror, windshield condition' },
  { id: 'steering', item_name: 'Steering', item_description: 'Steering response, power steering fluid' },
  { id: 'engine', item_name: 'Engine & Fluids', item_description: 'Oil level, coolant, engine condition, leaks' },
  { id: 'body', item_name: 'Body & Structure', item_description: 'Frame integrity, rust, dents, paint condition' },
  { id: 'safety', item_name: 'Safety Equipment', item_description: 'Fire extinguisher, first aid kit, warning triangle' },
  { id: 'electrical', item_name: 'Electrical Systems', item_description: 'Battery, wiring, dashboard indicators' },
  { id: 'exhaust', item_name: 'Exhaust & Emissions', item_description: 'Exhaust system condition, emission levels' },
  { id: 'seatbelts', item_name: 'Seatbelts', item_description: 'All seatbelts functional and undamaged' },
  { id: 'horn', item_name: 'Horn', item_description: 'Horn functional and audible' },
]

interface EditableChecklistProps {
  onChange: (items: ChecklistItem[]) => void
}

export function EditableChecklist({ onChange }: EditableChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>(
    DEFAULT_CHECKLIST_ITEMS.map(item => ({ ...item, passed: null, notes: null }))
  )

  const updateItem = (id: string, field: 'passed' | 'notes', value: boolean | null | string) => {
    const updated = items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    )
    setItems(updated)
    onChange(updated)
  }

  const allChecked = items.every(item => item.passed !== null)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Inspection Checklist</h3>
        <span className={`text-xs ${allChecked ? 'text-green-600' : 'text-gray-400'}`}>
          {items.filter(i => i.passed !== null).length}/{items.length} checked
        </span>
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="p-3 border border-gray-200 rounded-lg bg-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{item.item_name}</p>
                {item.item_description && (
                  <p className="text-xs text-gray-400 mt-0.5">{item.item_description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => updateItem(item.id, 'passed', true)}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                    item.passed === true
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-600'
                  }`}
                >
                  Pass
                </button>
                <button
                  type="button"
                  onClick={() => updateItem(item.id, 'passed', false)}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                    item.passed === false
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600'
                  }`}
                >
                  Fail
                </button>
              </div>
            </div>
            {item.passed === false && (
              <input
                type="text"
                placeholder="Add a note about the failure..."
                className="mt-2 w-full text-xs p-2 border border-gray-200 rounded bg-red-50/50 focus:outline-none focus:ring-1 focus:ring-red-300"
                value={item.notes || ''}
                onChange={(e) => updateItem(item.id, 'notes', e.target.value || null)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

interface ReadOnlyChecklistProps {
  items: ChecklistItem[]
}

export function ReadOnlyChecklist({ items }: ReadOnlyChecklistProps) {
  if (!items || items.length === 0) return null

  const passCount = items.filter(i => i.passed === true).length
  const failCount = items.filter(i => i.passed === false).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400 uppercase">Checklist Results</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-green-600">{passCount} passed</span>
          {failCount > 0 && <span className="text-red-600">{failCount} failed</span>}
        </div>
      </div>
      <div className="space-y-1.5">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
            <div className="min-w-0">
              <p className="text-sm text-gray-700">{item.item_name}</p>
              {item.passed === false && item.notes && (
                <p className="text-xs text-red-500 mt-0.5">{item.notes}</p>
              )}
            </div>
            {item.passed === true ? (
              <span className="text-xs text-green-600 font-medium shrink-0">Pass</span>
            ) : item.passed === false ? (
              <span className="text-xs text-red-600 font-medium shrink-0">Fail</span>
            ) : (
              <span className="text-xs text-gray-300 shrink-0">{'\u2014'}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
