import { KanbanService } from './api'
import { mockKanbanService } from './mockService'

/**
 * Service Factory
 * In dev / test / standalone mode, returns the comprehensive MockKanbanService.
 * When a real backend is available (e.g. FastAPI), an HttpWebsocketKanbanService
 * can be plugged in here without touching any React components.
 */
export const getKanbanService = (): KanbanService => {
  return mockKanbanService
}

export { mockKanbanService }
