import express from "express";

import {
  getBusinessInvoices,
  downloadInvoice,
} from "../controllers/advertisementInvoiceController.js";

const router = express.Router();

router.get("/business/:businessId", getBusinessInvoices);

router.get("/:invoiceId/download", downloadInvoice);

export default router;