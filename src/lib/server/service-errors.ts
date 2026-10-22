import { RequestError } from "./validation";
export function rethrowSetupError(error: any): void {
  if (!error) return;
  const code = String(error.code || "");
  if (
    [
      "PGRST205",
      "PGRST202",
      "PGRST200",
      "42P01",
      "42703",
      "42883",
      "3F000",
    ].includes(code)
  ) {
    throw new RequestError(
      "This feature is temporarily unavailable because its database setup is incomplete. Please contact support@cumid.store.",
      503,
      "DATABASE_SETUP_REQUIRED",
    );
  }
  if (code === "42501")
    throw new RequestError(
      "Your account does not have permission for this action. Please sign in with the correct account or contact support@cumid.store.",
      403,
      "ACCESS_DENIED",
    );
  if (code === "PGRST116")
    throw new RequestError(
      "The requested record could not be found for this account. Refresh the page or check that you are signed in with the right account.",
      404,
      "RECORD_NOT_FOUND",
    );
}
