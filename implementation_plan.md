# Implementation Plan

## Overview

Create a basic NestJS sub-app initialization for the auth microservice at `apps/api/apps/auth-microservice/`. This is ONLY the basic NestJS app structure with proper monorepo configuration - no authentication implementation, no strategies, no guards.

## Context

The project is a monorepo using pnpm workspaces and Turborepo. The auth microservice directory already exists at `apps/api/apps/auth-microservice/` with an empty `src/` folder. The existing `core-microservice` serves as the reference implementation.

**Key patterns from core-microservice:**

- Uses `type: "module"` in package.json
- TypeScript configured with `commonjs` module, `ES2021` target
- Uses `../../../../packages/typescript-config/base.json` for extends path
- ESLint uses `@repo/eslint-config/nest-js` (not nest.js)
- nest-cli.json at `apps/api/` level needs to be updated with new project

The user specifically requested:

- Basic NestJS app initialization only
- Proper config for monorepo integration
- No implementation of strategies, guards, or auth logic

## Types

No new types needed.

## Files

New files to create:

- `apps/api/apps/auth-microservice/package.json` - Package configuration matching core-microservice patterns
- `apps/api/apps/auth-microservice/tsconfig.json` - TypeScript configuration extending shared config (4 levels up)
- `apps/api/apps/auth-microservice/tsconfig.app.json` - App-specific TypeScript config for NestJS CLI
- `apps/api/apps/auth-microservice/eslint.config.js` - ESLint configuration using `@repo/eslint-config/nest-js`
- `apps/api/apps/auth-microservice/src/main.ts` - Application entry point with NestFactory bootstrap (port 3002)
- `apps/api/apps/auth-microservice/src/app.module.ts` - Root application module (empty)

Files to modify:

- `apps/api/nest-cli.json` - Add auth-microservice project configuration

## Functions

New functions:

- `bootstrap()` in `src/main.ts` - NestJS application factory and server startup on port 3002

## Classes

New classes:

- `AppModule` in `src/app.module.ts` - Root NestJS module (empty, no imports)

## Dependencies

New packages (in package.json dependencies):

- `@nestjs/common` (^11.0.1) - NestJS core decorators and utilities
- `@nestjs/core` (^11.0.1) - NestJS core framework
- `@nestjs/platform-express` (^11.0.1) - Express platform adapter
- `reflect-metadata` (^0.2.2) - Metadata reflection for decorators
- `rxjs` (^7.8.1) - Reactive extensions

New packages (in package.json devDependencies):

- `@nestjs/cli` (^11.0.6) - NestJS CLI for building
- `@nestjs/schematics` (^11.0.5) - NestJS code generation
- `@repo/eslint-config` (workspace:\*) - Shared ESLint config
- `@repo/typescript-config` (workspace:\*) - Shared TypeScript config
- `@types/node` (^25.5.0) - Node.js type definitions
- `eslint` (^9.39.1) - Linting
- `typescript` (^5.9.2) - TypeScript compiler

## Testing

No tests in basic initialization.

## Implementation Order

1. Create `package.json` with NestJS dependencies (matching core-microservice versions)
2. Create `tsconfig.json` extending base TypeScript config (4 levels up path)
3. Create `tsconfig.app.json` for NestJS CLI build configuration
4. Create `eslint.config.js` using `@repo/eslint-config/nest-js`
5. Create `src/main.ts` with bootstrap function (port 3002)
6. Create `src/app.module.ts` as empty root module
7. Update `apps/api/nest-cli.json` to add auth-microservice project
