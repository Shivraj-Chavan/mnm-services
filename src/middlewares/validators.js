import { body, validationResult } from "express-validator";
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  };
export const validateRegistration = [
  body("name").notEmpty().withMessage("Name is required"),
  body("phone").isMobilePhone().withMessage("Valid phone number is required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

export const validateLogin = [
    body("phone").notEmpty().withMessage("Phone number is required")
      .isMobilePhone().withMessage("Invalid phone number"),
    body("password").notEmpty().withMessage("Password is required"),
    handleValidationErrors, ];

export const validateBusiness = [
  body("owner_id").notEmpty().withMessage("Owner ID is required"),
  body("name").notEmpty().withMessage("Business name is required"),
  body("category_id").notEmpty().withMessage("Category ID is required"),
  body("address").notEmpty().withMessage("Address is required"),
  body("phone").isMobilePhone().withMessage("Valid phone number is required"),
];

export const validateReview = [
  body("user_id").notEmpty().withMessage("User ID is required"),
  body("business_id").notEmpty().withMessage("Business ID is required"),
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
  body("comment").optional().isLength({ max: 500 }).withMessage("Comment must be under 500 characters"),
];
