import { resolve } from "path";
import { outputFile } from "fs-extra";

export const capitalizeFirstLetter = (text?: string) => {
  if (!text) return "";
  return `${text.charAt(0).toUpperCase()}${text.slice(1).toLowerCase()}`;
};

export const writePartialModule = async <T>(
  dist: string,
  module: T,
  generator: (dist: string, module: T) => Promise<{ path: string; content: string }>
) => {
  const file = await generator(dist, module);
  return outputFile(resolve(file.path), file.content, { encoding: "utf8" });
};
