import Joi from "joi";

// ✅ Generic validation middleware
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation Failed",
      errors: error.details.map((err) => err.message),
    });
  }
  next();
};

// ✅ User Registration & Update Validation
export const validateUser = validate(
  Joi.object({
    name: Joi.string().trim().min(3).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(30).required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
    role: Joi.string().valid("user", "business", "admin", "sub-admin").default("user"),
  })
);

// ✅ Business Registration & Update Validation
export const validateBusiness = validate(
  Joi.object({
    owner_id: Joi.number().integer().required(),
    name: Joi.string().trim().min(3).max(255).required(),
    category_id: Joi.number().integer().required(),
    subcategory_id: Joi.number().integer().required(),
    address: Joi.string().trim().max(500).optional(),
    city: Joi.string().trim().max(100).required(),
    state: Joi.string().trim().max(100).required(),
    zip_code: Joi.string().trim().max(20).optional(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
    email: Joi.string().email().optional(),
    website: Joi.string().uri().optional(),
    description: Joi.string().trim().max(1000).optional(),
    is_verified: Joi.boolean().default(false),
  })
);

// ✅ Review Validation
export const validateReview = validate(
  Joi.object({
    user_id: Joi.number().integer().required(),
    business_id: Joi.number().integer().required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().trim().max(500).optional(),
  })
);

// ✅ Payment Validation
export const validatePayment = validate(
  Joi.object({
    business_id: Joi.number().integer().required(),
    plan: Joi.string().valid("normal", "gold", "platinum", "prime").required(),
    amount: Joi.number().precision(2).positive().required(),
    transaction_id: Joi.string().required(),
    status: Joi.string().valid("pending", "completed", "failed").default("pending"),
  })
);
