// Usage: npm run qr -- "https://<user>.github.io/maltem-devoxx-booth/"
import QRCode from "qrcode";
import { mkdirSync } from "node:fs";
const url = process.argv[2];
if (!url) { console.error('Pass the page URL: npm run qr -- "https://<user>.github.io/maltem-devoxx-booth/"'); process.exit(1); }
const opts = { errorCorrectionLevel: "M", margin: 2, color: { dark: "#1D1D1F", light: "#FFFFFF" } };
mkdirSync("qr", { recursive: true });
await QRCode.toFile("qr/qr-devoxx.png", url, { ...opts, width: 2000 });
await QRCode.toFile("qr/qr-devoxx.svg", url, { ...opts, type: "svg" });
console.log("Saved qr/qr-devoxx.png (print) and qr/qr-devoxx.svg (vector) for", url);
