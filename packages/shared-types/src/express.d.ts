// Express type extensions for authentication
import { User } from "./user.interface";

declare module "express" {
  interface Request {
    user?: User;
  }
}
