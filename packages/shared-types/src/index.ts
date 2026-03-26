// Shared types and DTOs for NestJS microservices
// Add your exports here

// Example export structure:
// export * from './auth';
// export * from './users';
// export * from './posts';

// Roles as const assertion for better type inference and JS output
export const Roles = {
  ADMIN: "ADMIN",
  USER: "USER",
} as const;

// Inferred type from the const
export type Role = (typeof Roles)[keyof typeof Roles];
