import express from "express";
import { getPlans, savePlan, saveBusinessPlan, getSelectedPlan } from "../controllers/planController.js"
const router = express.Router();

router.post('/select-plan', saveBusinessPlan);
router.get('/plans', getPlans);
router.post('/select', savePlan);
router.get('/selectedplan/:business_id',getSelectedPlan)

export default router;
