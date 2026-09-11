import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'

describe('Mini Kanban App UI & Collaboration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders navbar brand and default board title', async () => {
    render(<App />)

    expect(screen.getByText('MINI_KANBAN.v1')).toBeInTheDocument()
    expect(screen.getByText('WS:CONNECTED')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/\/Team Product Launch/i)).toBeInTheDocument()
    })
  })

  it('renders default columns and sample cards', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('To Do')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByText('Done')).toBeInTheDocument()
    })
  })

  it('allows opening the invite link modal', async () => {
    render(<App />)

    const inviteBtn = screen.getByRole('button', { name: /invite_link/i })
    fireEvent.click(inviteBtn)

    await waitFor(() => {
      expect(screen.getByText('GENERATE_INVITE_TOKEN')).toBeInTheDocument()
      expect(screen.getByText(/> PUBLIC_ACCESS_ENDPOINT:/i)).toBeInTheDocument()
    })
  })

  it('opens card detail modal with live character sync on click', async () => {
    render(<App />)

    await waitFor(() => {
      const cardTitle = screen.getByText('Design interactive landing page mockups')
      expect(cardTitle).toBeInTheDocument()
      fireEvent.click(cardTitle)
    })

    await waitFor(() => {
      expect(screen.getByText('[LIVE_STREAM: ACTIVE]')).toBeInTheDocument()
      expect(screen.getByText('WRITE_TO_DISK (SAVE)')).toBeInTheDocument()
    })
  })
})
