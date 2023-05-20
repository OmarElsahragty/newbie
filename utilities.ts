import { resolve } from "path";
import { outputFile } from "fs-extra";
import { plural, singular } from "pluralize";
import { ModuleInterface } from "./types";

export const capitalizeFirstLetter = (string: string) => {
  return `${string.charAt(0).toUpperCase()}${string.slice(1).toLowerCase()}`;
};

export const writePartialModule = async (
  dist: string,
  modules: string[],
  generator: (dist: string, module: ModuleInterface) => Promise<{ path: string; content: string }>
) => {
  return Promise.all(
    modules.map(async moduleName => {
      const file = await generator(dist, {
        singularName: singular(moduleName).toLocaleLowerCase(),
        pluralName: plural(moduleName).toLocaleLowerCase(),
      });
      return outputFile(resolve(file.path), file.content, { encoding: "utf8" });
    })
  );
};
