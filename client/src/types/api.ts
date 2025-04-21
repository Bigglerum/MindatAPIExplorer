export interface OpenAPIDocument {
  openapi: string;
  info: APIInfo;
  servers: APIServer[];
  paths: Record<string, PathItem>;
  components?: Components;
}

export interface APIInfo {
  title: string;
  description?: string;
  version: string;
  contact?: APIContact;
}

export interface APIContact {
  name?: string;
  url?: string;
  email?: string;
}

export interface APIServer {
  url: string;
  description?: string;
}

export interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  patch?: Operation;
  options?: Operation;
  summary?: string;
  description?: string;
}

export interface Operation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses?: Record<string, Response>;
  deprecated?: boolean;
}

export interface Parameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  description?: string;
  required?: boolean;
  schema?: Schema;
  example?: any;
}

export interface RequestBody {
  description?: string;
  content: Record<string, MediaType>;
  required?: boolean;
}

export interface MediaType {
  schema?: Schema;
  example?: any;
}

export interface Response {
  description: string;
  content?: Record<string, MediaType>;
}

export interface Schema {
  type?: string;
  format?: string;
  title?: string;
  description?: string;
  default?: any;
  multipleOf?: number;
  maximum?: number;
  minimum?: number;
  pattern?: string;
  items?: Schema;
  enum?: any[];
  properties?: Record<string, Schema>;
  required?: string[];
  allOf?: Schema[];
  oneOf?: Schema[];
  anyOf?: Schema[];
  $ref?: string;
}

export interface Components {
  schemas?: Record<string, Schema>;
  responses?: Record<string, Response>;
  parameters?: Record<string, Parameter>;
  requestBodies?: Record<string, RequestBody>;
  securitySchemes?: Record<string, SecurityScheme>;
}

export interface SecurityScheme {
  type: string;
  description?: string;
  name?: string;
  in?: string;
  scheme?: string;
  bearerFormat?: string;
  flows?: OAuthFlows;
}

export interface OAuthFlows {
  implicit?: OAuthFlow;
  password?: OAuthFlow;
  clientCredentials?: OAuthFlow;
  authorizationCode?: OAuthFlow;
}

export interface OAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export interface APICategory {
  id: number;
  name: string;
  description?: string;
  endpoints: APIEndpoint[];
}

export interface APIEndpoint {
  id: number;
  path: string;
  method: string;
  summary?: string;
  description?: string;
  parameters?: Parameter[];
  responses?: Record<string, Response>;
  categoryId?: number;
}

export interface APIResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  duration: number;
}

export interface APIRequest {
  endpoint: APIEndpoint;
  parameters: Record<string, any>;
}

export interface CodeSample {
  language: string;
  code: string;
}

export interface LanguageOption {
  id: string;
  name: string;
}

export interface SavedRequest {
  id: number;
  name: string;
  endpointId: number;
  endpoint?: APIEndpoint;
  parameters: Record<string, any>;
  userId: number;
  createdAt: string;
}
