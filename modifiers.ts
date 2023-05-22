import { join } from "path";
import { plural } from "pluralize";
import { readFile } from "fs-extra";
import { camelPascalCase, writePartialModule } from "./utilities";
import { postmanCollectionBuilder } from "./helpers";
import { ModuleInterface } from "./types";

const constantsModifier = async (dist: string, modules: ModuleInterface[]) => {
  const path = join(dist, "constants", "index.ts");
  const file = (await readFile(path, "utf8")).trim();

  const content = file.replaceAll(
    "$$$ schemas constants $$$",
    modules.map(({ singularName, pluralName }) => `${singularName}: "${pluralName}"`).join(",\n")
  );

  return { path, content };
};

const typesModifier = async (dist: string, modules: ModuleInterface[]) => {
  const path = join(dist, "src", "types", "types.ts");
  const file = (await readFile(path, "utf8")).trim();

  const authModule = modules.find(({ auth }) => auth?.identifier && auth?.password);

  const content = `
  ${file.replaceAll(
    "$$$ request client interface $$$",
    !authModule?.singularName
      ? ""
      : `declare module "express-serve-static-core" {
      interface Request {
        client?: ${camelPascalCase(authModule.singularName)}Interface;
      }
    }`
  )}
    \n\n${modules
      .map(
        ({ singularName }) =>
          `export interface ${camelPascalCase(
            singularName
          )}Interface extends EntityInformationInterface, z.infer<typeof schemas.${singularName}Schema> {};`
      )
      .join("\n")}`;

  return { path, content };
};

const enumsModifier = async (dist: string, modules: ModuleInterface[]) => {
  const path = join(dist, "src", "types", "enums.ts");
  const file = (await readFile(path, "utf8")).trim();

  const authModule = modules.find(({ auth }) => auth?.identifier && auth?.password);

  const content = `
  ${file.replaceAll(
    "$$$ auth AccessTypeEnum $$$",
    !authModule
      ? ""
      : `export const AccessTypes = ["ADMIN", "APPROVED", "DENIED"] as const;
    export type AccessTypesEnum = (typeof AccessTypes)[number];`
  )}\n\n
    ${modules
      .reduce((acc: string[], module) => {
        return acc.concat(
          module.attributes.map(attribute => {
            if (!attribute.enum?.length) return "";

            return `export const ${camelPascalCase(plural(attribute.name))} = [${attribute.enum.map(value =>
              JSON.stringify(value)
            )}] as const;
            export type ${camelPascalCase(attribute.name)}Enum = (typeof ${camelPascalCase(
              plural(attribute.name)
            )})[number];`;
          })
        );
      }, [])
      .filter(item => item)
      .join("\n\n")}`;

  return { path, content };
};

const routesIndexModifier = async (dist: string, modules: ModuleInterface[]) => {
  const path = join(dist, "src", "routes", "index.ts");
  const file = (await readFile(path, "utf8")).trim();

  const authModule = modules.find(({ auth }) => auth?.identifier && auth?.password);

  const content = file
    .replaceAll(
      "$$$ import routes $$$",
      modules.map(({ singularName }) => `import ${singularName}Routes from "./${singularName}.routes";`).join("\n")
    )
    .replaceAll(
      "$$$ use routes $$$",
      modules.map(({ singularName }) => (singularName ? `router.use(${singularName}Routes);` : "")).join("\n")
    )
    .replaceAll("$$$ validate middleware $$$", authModule ? "validateMiddleware," : "")
    .replaceAll(
      "$$$ import auth controller $$$",
      authModule?.singularName ? `import { ${authModule.singularName}Controller } from "../controllers";` : ""
    )
    .replaceAll(
      "$$$ import auth schema $$$",
      authModule?.singularName ? `import { authSchema, ${authModule.singularName}Schema } from "../types";` : ""
    )
    .replaceAll(
      "$$$ import auth guard $$$",
      authModule?.singularName ? `import { authorizedGuard } from "../guards";` : ""
    )
    .replaceAll("$$$ use auth guard $$$", authModule ? "router.use(authorizedGuard);" : "")
    .replaceAll(
      "$$$ auth routes $$$",
      authModule?.singularName
        ? `
        router.route("/register").post(validateMiddleware(${authModule.singularName}Schema), ${authModule.singularName}Controller.create);
        router.route("/authenticate").post(validateMiddleware(authSchema), ${authModule.singularName}Controller.authenticate);`
        : ""
    );

  return { path, content };
};

