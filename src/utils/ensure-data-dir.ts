import fs from "fs";
import path from "path";

// Create the data directory if it doesn't exist
export function ensureDataDir() {
  const dataDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}
