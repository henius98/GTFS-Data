FROM node:24-slim

# Set working dir
WORKDIR /app

# Install pnpm (matches package.json)
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

# Copy lockfile & manifest first for better caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies (no dev deps in final image)
RUN pnpm install --frozen-lockfile --prod

# Copy source
COPY . .

# Build TypeScript
RUN pnpm run build

# Default runtime command (adjust if you prefer another script)
CMD ["node", "dist/app/cli.js", "import"]
