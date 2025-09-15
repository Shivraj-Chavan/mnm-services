import express from "express";
import {submitContactForm, getAllContacts, markedViewed} from '../controllers/contactController.js';

const router = express.Router();

router.post('/contact', submitContactForm);
router.get('/', getAllContacts);
router.post("/:id/toggle-view", markedViewed);

export default router;
