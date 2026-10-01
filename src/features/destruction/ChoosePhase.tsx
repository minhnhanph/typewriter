import type { ComponentType } from 'react'
import { DESTROYERS } from './registry'

/** A ticket that isn't a destroyer: sending the letter on, or writing back. */
export type ExtraTicket = {
  id: string
  name: string
  short: string
  tagline: string
  Mark: ComponentType
  onPick: () => void
}

type Props = {
  words: number
  onChoose: (id: string) => void
  /** Offered after the destroyers, lettered on from them. */
  extras?: ExtraTicket[]
  back?: { label: string; onClick: () => void }
}

/**
 * The commitment screen. Deliberately quiet -- this is the moment the words
 * stop being a draft, so it shouldn't feel like a settings menu.
 * The choices are counter tickets from a telegraph office.
 */
export function ChoosePhase({ words, onChoose, extras = [], back }: Props) {
  const tickets = [
    ...DESTROYERS.map((destroyer) => ({ ...destroyer, onPick: () => onChoose(destroyer.id) })),
    ...extras,
  ]

  return (
    <div className="phase phase-choose">
      <p className="choose-count">Class of service · {words === 1 ? '1 word' : `${words} words`}</p>
      <h1 className="choose-title">How should it go?</h1>

      <div className="choose-options">
        {tickets.map((ticket, i) => {
          const { Mark } = ticket
          return (
            <button
              key={ticket.id}
              className={`ticket ticket-${ticket.id}`}
              aria-label={`${ticket.name}. ${ticket.tagline}`}
              onClick={ticket.onPick}
            >
              {/* Lettered in order, so a third ticket is Service C. */}
              <span className="fine-print">Service {String.fromCharCode(65 + i)}</span>
              <span className="ticket-mark" aria-hidden="true">
                <Mark />
              </span>
              <span className="printed ticket-name">{ticket.short}</span>
              <span className="ticket-perforation" aria-hidden="true" />
              <span className="ticket-tagline">{ticket.tagline}</span>
            </button>
          )
        })}
      </div>

      {back && (
        <button className="button button-ghost" onClick={back.onClick}>
          {back.label}
        </button>
      )}
    </div>
  )
}
