import type { KanbanService } from './api'
import { backendKanbanService } from './backendService'
import { mockKanbanService } from './mockService'

/**
 * Service Factory
 * When VITE_USE_MOCK is 'true' or in tests, returns mockKanbanService.
 * Otherwise, uses the real FastAPI backend client (backendKanbanService).
 */
const useMock = import.meta.env.VITE_USE_MOCK === 'true' || import.meta.env.MODE === 'test'

export const getKanbanService = (): KanbanService => {
  if (useMock) {
    return mockKanbanService
  }
  return backendKanbanService
}

export { backendKanbanService, mockKanbanService }
