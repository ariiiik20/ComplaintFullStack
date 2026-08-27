const { validationResult } = require('express-validator');

/**
 * Middleware to run express-validator checks and return errors.
 * Use after validation chains in route definitions.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    const errorMsg = extractedErrors.map((e) => e.message).join(' | ');

    return res.status(422).json({
      success: false,
      message: errorMsg || 'Validation failed',
      errors: extractedErrors,
    });
  }

  next();
};

module.exports = validate;
