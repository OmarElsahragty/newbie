import { parse } from "yaml";
import Zip from "node-stream-zip";
import { join, resolve } from "path";
import { exec } from "node:child_process";
import { readFile, outputFile } from "fs-extra";
import { setModulesRef } from "./helpers";
import validator from "./validations";
import generators from "./generators";
import modifiers from "./modifiers";

export const newbieGenerator = async (
  yamlFilePath = join(__dirname, "newbie.example.yaml"),
  distPath = join(__dirname, "newbie")
) => {
  const modules = setModulesRef(await validator(await parse(await readFile(resolve(yamlFilePath), "utf8"))));
  const zip = new Zip.async({ file: join(__dirname, "skeleton.zip"), storeEntries: true });

  const entries = await zip.entries();
  await Promise.all(
    Object.values(entries).map(async entry => {
      if (entry.isDirectory) return;
      return outputFile(join(distPath, entry.name), (await zip.entryData(entry.name)).toString("utf8"), {
        encoding: "utf8",
      });
    })
  );

  await zip.close();

  await generators(distPath, modules);

  await modifiers(distPath, modules);

  await exec(`prettier --write ${distPath}`);
};
