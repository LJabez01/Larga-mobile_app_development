// ─────────────────────────────────────────────────────────────
//  validation.ts  —  Auth & Registration Validators
//  Covers: Login · Registration · Forgot Password
// ─────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────

export type Role = '' | 'Driver' | 'Commuter';
export type VehicleType = '' | 'Jeepney' | 'Bus';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  /** Field-level errors for inline UI feedback */
  fieldErrors?: Partial<Record<string, string>>;
}

// ─── Regex Patterns ───────────────────────────────────────────

const PATTERNS = {
  /** RFC-5321 inspired — practical email check */
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,

  /**
   * Password rules:
   *  - Minimum 8 characters
   *  - At least one uppercase letter
   *  - At least one lowercase letter
   *  - At least one digit
   *  - At least one special character
   */
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/,

  /** Philippine plate: 3 letters + 4 digits, e.g. "ABC1234" */
  plate: /^[A-Z]{3}\d{4}$/,

  /**
   * LTO license format: A12-34-123456
   * Pattern: 1 letter · 2 digits · hyphen · 2 digits · hyphen · 6 digits
   */
  license: /^[A-Z]\d{2}-\d{2}-\d{6}$/,

  /** Username: 3–20 chars, letters/digits/underscores/hyphens only */
  username: /^[a-zA-Z0-9_-]{3,20}$/,
} as const;

// ─── Primitive Validators ─────────────────────────────────────

/** Returns true when the value is a non-empty, trimmed string. */
const hasValue = (v: string): boolean => v.trim().length > 0;

export const isValidEmail = (email: string): boolean =>
  hasValue(email) && PATTERNS.email.test(email.trim().toLowerCase());

export const isValidPassword = (password: string): boolean =>
  PATTERNS.password.test(password);

export const isValidUsername = (username: string): boolean =>
  PATTERNS.username.test(username.trim());

export const isValidPlateNumber = (plate: string): boolean =>
  PATTERNS.plate.test(plate.trim().toUpperCase());

export const isValidLicenseNumber = (license: string): boolean =>
  PATTERNS.license.test(license.trim().toUpperCase());

export const doPasswordsMatch = (password: string, confirm: string): boolean =>
  password === confirm;

// ─── Password Strength ────────────────────────────────────────

export type PasswordStrength = 'weak' | 'fair' | 'strong' | 'very-strong';

export interface PasswordStrengthResult {
  strength: PasswordStrength;
  score: number; // 0–4
  label: string;
  color: string;
  hints: string[];
}

/**
 * Returns a detailed password strength assessment.
 * Useful for rendering a strength meter in the UI.
 */
export function getPasswordStrength(password: string): PasswordStrengthResult {
  const hints: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else hints.push('Use at least 8 characters');

  if (password.length >= 12) score++;

  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  else hints.push('Mix uppercase and lowercase letters');

  if (/\d/.test(password)) score++;
  else hints.push('Add at least one number');

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
  else hints.push('Add a special character (e.g. !@#$)');

  const levels: Record<number, Omit<PasswordStrengthResult, 'score' | 'hints'>> = {
    0: { strength: 'weak',        label: 'Weak',        color: '#EF4444' },
    1: { strength: 'weak',        label: 'Weak',        color: '#EF4444' },
    2: { strength: 'fair',        label: 'Fair',        color: '#F59E0B' },
    3: { strength: 'strong',      label: 'Strong',      color: '#10B981' },
    4: { strength: 'very-strong', label: 'Very Strong', color: '#059669' },
  };

  return { ...levels[Math.min(score, 4)], score: Math.min(score, 4), hints };
}

// ─── Login Validation ─────────────────────────────────────────

export interface LoginFields {
  email: string;
  password: string;
}

/**
 * Validates the login form.
 * Returns field-level errors for inline feedback.
 */
export function validateLoginForm(fields: LoginFields): ValidationResult {
  const fieldErrors: Record<string, string> = {};

  if (!hasValue(fields.email)) {
    fieldErrors.email = 'Email is required.';
  } else if (!isValidEmail(fields.email)) {
    fieldErrors.email = 'Enter a valid email address.';
  }

  if (!hasValue(fields.password)) {
    fieldErrors.password = 'Password is required.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    const firstError = Object.values(fieldErrors)[0];
    return { isValid: false, error: firstError, fieldErrors };
  }

  return { isValid: true };
}

