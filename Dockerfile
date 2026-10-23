FROM node:20-slim

# Install git for diff operations
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Avoid "fatal: detected dubious ownership in repository" when running on mounted consumer repositories
RUN git config --global --add safe.directory '*'

WORKDIR /app

# Copy package files and install dependencies
COPY package.json ./
RUN npm install --production

# Copy remaining source code
COPY . .

# Entry point script (absolute path required as GitHub Actions sets working directory to consumer repo)
ENTRYPOINT ["node", "/app/scripts/ci/review.mjs"]
