import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/groups/')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
