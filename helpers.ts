import { plural, singular } from "pluralize";
import { capitalizeFirstLetter } from "./utilities";
import { AttributeInterface, ModuleInterface } from "./types";

const schemasAttributesBuilder = (attribute: AttributeInterface, { modulesNames }: { modulesNames: string[] }) => {
  let type = modulesNames.includes(attribute.type)
    ? `${singular(attribute.type).toLocaleLowerCase()}Schema`
    : `z.${attribute.type.toLocaleLowerCase()}()`;

  if (attribute.type === "object" && attribute.attributes) {
    type = `z.object({ ${attribute.attributes
      .map(attribute => schemasAttributesBuilder(attribute, { modulesNames }))
      .join(", ")} })`;
  }
  if (attribute.enum) type = `z.enum(enums.${capitalizeFirstLetter(plural(attribute.name))})`;

  if (!attribute.required) type = `${type}.optional()`;
  if (attribute.isArray) type = `${type}.array()`;

  return `${attribute.name}: ${type}`;
};

export const schemasBuilder = (modules: ModuleInterface[], { authModule }: { authModule?: ModuleInterface }) => {
  const modulesNames = modules.reduce(
    (acc: string[], model) =>
      model.singularName && model.pluralName ? acc.concat([model.singularName, model.pluralName]) : acc,
    []
  );

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
      return `export const ${singularName?.toLocaleLowerCase()}Schema = z.object({ ${attributes
        .map(attribute => schemasAttributesBuilder(attribute, { modulesNames }))
        .join(", ")} });`;
    })
    .join("\n\n");
};
