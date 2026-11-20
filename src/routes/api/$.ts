import { createFileRoute } from '@tanstack/react-router'
import { api } from '@/server/api/app'

const handleApiRequest = ({ request }: { request: Request }) => api.fetch(request)

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      GET: handleApiRequest,
      POST: handleApiRequest,
      PUT: handleApiRequest,
      PATCH: handleApiRequest,
      DELETE: handleApiRequest,
      OPTIONS: handleApiRequest,
    },
  },
})
