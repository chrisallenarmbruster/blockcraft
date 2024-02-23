import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const directoryPath = path.join(__dirname);

fs.readdir(directoryPath, (err, files) => {
  if (err) {
    console.log("Error reading files:", err);
    return;
  }

  files
    .filter(
      (file) =>
        file !== path.basename(__filename) && path.extname(file) === ".js"
    )
    .forEach((file) => {
      const markdownCopy = `${file}.md`;

      fs.copyFile(file, markdownCopy, (err) => {
        if (err) {
          console.log(
            `Error creating/overwriting markdown copy for ${file}:`,
            err
          );
        } else {
          console.log(`Markdown copy created/overwritten: ${markdownCopy}`);
        }
      });
    });
});
