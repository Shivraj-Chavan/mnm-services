import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 2 },
  fileFilter: (req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("Only JPG, JPEG, PNG or WEBP images are allowed."), ok);
  },
}).fields([
  { name: "image_desktop", maxCount: 1 },
  { name: "image_mobile", maxCount: 1 },
]);

export default function uploadAdImages(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "Each image must be 2 MB or smaller." : err.message || "Image upload failed.";
    res.status(400).json({ success: false, message });
  });
}
