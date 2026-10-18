import { useEffect, useState } from 'react'
import arrowRight from '@/assets/figma/arrow-right.svg'
import close from '@/assets/figma/icon-close.svg'
import scrim from '@/assets/figma/scrim.svg'
import { templates } from '@/data/templates'
import { useSong } from '@/store/song'
import { TemplateCard } from './TemplateCard'

export function TemplatePicker() {
  const { templatePicker, selectTemplate, closeTemplatePicker, applyTemplate } = useSong()
  const [hovered, setHovered] = useState<string | null>(null)
  const selected = templates.find((t) => t.id === templatePicker.selected)!

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeTemplatePicker()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeTemplatePicker])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <img src={scrim} alt="" className="absolute inset-0 size-full max-w-none" onClick={closeTemplatePicker} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-picker-title"
        className="relative flex w-[860px] max-w-full flex-col rounded-[20px] bg-card px-8 pt-7 pb-[22px] shadow-lift"
      >
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <h2 id="template-picker-title" className="type-display text-ink">
              Start with a story
            </h2>
            <p className="type-doc max-w-[520px] text-ink-2">
              Choose a starting point for the music you’re making. We’ll place a few useful pieces on the canvas;
              swap any of them for your own.
            </p>
          </div>
          <button
            aria-label="Close"
            onClick={closeTemplatePicker}
            className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-well"
          >
            <img src={close} alt="" />
          </button>
        </div>

        <div className="mt-6 flex gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className={`min-w-0 flex-1 transition-[opacity,transform] duration-300 ease-spring ${hovered && hovered !== t.id ? 'opacity-40' : ''} ${hovered === t.id ? 'scale-[1.02]' : ''}`}
              onPointerEnter={() => setHovered(t.id)}
              onPointerLeave={() => setHovered(null)}
            >
              <TemplateCard
                id={t.id}
                selected={t.id === selected.id}
                onClick={() => selectTemplate(t.id)}
                className="w-full"
              />
            </div>
          ))}
        </div>

        <div className="mt-[22px] flex justify-end border-t border-rule">
          <button
            onClick={() => applyTemplate(selected.id)}
            className="shine-button type-action mt-px flex h-10 items-center gap-2 rounded-full border border-rule-strong bg-ink pr-3.5 pl-4 text-on-ink"
          >
            Start with {selected.name}
            <img src={arrowRight} alt="" />
          </button>
        </div>
      </div>
    </div>
  )
}
