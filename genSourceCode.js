import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const directoryPath = path.join(__dirname);
const outputFile = path.join(__dirname, "sourceCode.md");

fs.writeFileSync(outputFile, "");

const appendFileContent = (file, language) => {
  fs.readFile(path.join(directoryPath, file), "utf8", (err, data) => {
    if (err) {
      console.log(`Error reading ${file}:`, err);
    } else {
      fs.appendFileSync(
        outputFile,
        `# ${file}\n\n\`\`\`${language}\n${data}\n\`\`\`\n\n`
      );
      console.log(`Appended contents of ${file} to ${outputFile}`);
    }
  });
};

fs.readdir(directoryPath, (err, files) => {
  if (err) {
    console.log("Error reading files:", err);
    return;
  }

  const readmeFile = files.find((file) => path.basename(file) === "README.md");
  if (readmeFile) {
    appendFileContent(readmeFile, "markdown");
  }

  const packageFile = files.find(
    (file) => path.basename(file) === "package.json"
  );
  if (packageFile) {
    appendFileContent(packageFile, "json");
  }

  const jsFiles = files
    .filter(
      (file) => file.endsWith(".js") && file !== path.basename(__filename)
    )
    .sort((a, b) => a.localeCompare(b));

  jsFiles.forEach((file) => appendFileContent(file, "javascript"));
});
