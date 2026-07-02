FROM node:22-slim

WORKDIR /app

# ── Python grading engine (backend/python) ─────────────────────────────────
# Only used when GRADING_ENGINE=python is set. Installed unconditionally so
# flipping the env var doesn't require a rebuild.
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-venv python3-pip && \
    rm -rf /var/lib/apt/lists/*

COPY python/ ./python/
RUN python3 -m venv ./python/.venv && \
    ./python/.venv/bin/pip install --no-cache-dir -r ./python/requirements.txt

# ── Node backend ─────────────────────────────────────────────────────────
COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

EXPOSE 8080

CMD ["node", "src/index.js"]
