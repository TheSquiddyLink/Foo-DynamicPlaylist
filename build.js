import { exec } from "child_process";
import { readFileSync, write, writeFileSync } from "fs";
import { join } from "path";

// Load build configuration
const { version, build } = JSON.parse(readFileSync("package.json", "utf8"));

// Construct the electron-packager command
const fileName = `${build.appName}-v${version}`;

const ignorePatterns = build.ignore ? build.ignore.map(pattern => `--ignore="${pattern}"`).join(" ") : "";

const command = [
    "npx electron-packager .",
    fileName,
    `--platform=${build.platform}`,
    `--arch=${build.arch}`,
    `--out=${build.out}`,
    build.overwrite ? "--overwrite" : "",
    build.icon ? `--icon=${build.icon}` : "",
    ignorePatterns
].join(" ");

// Run the command
console.log(`Running: ${command}`);
exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error during build: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`Build warnings: ${stderr}`);
    }
    console.log(stdout);

    const originalPackageJson = JSON.parse(readFileSync("package.json", "utf8"));

    const minimalPackageJson = {
        name: originalPackageJson.name,
        version: originalPackageJson.version,
        main: originalPackageJson.main,
        author: originalPackageJson.author,
        license: originalPackageJson.license,
        dependencies: originalPackageJson.dependencies,
    };

    const folderName = fileName + "-" + build.platform + "-" + build.arch;

    const buildDir = join(build.out, folderName, "resources", "app");

    const buildPackageJson = join(buildDir, "package.json");
    try {
        writeFileSync(buildPackageJson, JSON.stringify(minimalPackageJson, null, 4));
    } catch (error) {
        console.error(`Error writing package.json: ${error.message}`);
        return;
    }
});
