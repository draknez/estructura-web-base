#!/bin/bash
cd "$(dirname "$0")/.."

echo "🚀 Arrancando App con AUTO-RELOAD..."
echo "📡 Backend: http://localhost:3000 (Watch Mode ON)"
echo "🎨 Frontend: http://localhost:5173"
echo "❌ Presiona CTRL + C para detener todo."
echo ""

# Aumentamos el límite de memoria a 4GB para evitar cierres (Heap Out of Memory)
export NODE_OPTIONS="--max-old-space-size=4096"

# Usamos node --watch (Disponible en Node 18.11+)
/data/data/com.termux/files/usr/bin/pnpm exec concurrently \
  "node --watch server/index.js" \
  "/data/data/com.termux/files/usr/bin/pnpm dev --host" \
  --names "SERVER,CLIENT" \
  --prefix-colors "yellow,cyan"