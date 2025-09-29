const Joi = require('joi');

const registrationSchema = Joi.object({
  username: Joi.string().min(3).max(64).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string().valid('admin', 'red', 'blue', 'observer').optional()
}).required();

const loginSchema = Joi.object({
  username: Joi.string().min(3).max(64).required(),
  password: Joi.string().min(8).max(128).required(),
  totp: Joi.string().length(6).pattern(/^[0-9]+$/).optional() // for admin MFA
}).required();

const stepSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().min(1).max(5000).required(),
  expectedAction: Joi.string().max(2000).optional(),
  outcome: Joi.string().max(2000).optional()
});

const scenarioSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().allow('').max(2000).optional(),
  steps: Joi.array().items(stepSchema).max(200).default([]),
  retentionDays: Joi.number().integer().min(1).max(3650).default(30)
}).required();

function validate(schema) {
  return (req, res, next) => {
    const { value, error } = schema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ error: error.message });
    // Basic sanitization: strip angle brackets (defense-in-depth; UI should escape)
    const scrub = (v) => {
      if (Array.isArray(v)) return v.map(scrub);
      if (v && typeof v === 'object') {
        const o = {}; for (const k in v) o[k] = scrub(v[k]); return o;
      }
      if (typeof v === 'string') return v.replace(/[<>]/g, '');
      return v;
    };
    req.body = scrub(value);
    next();
  };
}

const validateRegistration = validate(registrationSchema);
const validateLogin = validate(loginSchema);
const validateScenario = validate(scenarioSchema);

module.exports = { validateRegistration, validateLogin, validateScenario };

// Security Hardening: enforce strict Joi validation
const defaultOptions = { abortEarly: false, allowUnknown: false, stripUnknown: true };
// Apply defaultOptions in all schema.validate calls