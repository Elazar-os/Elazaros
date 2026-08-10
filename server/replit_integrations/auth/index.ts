export {
  setupAuth,
  isAuthenticated,
  requireAdminOrBoss,
  getSession,
  getSessionUser,
} from "./replitAuth";
export { authStorage, type IAuthStorage } from "./storage";
export { registerAuthRoutes } from "./routes";
