#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Uso: bun run module:new <module-name>"
  echo "Ejemplo: bun run module:new groups"
  exit 1
fi

MODULE_NAME="$1"
if [[ ! "$MODULE_NAME" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "Nombre invalido: usa kebab-case en minusculas (ej: user-profile)"
  exit 1
fi

PASCAL_NAME="$(echo "$MODULE_NAME" | sed -E 's/(^|-)([a-z0-9])/\U\2/g')"
BASE_DIR="src/modules/$MODULE_NAME"

if [ -d "$BASE_DIR" ]; then
  echo "El modulo '$MODULE_NAME' ya existe en $BASE_DIR"
  exit 1
fi

mkdir -p "$BASE_DIR"

cat > "$BASE_DIR/types.ts" <<FILE
export type ${PASCAL_NAME}Health = {
  module: '$MODULE_NAME';
  status: 'ok';
};
FILE

cat > "$BASE_DIR/service.ts" <<FILE
import type { ${PASCAL_NAME}Health } from './types';

export type ${PASCAL_NAME}Service = {
  getHealth: () => Promise<${PASCAL_NAME}Health>;
};

export function create${PASCAL_NAME}Service(): ${PASCAL_NAME}Service {
  return {
    getHealth: async () => ({
      module: '$MODULE_NAME',
      status: 'ok',
    }),
  };
}
FILE

cat > "$BASE_DIR/routes.ts" <<FILE
import { Hono } from 'hono';
import type { ${PASCAL_NAME}Service } from './service';

export function create${PASCAL_NAME}Router(service: ${PASCAL_NAME}Service): Hono {
  const router = new Hono();

  router.get('/health', async (c) => c.json(await service.getHealth()));

  return router;
}
FILE

cat > "$BASE_DIR/mcp.ts" <<FILE
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ${PASCAL_NAME}Service } from './service';

export function register${PASCAL_NAME}Tools(
  server: McpServer,
  service: ${PASCAL_NAME}Service,
): void {
  server.registerTool(
    '${MODULE_NAME//-/_}_health',
    {
      title: '${PASCAL_NAME} Health',
      description: 'Healthcheck del modulo $MODULE_NAME',
      inputSchema: {},
    },
    async () => {
      const health = await service.getHealth();

      return {
        content: [{ type: 'text', text: JSON.stringify(health) }],
        structuredContent: health,
      };
    },
  );
}
FILE

cat > "$BASE_DIR/module.ts" <<FILE
import type { ApiModule } from '../../app/module-contract';
import { register${PASCAL_NAME}Tools } from './mcp';
import { create${PASCAL_NAME}Router } from './routes';
import { create${PASCAL_NAME}Service } from './service';

export function create${PASCAL_NAME}Module(): ApiModule {
  const service = create${PASCAL_NAME}Service();

  return {
    name: '$MODULE_NAME',
    mountHttp: (app) => {
      app.route('/api/$MODULE_NAME', create${PASCAL_NAME}Router(service));
    },
    mountMcp: (server) => {
      register${PASCAL_NAME}Tools(server, service);
    },
  };
}
FILE

cat > "$BASE_DIR/index.ts" <<FILE
export { create${PASCAL_NAME}Module } from './module';
FILE

cat > "$BASE_DIR/$MODULE_NAME.test.ts" <<FILE
import { describe, expect, it } from 'bun:test';
import { create${PASCAL_NAME}Service } from './service';

describe('$MODULE_NAME service', () => {
  it('returns health', async () => {
    const service = create${PASCAL_NAME}Service();

    await expect(service.getHealth()).resolves.toEqual({
      module: '$MODULE_NAME',
      status: 'ok',
    });
  });
});
FILE

echo "Modulo creado: $BASE_DIR"
echo "Actualiza src/app/modules.ts para registrarlo."
