import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the current directory
const directoryPath = path.join(__dirname);

async function deleteJSMDFiles() {
  try {
    const files = await fs.readdir(directoryPath);

    // Filter for .js.md files and delete them
    const jsMdFiles = files.filter(
      (file) => path.extname(file) === ".md" && file.endsWith(".js.md")
    );
    for (const file of jsMdFiles) {
      await fs.unlink(path.join(directoryPath, file));
      console.log(`Deleted file: ${file}`);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

deleteJSMDFiles();
