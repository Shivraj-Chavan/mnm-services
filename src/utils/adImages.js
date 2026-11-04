import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGE_DIR = process.env.IMAGE_DIR || path.join(__dirname, "../../uploads/ads");
fs.mkdirSync(IMAGE_DIR, { recursive: true });

const SIZE_TOLERANCE = 0.10;

// Every banner must be EXACTLY this size (width x height in pixels).
//   Homepage desktop: left banner 200x600 and right banner 200x600 (same size)
//   Homepage mobile : 1800x600
//   Category desktop: 1600x300
//   Category mobile : 1800x600
export const REQUIRED_SIZES = {
  homepage: {
    desktop: { recommended: [1024, 113], exact: true },   // left and right banner
    mobile: { recommended: [1800, 600], exact: true },
  },
  category: {
    desktop: { recommended: [1024, 113], exact: true },
    mobile: { recommended: [1800, 600], exact: true },
  },
};

const FORMAT_TO_EXT = { jpeg: "jpg", png: "png", webp: "webp" };

export class AdError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function withinTolerance(actual, required, tolerance = SIZE_TOLERANCE) {
  return actual >= required * (1 - tolerance) && actual <= required * (1 + tolerance);
}

function matchesAnySize(w, h, sizeOption) {
  const candidates = [sizeOption.recommended, ...(sizeOption.alt || [])];
  if (sizeOption.exact) return candidates.some(([rw, rh]) => w === rw && h === rh);
  return candidates.some(
    ([rw, rh]) => withinTolerance(w, rw) && withinTolerance(h, rh) && withinTolerance(w / h, rw / rh, 0.05)
  );
}

export async function validateBanner(file, label, sizeOption) {
  console.log("[adImages] v2 checking", label, JSON.stringify(sizeOption));
  if (!file) throw new AdError(label + " banner image is required.");
  let meta;
  try {
    meta = await sharp(file.buffer).metadata();
  } catch {
    throw new AdError(label + " banner is not a valid image.");
  }
  const ext = FORMAT_TO_EXT[meta.format];
  if (!ext) throw new AdError(label + " banner must be JPG, PNG or WEBP.");

  if (!matchesAnySize(meta.width, meta.height, sizeOption)) {
    const allowed = [sizeOption.recommended, ...(sizeOption.alt || [])].map(([w, h]) => w + "x" + h).join(" or ");
    const wording = sizeOption.exact ? "must be exactly" : "should be close to";
    throw new AdError(label + " banner " + wording + " " + allowed + " pixels (uploaded " + meta.width + "x" + meta.height + ").");
  }
  return ext;
}

export async function saveImage(file, ext) {
  const name = "ad-" + crypto.randomUUID() + "." + ext;
  await fs.promises.writeFile(path.join(IMAGE_DIR, name), file.buffer);
  return name;
}

export async function removeImage(name) {
  if (!name) return;
  try {
    await fs.promises.unlink(path.join(IMAGE_DIR, path.basename(name)));
  } catch (e) {
    if (e.code !== "ENOENT") console.error("[advertisements] image delete failed:", name, e.message);
  }
}