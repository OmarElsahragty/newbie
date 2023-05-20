import { join } from "path";
import Zip from "node-stream-zip";
import { pathExists, outputFile, remove } from "fs-extra";
import * as generators from "./generators";
import { writePartialModule } from "./utilities";

export default async (modules = ["test"], distDirectoryName = "newbie") => {
  const distPath = join(__dirname, distDirectoryName);

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

  await Promise.all([
    writePartialModule(distPath, modules, generators.enumsGenerator),
    writePartialModule(distPath, modules, generators.schemasGenerator),
    writePartialModule(distPath, modules, generators.typesGenerator),
    writePartialModule(distPath, modules, generators.modelGenerator),
    writePartialModule(distPath, modules, generators.repositoryGenerator),
    writePartialModule(distPath, modules, generators.serviceGenerator),
    writePartialModule(distPath, modules, generators.controllerGenerator),
    writePartialModule(distPath, modules, generators.routesGenerator),
  ]);
};
