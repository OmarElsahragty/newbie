import { plural, singular } from "pluralize";
import { capitalizeFirstLetter } from "./utilities";
import { AttributeInterface, ModuleInterface } from "./types";

export const setModulesRef = (modules: ModuleInterface[]) => {
  const modulesNames = modules.reduce(
    (acc: string[], model) =>
      model.singularName && model.pluralName ? acc.concat([model.singularName, model.pluralName]) : acc,
    []
  );

  return modules.map(module => {
    return {
      ...module,
      attributes: module.attributes.map(attribute => ({
        ...attribute,
        isRef: modulesNames.includes(attribute.type),
      })),
    };
  });
};

const schemasAttributesBuilder = (attribute: AttributeInterface) => {
  let type = attribute.isRef ? `${singular(attribute.type)}Schema` : `z.${attribute.type}()`;

  if (attribute.enum) type = `z.enum(enums.${capitalizeFirstLetter(plural(attribute.name))})`;
  if (attribute.type === "object" && attribute.attributes) {
    type = `z.object({ ${attribute.attributes.map(attribute => schemasAttributesBuilder(attribute)).join(", ")} })`;
  }

  if (!attribute.required) type = `${type}.optional()`;
  if (attribute.isArray) type = `${type}.array()`;

  return `${attribute.name}: ${type}`;
};

export const schemasBuilder = (modules: ModuleInterface[], { authModule }: { authModule?: ModuleInterface }) => {
  return modules
    .map(({ attributes, ...module }) => ({
      ...module,
      attributes:
        authModule && authModule.singularName === module.singularName
          ? attributes.filter(
              attribute =>
                authModule?.auth &&
                authModule.auth.identifier !== attribute.name &&
                authModule.auth.password !== attribute.name
            )
          : attributes,
    }))
    .map(({ singularName, attributes }) => {
      return `export const ${singularName}Schema = z.object({ ${attributes
        .map(attribute => schemasAttributesBuilder(attribute))
        .join(", ")} });`;
    })
    .join("\n\n");
};