const controllersIndexModifier = async (dist: string, modules: ModuleInterface[]) => {
  const path = join(dist, "src", "controllers", "index.ts");
  const file = (await readFile(path, "utf8")).trim();

  const content = `${file}\n\n${modules
    .map(({ singularName }) => `export { default as ${singularName}Controller } from "./${singularName}.controller";`)
    .join("\n")}`;

  return { path, content };
};

const servicesIndexModifier = async (dist: string, modules: ModuleInterface[]) => {
  const path = join(dist, "src", "services", "index.ts");
  const file = (await readFile(path, "utf8")).trim();

  const content = `${file}\n\n${modules
    .map(({ singularName }) => `export { ${singularName}Service } from "./${singularName}.service";`)
    .join("\n")}`;

  return { path, content };
};

const repositoriesIndexModifier = async (dist: string, modules: ModuleInterface[]) => {
  const path = join(dist, "src", "database", "repositories", "index.ts");
  const file = (await readFile(path, "utf8")).trim();

  const content = `${file}\n\n${modules
    .map(({ singularName }) => `export { ${singularName}Repository } from "./${singularName}.repository";`)
    .join("\n")}`;

  return { path, content };
};

const modelsIndexModifier = async (dist: string, modules: ModuleInterface[]) => {
  const path = join(dist, "src", "database", "models", "index.ts");
  const file = (await readFile(path, "utf8")).trim();

  const content = `${file}\n\n${modules
    .map(({ singularName }) => `export { ${singularName}Model } from "./${singularName}.model";`)
    .join("\n")}`;

  return { path, content };
};

const authGuardModifier = async (dist: string, modules: ModuleInterface[]) => {
  const path = join(dist, "src", "guards", "authorization.guard.ts");
  const file = (await readFile(path, "utf8")).trim();

  const authModule = modules.find(({ auth }) => auth?.identifier && auth?.password);

  const content = authModule
    ? file
        .replaceAll("$$$ auth interface $$$", `${camelPascalCase(authModule.singularName)}Interface`)
        .replaceAll("$$$ import auth service $$$", `import { ${authModule.singularName}Service } from "../services";`)
        .replaceAll("$$$ auth service $$$", `${authModule.singularName}Service`)
    : undefined;

  return { path, content };
};

const postmanCollectionModifier = async (dist: string, modules: ModuleInterface[]) => {
  const path = join(dist, "docs", "postman-collection.json");
  const file = (await readFile(path, "utf8")).trim();

  const content = file.replaceAll("$$$ modules routes $$$", postmanCollectionBuilder(modules));

  return { path, content };
};

export default async (distPath: string, modules: ModuleInterface[]) => {
  await Promise.all([
    writePartialModule(distPath, modules, constantsModifier),
    writePartialModule(distPath, modules, enumsModifier),
    writePartialModule(distPath, modules, typesModifier),
    writePartialModule(distPath, modules, routesIndexModifier),
    writePartialModule(distPath, modules, controllersIndexModifier),
    writePartialModule(distPath, modules, servicesIndexModifier),
    writePartialModule(distPath, modules, repositoriesIndexModifier),
    writePartialModule(distPath, modules, modelsIndexModifier),
    writePartialModule(distPath, modules, authGuardModifier),
    writePartialModule(distPath, modules, postmanCollectionModifier),
  ]);
};
