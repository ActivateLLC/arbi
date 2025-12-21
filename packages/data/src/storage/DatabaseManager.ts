import { Sequelize, Model, DataTypes, ModelCtor } from 'sequelize';

import type {
  DatabaseConfig,
  ModelDefinition,
  QueryOptions,
} from '../types';

export class DatabaseManager {
  private sequelize: Sequelize;
  private models: Map<string, ModelCtor<Model>>;

  constructor(config: DatabaseConfig) {
    // Support both URL-based and config-based initialization
    if ((config as any).url) {
      // URL-based connection (e.g., from Railway's DATABASE_URL)
      this.sequelize = new Sequelize((config as any).url, {
        dialect: config.dialect || 'postgres',
        logging: config.logging ? console.log : false,
        dialectOptions: (config as any).dialectOptions || {
          ssl: config.ssl ? {
            require: true,
            rejectUnauthorized: false,
          } : undefined,
        },
        pool: {
          max: config.pool?.max || 5,
          min: config.pool?.min || 0,
          idle: config.pool?.idle || 10000,
          acquire: config.pool?.acquire || 30000,
        },
      });
    } else {
      // Individual config parameters
      this.sequelize = new Sequelize({
        host: config.host,
        port: config.port,
        database: config.database,
        username: config.username,
        password: config.password,
        dialect: config.dialect || 'postgres',
        logging: config.logging ? console.log : false,
        dialectOptions: {
          ssl: config.ssl ? {
            require: true,
            rejectUnauthorized: false,
          } : undefined,
        },
        pool: {
          max: config.pool?.max || 5,
          min: config.pool?.min || 0,
          idle: config.pool?.idle || 10000,
          acquire: config.pool?.acquire || 30000,
        },
      });
    }

    this.models = new Map();
  }

  /**
   * Connect to the database
   */
  public async connect(): Promise<void> {
    try {
      await this.sequelize.authenticate();
      console.log('Database connection has been established successfully.');
    } catch (error) {
      console.error('Unable to connect to the database:', error);
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  public async disconnect(): Promise<void> {
    await this.sequelize.close();
    console.log('Database connection closed.');
  }

  /**
   * Define a model
   */
  public defineModel(modelDef: ModelDefinition): ModelCtor<Model> {
    if (this.models.has(modelDef.name)) {
      return this.models.get(modelDef.name)!;
    }

    // Convert attribute definitions to Sequelize format
    const attributes: Record<string, any> = {};
    
    for (const [name, def] of Object.entries(modelDef.attributes)) {
      let type;
      
      // Map string type names to Sequelize types
      switch (def.type.toLowerCase()) {
        case 'string':
          type = DataTypes.STRING;
          break;
        case 'text':
          type = DataTypes.TEXT;
          break;
        case 'integer':
          type = DataTypes.INTEGER;
          break;
        case 'float':
          type = DataTypes.FLOAT;
          break;
        case 'double':
          type = DataTypes.DOUBLE;
          break;
        case 'decimal':
          type = DataTypes.DECIMAL;
          break;
        case 'boolean':
          type = DataTypes.BOOLEAN;
          break;
        case 'date':
          type = DataTypes.DATE;
          break;
        case 'json':
          type = DataTypes.JSON;
          break;
        case 'uuid':
          type = DataTypes.UUID;
          break;
        default:
          type = DataTypes.STRING;
      }

      // Handle special default values
      let defaultValue = def.defaultValue;
      if (defaultValue === 'uuid_generate_v4()' || defaultValue === 'UUIDV4') {
        defaultValue = DataTypes.UUIDV4;
      } else if (defaultValue === 'NOW()' || defaultValue === 'CURRENT_TIMESTAMP') {
        defaultValue = DataTypes.NOW;
      }

      attributes[name] = {
        type,
        primaryKey: def.primaryKey || false,
        autoIncrement: def.autoIncrement || false,
        allowNull: def.allowNull !== undefined ? def.allowNull : true,
        unique: def.unique || false,
        defaultValue: defaultValue,
        references: def.references,
      };
    }

    // Define model with Sequelize
    const model = this.sequelize.define(
      modelDef.name,
      attributes,
      modelDef.options
    );

    this.models.set(modelDef.name, model);
    return model;
  }

  /**
   * Get a model by name
   */
  public getModel(name: string): ModelCtor<Model> {
    const model = this.models.get(name);
    if (!model) {
      throw new Error(`Model ${name} does not exist`);
    }
    return model;
  }

  /**
   * Sync models to the database
   */
  public async syncModels(force = false): Promise<void> {
    await this.sequelize.sync({ force });
    console.log('Models synchronized with the database.');
  }

  /**
   * Run a database transaction
   */
  public async transaction<T>(
    callback: (transaction: any) => Promise<T>
  ): Promise<T> {
    const transaction = await this.sequelize.transaction();
    
    try {
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Create a new record
   */
  public async create(
    modelName: string,
    data: Record<string, any>,
    options: { transaction?: any } = {}
  ): Promise<any> {
    const model = this.getModel(modelName);
    const instance = await model.create(data, options);
    return instance.toJSON();
  }

  /**
   * Find records
   */
  public async find(
    modelName: string,
    options: QueryOptions = {}
  ): Promise<any[]> {
    const model = this.getModel(modelName);
    
    const instances = await model.findAll({
      where: options.where,
      attributes: options.attributes,
      include: options.include,
      order: options.order,
      limit: options.limit,
      offset: options.offset,
      transaction: options.transaction,
    });
    
    return instances.map(instance => instance.toJSON());
  }

  /**
   * Find a single record
   */
  public async findOne(
    modelName: string,
    options: QueryOptions = {}
  ): Promise<any | null> {
    const model = this.getModel(modelName);
    
    const instance = await model.findOne({
      where: options.where,
      attributes: options.attributes,
      include: options.include,
      order: options.order,
      transaction: options.transaction,
    });
    
    return instance ? instance.toJSON() : null;
  }

  /**
   * Update records
   */
  public async update(
    modelName: string,
    data: Record<string, any>,
    options: QueryOptions = {}
  ): Promise<number> {
    const model = this.getModel(modelName);
    
    const [affectedCount] = await model.update(data, {
      where: options.where,
      transaction: options.transaction,
    });
    
    return affectedCount;
  }

  /**
   * Delete records
   */
  public async delete(
    modelName: string,
    options: QueryOptions = {}
  ): Promise<number> {
    const model = this.getModel(modelName);
    
    const affectedCount = await model.destroy({
      where: options.where,
      transaction: options.transaction,
    });
    
    return affectedCount;
  }

  /**
   * Run a raw SQL query
   */
  public async query(
    sql: string,
    options: { replacements?: Record<string, any>; type?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'; transaction?: any } = {}
  ): Promise<any> {
    return this.sequelize.query(sql, {
      replacements: options.replacements,
      type: options.type,
      transaction: options.transaction,
    });
  }

  /**
   * Access the Sequelize instance directly
   */
  public getSequelize(): Sequelize {
    return this.sequelize;
  }
}
