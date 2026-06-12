import { normalizePasswordInput, normalizeUsernameInput } from '@/lib/domain/auth-inputs';

export type RegistrationRole = '' | 'Driver' | 'Commuter' | 'Both';
export type VehicleType = '' | 'Jeepney' | 'Bus';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/,
  plate: /^[A-Z]{3}\d{4}$/,
  license: /^[A-Z]\d{2}-\d{2}-\d{6}$/,
  username: /^[a-zA-Z0-9_-]+(?: [a-zA-Z0-9_-]+)*$/,
} as const;

const hasValue = (value: string): boolean => value.trim().length > 0;

export const isValidEmail = (email: string): boolean =>
  hasValue(email) && PATTERNS.email.test(email.trim().toLowerCase());

export const isValidPassword = (password: string): boolean =>
  normalizePasswordInput(password) === password && PATTERNS.password.test(password);

export const isValidUsername = (username: string): boolean => {
  const normalizedUsername = normalizeUsernameInput(username);

  return normalizedUsername.length >= 3
    && normalizedUsername.length <= 20
    && PATTERNS.username.test(normalizedUsername);
};

export const isValidPlateNumber = (plate: string): boolean =>
  PATTERNS.plate.test(plate.trim().toUpperCase());

export const isValidLicenseNumber = (license: string): boolean =>
  PATTERNS.license.test(license.trim().toUpperCase());

export const doPasswordsMatch = (password: string, confirm: string): boolean =>
  password === confirm;

export type PasswordStrength = 'weak' | 'fair' | 'strong' | 'very-strong';

export interface PasswordStrengthResult {
  strength: PasswordStrength;
  score: number;
  label: string;
  color: string;
  hints: string[];
}

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
    0: { strength: 'weak', label: 'Weak', color: '#EF4444' },
    1: { strength: 'weak', label: 'Weak', color: '#EF4444' },
    2: { strength: 'fair', label: 'Fair', color: '#F59E0B' },
    3: { strength: 'strong', label: 'Strong', color: '#10B981' },
    4: { strength: 'very-strong', label: 'Very Strong', color: '#059669' },
  };

  return { ...levels[Math.min(score, 4)], score: Math.min(score, 4), hints };
}

export interface LoginFields {
  email: string;
  password: string;
}

export function validateLoginForm(fields: LoginFields): ValidationResult {
  const fieldErrors: Record<string, string> = {};

  if (!hasValue(fields.email)) {
    fieldErrors.email = 'Enter your email.';
  } else if (!isValidEmail(fields.email)) {
    fieldErrors.email = 'Enter a valid email.';
  }

  if (!hasValue(fields.password)) {
    fieldErrors.password = 'Enter your password.';
  } else if (normalizePasswordInput(fields.password) !== fields.password) {
    fieldErrors.password = 'Passwords cannot contain spaces.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    const firstError = Object.values(fieldErrors)[0];
    return { isValid: false, error: firstError, fieldErrors };
  }

  return { isValid: true };
}

export interface ForgotPasswordFields {
  email: string;
}

export function validateForgotPasswordForm(fields: ForgotPasswordFields): ValidationResult {
  if (!hasValue(fields.email)) {
    return {
      isValid: false,
      error: 'Enter your email.',
      fieldErrors: { email: 'Enter your email.' },
    };
  }

  if (!isValidEmail(fields.email)) {
    return {
      isValid: false,
      error: 'Enter a valid email.',
      fieldErrors: { email: 'Enter a valid email.' },
    };
  }

  return { isValid: true };
}

export interface RegistrationFields {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  selectedRole: RegistrationRole;
  selectedVehicle?: VehicleType;
  plateNumber?: string;
  licenseNumber?: string;
  idImage?: string | null;
  agreed: boolean;
}

export interface DriverApplicationFields {
  selectedVehicle?: VehicleType;
  plateNumber?: string;
  licenseNumber?: string;
  idImage?: string | null;
}

export function validateDriverApplicationFields(fields: DriverApplicationFields) {
  const fieldErrors: Record<string, string> = {};

  if (!fields.selectedVehicle) {
    fieldErrors.selectedVehicle = 'Select a vehicle type.';
  }

  if (!hasValue(fields.plateNumber ?? '')) {
    fieldErrors.plateNumber = 'Enter your plate number.';
  } else if (!isValidPlateNumber(fields.plateNumber ?? '')) {
    fieldErrors.plateNumber = 'Enter a valid plate number (example: ABC1234).';
  }

  if (!hasValue(fields.licenseNumber ?? '')) {
    fieldErrors.licenseNumber = 'Enter your license number.';
  } else if (!isValidLicenseNumber(fields.licenseNumber ?? '')) {
    fieldErrors.licenseNumber = 'Enter a valid license number (example: A12-34-123456).';
  }

  if (!fields.idImage) {
    fieldErrors.idImage = 'Upload a valid ID.';
  }

  return fieldErrors;
}

export function validateRegistrationForm(fields: RegistrationFields): ValidationResult {
  const fieldErrors: Record<string, string> = {};
  const includesDriverIntent = fields.selectedRole === 'Driver' || fields.selectedRole === 'Both';

  if (!hasValue(fields.username)) {
    fieldErrors.username = 'Enter a username.';
  } else if (!isValidUsername(fields.username)) {
    fieldErrors.username =
      'Use 3 to 20 characters. Letters, numbers, spaces, underscores, and hyphens are allowed.';
  }

  if (!hasValue(fields.email)) {
    fieldErrors.email = 'Enter your email.';
  } else if (!isValidEmail(fields.email)) {
    fieldErrors.email = 'Enter a valid email.';
  }

  if (!hasValue(fields.password)) {
    fieldErrors.password = 'Enter your password.';
  } else if (normalizePasswordInput(fields.password) !== fields.password) {
    fieldErrors.password = 'Passwords cannot contain spaces.';
  } else if (!isValidPassword(fields.password)) {
    fieldErrors.password =
      'Use at least 8 characters with uppercase, lowercase, a number, and a symbol.';
  }

  if (!hasValue(fields.confirmPassword)) {
    fieldErrors.confirmPassword = 'Confirm your password.';
  } else if (!doPasswordsMatch(fields.password, fields.confirmPassword)) {
    fieldErrors.confirmPassword = 'Passwords do not match.';
  }

  if (!fields.selectedRole) {
    fieldErrors.selectedRole = 'Select your account type.';
  }

  if (includesDriverIntent) {
    Object.assign(fieldErrors, validateDriverApplicationFields(fields));
  }

  if (!fields.agreed) {
    fieldErrors.agreed = 'Accept the Terms and Conditions to continue.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    const firstError = Object.values(fieldErrors)[0];
    return { isValid: false, error: firstError, fieldErrors };
  }

  return { isValid: true };
}

export const Validators = {
  isValidEmail,
  isValidPassword,
  isValidUsername,
  isValidPlateNumber,
  isValidLicenseNumber,
  doPasswordsMatch,
  getPasswordStrength,
} as const;
