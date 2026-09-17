/**
 * Error codes the API returns instead of sentences. The browser turns each into copy in the
 * visitor's language (app/i18n/launch.ts → apiErrors); operator detail stays in the server log.
 */
export const API_ERRORS = [
  "bad_request", "missing_fields", "check_fields", "posting_resume_short", "resume_short", "profile_short",
  "ai_unavailable", "ai_busy", "ai_failed", "rate_limited", "limit", "not_found", "forbidden",
  "sign_in_required", "account_required", "unlock_first", "no_credits", "kit_not_tailored", "no_posting",
  "session_finished", "answer_current_first", "answer_first", "answer_short", "need_company_or_role",
  "pin_invalid", "pin_wrong", "email_password_required", "wrong_credentials", "account_locked",
  "invalid_signup", "email_taken", "email_disposable", "terms_required", "payments_off", "checkout_failed",
  "password_wrong", "password_short", "taken_down", "unknown_variant", "confirm_mismatch", "contact_invalid",
  "admin_protected",
] as const;
export type ApiErrorCode = (typeof API_ERRORS)[number];
export const isApiErrorCode = (v: unknown): v is ApiErrorCode => typeof v === "string" && (API_ERRORS as readonly string[]).includes(v);