// ─── Forgot Password Validation ───────────────────────────────

export interface ForgotPasswordFields {
  email: string;
}

export function validateForgotPasswordForm(fields: ForgotPasswordFields): ValidationResult {
  if (!hasValue(fields.email)) {
    return {
      isValid: false,
      error: 'Email is required.',
      fieldErrors: { email: 'Email is required.' },
    };
  }

  if (!isValidEmail(fields.email)) {
    return {
      isValid: false,
      error: 'Enter a valid email address.',
      fieldErrors: { email: 'Enter a valid email address.' },
    };
  }

  return { isValid: true };
}

// ─── Registration Validation ──────────────────────────────────

export interface RegistrationFields {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  selectedRole: Role;
  // Driver-only
  selectedVehicle?: VehicleType;
  plateNumber?: string;
  licenseNumber?: string;
  idImage?: string | null;
  agreed: boolean;
}

/**
 * Full registration validation with field-level error map.
 * Driver-specific fields are only checked when the role is "Driver".
 */
export function validateRegistrationForm(fields: RegistrationFields): ValidationResult {
  const fieldErrors: Record<string, string> = {};

  // ── Username ──────────────────────────────────────────────
  if (!hasValue(fields.username)) {
    fieldErrors.username = 'Username is required.';
  } else if (!isValidUsername(fields.username)) {
    fieldErrors.username =
      'Username must be 3–20 characters and contain only letters, numbers, underscores, or hyphens.';
  }

  // ── Email ─────────────────────────────────────────────────
  if (!hasValue(fields.email)) {
    fieldErrors.email = 'Email address is required.';
  } else if (!isValidEmail(fields.email)) {
    fieldErrors.email = 'Enter a valid email address (e.g. name@example.com).';
  }

  // ── Password ──────────────────────────────────────────────
  if (!hasValue(fields.password)) {
    fieldErrors.password = 'Password is required.';
  } else if (!isValidPassword(fields.password)) {
    fieldErrors.password =
      'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.';
  }

  // ── Confirm Password ──────────────────────────────────────
  if (!hasValue(fields.confirmPassword)) {
    fieldErrors.confirmPassword = 'Please confirm your password.';
  } else if (!doPasswordsMatch(fields.password, fields.confirmPassword)) {
    fieldErrors.confirmPassword = 'Passwords do not match.';
  }

  // ── Role ──────────────────────────────────────────────────
  if (!fields.selectedRole) {
    fieldErrors.selectedRole = 'Please select your role (Driver or Commuter).';
  }

  // ── Driver-Specific Fields ────────────────────────────────
  if (fields.selectedRole === 'Driver') {
    if (!fields.selectedVehicle) {
      fieldErrors.selectedVehicle = 'Please select a vehicle type.';
    }

    if (!hasValue(fields.plateNumber ?? '')) {
      fieldErrors.plateNumber = 'Plate number is required.';
    } else if (!isValidPlateNumber(fields.plateNumber ?? '')) {
      fieldErrors.plateNumber =
        'Enter a valid Philippine plate number (e.g. ABC1234).';
    }

    if (!hasValue(fields.licenseNumber ?? '')) {
      fieldErrors.licenseNumber = 'License number is required.';
    } else if (!isValidLicenseNumber(fields.licenseNumber ?? '')) {
      fieldErrors.licenseNumber =
        'Enter a valid LTO license number (e.g. A12-34-123456).';
    }

    if (!fields.idImage) {
      fieldErrors.idImage = 'Please upload a valid government ID.';
    }
  }

  // ── Terms & Conditions ────────────────────────────────────
  if (!fields.agreed) {
    fieldErrors.agreed = 'You must accept the Terms and Conditions to continue.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    const firstError = Object.values(fieldErrors)[0];
    return { isValid: false, error: firstError, fieldErrors };
  }

  return { isValid: true };
}

// ─── Helpers (re-exported for convenience) ───────────────────

export const Validators = {
  isValidEmail,
  isValidPassword,
  isValidUsername,
  isValidPlateNumber,
  isValidLicenseNumber,
  doPasswordsMatch,
  getPasswordStrength,
} as const;