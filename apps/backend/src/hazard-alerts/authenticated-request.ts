/** Express request populated by `JwtAuthGuard` with the signed-in user. */
export interface AuthenticatedRequest {
  user: { id: string };
}
