import { resolve } from "path";
import { outputFile } from "fs-extra";
import { ModuleInterface } from "./types";

export const capitalizeFirstLetter = (text?: string) => {
  if (!text) return "";
  return `${text.charAt(0).toUpperCase()}${text.slice(1).toLowerCase()}`;
};

export const writePartialModule = async (
  dist: string,
  module: ModuleInterface,
  generator: (dist: string, module: ModuleInterface) => Promise<{ path: string; content: string }>
) => {
  const file = await generator(dist, module);
  return outputFile(resolve(file.path), file.content, { encoding: "utf8" });
};
