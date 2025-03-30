export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  dialect?: 'postgres' | 'mysql' | 'sqlite';
  ssl?: boolean;
  pool?: {
    max?: number;
    min?: number;
    idle?: number;
    acquire?: number;
  };
  logging?: boolean;
}

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  connectTimeout?: number;
  tls?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface ModelDefinition {
  name: string;
  attributes: Record<string, ModelAttributeDefinition>;
  options?: ModelOptions;
}

export interface ModelAttributeDefinition {
  type: string;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  allowNull?: boolean;
  unique?: boolean;
  defaultValue?: any;
  references?: {
    model: string;
    key: string;
  };
}

export interface ModelOptions {
  timestamps?: boolean;
  paranoid?: boolean;
  underscored?: boolean;
  tableName?: string;
  indexes?: Array<{
    fields: string[];
    unique?: boolean;
    name?: string;
  }>;
}

export interface QueryOptions {
  where?: Record<string, any>;
  attributes?: string[];
  include?: string[] | Array<Record<string, any>>;
  order?: [string, 'ASC' | 'DESC'][];
  limit?: number;
  offset?: number;
  transaction?: any;
}

export interface CacheOptions {
  ttl?: number;
  skipCache?: boolean;
}

export interface DataAnalysisOptions {
  groupBy?: string[];
  aggregations?: Record<string, 'sum' | 'avg' | 'min' | 'max' | 'count'>;
  filters?: Record<string, any>;
  sortBy?: Record<string, 'asc' | 'desc'>;
  limit?: number;
}

export interface Migration {
  name: string;
  up: (queryInterface: any) => Promise<void>;
  down: (queryInterface: any) => Promise<void>;
}
