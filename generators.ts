import { join } from "path";
import { capitalizeFirstLetter } from "./utilities";
import { ModuleInterface } from "./types";
import { readFile } from "fs-extra";

export const routesGenerator = async (dist: string, module: ModuleInterface) => ({
  path: join(dist, "src", "routes", `${module.singularName}.routes.ts`),
  content: `import { Router } from "express";
import { ${module.singularName}Controller } from "../controllers";
import { validateMiddleware } from "../middleware";
import { ${module.singularName}Schema } from "../types";

const router = Router();

router
  .route("/${module.pluralName}")
  .get(${module.singularName}Controller.list)
  .post(validateMiddleware(${module.singularName}Schema, { isArray: true }), ${module.singularName}Controller.bulkCreate);

router.route("/${module.singularName}.").post(validateMiddleware(${module.singularName}Schema), ${module.singularName}Controller.create);

router
  .route("/${module.singularName}./:id")
  .get(${module.singularName}Controller.get)
  .put(validateMiddleware(${module.singularName}Schema), ${module.singularName}Controller.update)
  .delete(${module.singularName}Controller.delete);

export default router;
`,
});

export const controllerGenerator = async (dist: string, module: ModuleInterface) => ({
  path: join(dist, "/src", "controllers", `/${module.singularName}.controller.ts`),
  content: `import { Request, Response, NextFunction } from "express";
import DefaultController from "./default.controller";
import { ${module.singularName}Service } from "../services";
import { ${capitalizeFirstLetter(module.singularName)}Interface } from "../types";

class ${capitalizeFirstLetter(module.singularName)}Controller extends DefaultController<${capitalizeFirstLetter(
    module.singularName
  )}Interface> {
  constructor() {
    super(${module.singularName}Service);
  }
}

export default new ${capitalizeFirstLetter(module.singularName)}Controller();
`,
});

export const serviceGenerator = async (dist: string, module: ModuleInterface) => ({
  path: join(dist, "src", "services", `${module.singularName}.service.ts`),
  content: `import DefaultRepository from "./default.repository";
import { ${capitalizeFirstLetter(module.singularName)}Interface } from "../../types";
import { ${module.singularName}Model } from "../models";

class ${capitalizeFirstLetter(module.singularName)}Repository extends DefaultRepository<${capitalizeFirstLetter(
    module.singularName
  )}Interface> {
  constructor() {
    super(${module.singularName}Model);
  }
}

export const ${module.singularName}Repository = new ${capitalizeFirstLetter(module.singularName)}Repository();
`,
});

export const repositoryGenerator = async (dist: string, module: ModuleInterface) => ({
  path: join(dist, "src", "repositories", `${module.singularName}.repository.ts`),
  content: `import DefaultRepository from "./default.repository";
import { ${capitalizeFirstLetter(module.singularName)}Interface } from "../../types";
import { ${module.singularName}Model } from "../models";

class ${capitalizeFirstLetter(module.singularName)}Repository extends DefaultRepository<${capitalizeFirstLetter(
    module.singularName
  )}Interface> {
  constructor() {
    super(${module.singularName}Model);
  }
}

export const ${module.singularName}Repository = new ${capitalizeFirstLetter(module.singularName)}Repository();
`,
});

export const modelGenerator = async (dist: string, module: ModuleInterface) => ({
  path: join(dist, "src", "database", "models", `${module.singularName}.model.ts`),
  content: `import { Schema, model } from "mongoose";
import { schemas } from "../../../constants";
import { ${capitalizeFirstLetter(module.singularName)}Interface } from "../../types";

const ${module.singularName}Schema = new Schema<${capitalizeFirstLetter(module.singularName)}Interface>(
  {
    isDeleted: { type: Boolean, default: false, required: false },
  },
  { timestamps: true, versionKey: false }
)
  .index({ isDeleted: 1 });

export const ${module.singularName}Model = model<${capitalizeFirstLetter(module.singularName)}Interface>(schemas.${
    module.singularName
  }, ${module.singularName}Schema);
`,
});

export const typesGenerator = async (dist: string, module: ModuleInterface) => {
  const path = join(dist, "src", "types", "types.ts");
  return { path, content: await readFile(path, "utf8") };
};

export const enumsGenerator = async (dist: string, module: ModuleInterface) => {
  const path = join(dist, "src", "types", "types.ts");
  return { path, content: await readFile(path, "utf8") };
};

export const schemasGenerator = async (dist: string, module: ModuleInterface) => {
  const path = join(dist, "src", "types", "schemas.ts");
  return { path, content: await readFile(path, "utf8") };
};
