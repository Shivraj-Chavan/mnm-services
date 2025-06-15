import express from "express";
import {submitContactForm, getAllContacts} from '../controllers/contactController.js';

const router = express.Router();

router.post('/contact', submitContactForm);
router.get('/', getAllContacts);

export default router;
