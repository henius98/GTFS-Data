FROM node:24-slim AS build

# Set working dir
WORKDIR /app

# Install pnpm (matches package.json)
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

# Copy lockfile & manifest first for better caching
COPY package.json pnpm-lock.yaml ./

# Install full dependencies for build
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build TypeScript
RUN pnpm run build

FROM node:24-slim AS runtime

WORKDIR /app

# Install pnpm (needed for installing prod deps)
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy build output
COPY --from=build /app/dist ./dist

# Default runtime command (adjust if you prefer another script)
CMD ["node", "dist/app/cli.js", "import"]
