import { join } from "path";
import { parse } from "yaml";
import Zip from "node-stream-zip";
import { readFile, pathExists, outputFile, remove } from "fs-extra";
import { ModuleInterface } from "./types";
import validator from "./validations";
import generators from "./generators";

export default async (yamlFilePath = "./newbie.example.yaml", distDirectoryName = "newbie") => {
  const distPath = join(__dirname, distDirectoryName);
  const data: Record<string, ModuleInterface>[] = await parse(await readFile(join(__dirname, yamlFilePath), "utf8"));
  const modules = await validator(data);

  if (await pathExists(distPath)) await remove(distPath);
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
};
