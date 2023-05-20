export interface AttributeInterface {
  name: string;
  type: string;
  unique?: boolean;
  required?: boolean;
  hash?: boolean;
  default?: string;
  enum?: string[];
  isArray?: boolean;
  attributes?: AttributeInterface[];
}

export interface ModuleInterface {
  singularName?: string;
  pluralName?: string;
  attributes: AttributeInterface[];
  auth?: { identifier: string; password: string };
}
