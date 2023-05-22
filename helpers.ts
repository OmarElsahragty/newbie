import { camelCase } from "camel-case";
import { plural, singular } from "pluralize";
import { camelPascalCase } from "./utilities";
import { AttributeInterface, ModuleInterface } from "./types";

const setAttributesRef = (attributes: AttributeInterface[], modulesNames: string[]): AttributeInterface[] => {
  return attributes.map(attribute => ({
    ...attribute,
    isRef: modulesNames.includes(attribute.type),
    attributes: attribute.attributes ? setAttributesRef(attribute.attributes, modulesNames) : undefined,
  }));
};

export const setModulesRef = (modules: ModuleInterface[]) => {
  const modulesNames = modules.reduce(
    (acc: string[], model) =>
      model.singularName && model.pluralName ? acc.concat([model.singularName, model.pluralName]) : acc,
    []
  );

  return modules.map(module => ({ ...module, attributes: setAttributesRef(module.attributes, modulesNames) }));
};

const zodAttributesBuilder = (attribute: AttributeInterface) => {
  let type = attribute.isRef ? `${singular(attribute.type)}Schema` : `z.${attribute.type}()`;

  if (attribute.enum) type = `z.enum(enums.${camelPascalCase(plural(attribute.name))})`;
  if (attribute.type === "object" && attribute.attributes) {
    type = `z.object({ ${attribute.attributes.map(attribute => zodAttributesBuilder(attribute)).join(", ")} })`;
  }

  if (!attribute.required) type = `${type}.optional()`;
  if (attribute.array) type = `${type}.array()`;

  return `${attribute.name}: ${type}`;
};

export const zodBuilder = (modules: ModuleInterface[]) => {
  return modules
    .map(({ attributes, ...module }) => ({
      ...module,
      attributes:
        module.auth?.identifier && module.auth.password
          ? attributes.filter(
              attribute =>
                module?.auth && module.auth.identifier !== attribute.name && module.auth.password !== attribute.name
            )
          : attributes,
    }))
    .map(module => {
      const isAuthModule = module.auth?.identifier && module.auth.password;

      return `export const ${module.singularName}Schema = ${
        isAuthModule ? "authSchema.merge(" : ""
      }z.object({ ${module.attributes.map(attribute => zodAttributesBuilder(attribute)).join(", ")} })${
        isAuthModule ? ")" : ""
      };`;
    })
    .join("\n\n");
};

export const mongooseAttributesBuilder = (attributes: AttributeInterface[]) => {
  return attributes
    .map(attribute => {
      let type = `${attribute.isRef ? "Schema.Types.ObjectId" : camelPascalCase(attribute.type)}`;
      if (attribute.type === "object" && attribute.attributes) {
        type = `new Schema({ ${mongooseAttributesBuilder(attribute.attributes)} },
        { _id: true, versionKey: false, timestamps: true }
        )`;
      }
      if (attribute.type === "string") type = `${type}, trim: true`;
      if (attribute.array) type = `[ ${type} ]`;

      let unique = attribute.unique ? "unique: true" : "";
      if (attribute.unique && !attribute.required) unique = `${unique}, sparse: true`;

      return `${camelCase(attribute.name)}:  { ${[
        `type: ${type}`,
        unique,
        attribute.required ? "required: true" : "",
        attribute.default ? `default: ${JSON.stringify(attribute.default)}` : "",
        attribute.isRef ? `ref: schemas.${camelCase(singular(attribute.type))}` : "",
        attribute.enum ? `enum: ${camelPascalCase(plural(attribute.name))}` : "",
      ]
        .filter(item => item)
        .join(", ")} }`;
    })
    .join(",\n");
};
