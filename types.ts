export interface AttributeInterface {
  name: string;
  type: string;
  unique?: boolean;
  required?: boolean;
  default?: string;
  enum?: string[];
  isArray?: boolean;
  attributes?: AttributeInterface[];
  isRef?: boolean;
}

export interface ModuleInterface {
  singularName?: string;
  pluralName?: string;
  attributes: AttributeInterface[];
  auth?: { identifier: string; password: string };
}
