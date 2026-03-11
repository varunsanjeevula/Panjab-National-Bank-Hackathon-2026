/**
 * Password Policy Middleware
 * Enforces strong password requirements per PNB security standards.
 */

const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

function validatePassword(password) {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }

  if (password.length < PASSWORD_RULES.minLength) {
    errors.push(`Must be at least ${PASSWORD_RULES.minLength} characters`);
  }

  if (password.length > PASSWORD_RULES.maxLength) {
    errors.push(`Must be at most ${PASSWORD_RULES.maxLength} characters`);
  }

  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Must contain at least one uppercase letter');
  }

  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Must contain at least one lowercase letter');
  }

  if (PASSWORD_RULES.requireNumber && !/\d/.test(password)) {
    errors.push('Must contain at least one number');
  }

  if (PASSWORD_RULES.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Must contain at least one special character (!@#$%^&*...)');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Express middleware that validates password in req.body
 */
function enforcePasswordPolicy(req, res, next) {
  const { password } = req.body;
  const result = validatePassword(password);

  if (!result.valid) {
    return res.status(400).json({
      error: 'Password does not meet security requirements',
      details: result.errors,
      policy: {
        minLength: PASSWORD_RULES.minLength,
        requireUppercase: PASSWORD_RULES.requireUppercase,
        requireLowercase: PASSWORD_RULES.requireLowercase,
        requireNumber: PASSWORD_RULES.requireNumber,
        requireSpecial: PASSWORD_RULES.requireSpecial
      }
    });
  }

  next();
}

module.exports = { validatePassword, enforcePasswordPolicy, PASSWORD_RULES };
