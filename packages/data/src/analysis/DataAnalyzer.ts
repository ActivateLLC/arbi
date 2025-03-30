import { DataFrame, Series } from 'pandas-js';

import type { DataAnalysisOptions } from '../types';

export class DataAnalyzer {
  /**
   * Create a DataFrame from data
   */
  public createDataFrame(data: any[]): DataFrame {
    return new DataFrame(data);
  }

  /**
   * Create a Series from data
   */
  public createSeries(data: any[]): Series {
    return new Series(data);
  }

  /**
   * Analyze data using pandas-js
   */
  public analyze(data: any[], options: DataAnalysisOptions = {}): any {
    // Create DataFrame from data
    const df = this.createDataFrame(data);
    
    // Apply filters if specified
    let filteredDf = df;
    
    if (options.filters && Object.keys(options.filters).length > 0) {
      for (const [column, value] of Object.entries(options.filters)) {
        if (Array.isArray(value)) {
          // Handle array of values (IN operator)
          filteredDf = filteredDf.filter((row: any) => value.includes(row[column]));
        } else if (typeof value === 'object' && value !== null) {
          // Handle comparison operators
          const operator = Object.keys(value)[0];
          const compareValue = value[operator];
          
          switch (operator) {
            case 'eq':
              filteredDf = filteredDf.filter((row: any) => row[column] === compareValue);
              break;
            case 'ne':
              filteredDf = filteredDf.filter((row: any) => row[column] !== compareValue);
              break;
            case 'gt':
              filteredDf = filteredDf.filter((row: any) => row[column] > compareValue);
              break;
            case 'gte':
              filteredDf = filteredDf.filter((row: any) => row[column] >= compareValue);
              break;
            case 'lt':
              filteredDf = filteredDf.filter((row: any) => row[column] < compareValue);
              break;
            case 'lte':
              filteredDf = filteredDf.filter((row: any) => row[column] <= compareValue);
              break;
            case 'contains':
              filteredDf = filteredDf.filter(
                (row: any) => typeof row[column] === 'string' && 
                row[column].includes(compareValue)
              );
              break;
          }
        } else {
          // Simple equality filter
          filteredDf = filteredDf.filter((row: any) => row[column] === value);
        }
      }
    }
    
    // Group by columns if specified
    let resultDf = filteredDf;
    
    if (options.groupBy && options.groupBy.length > 0) {
      // Implement group by operation
      const groupedData = this.groupByColumns(
        filteredDf.to_json({ orient: 'records' }),
        options.groupBy,
        options.aggregations || {}
      );
      
      resultDf = this.createDataFrame(groupedData);
    }
    
    // Sort by specified columns
    if (options.sortBy && Object.keys(options.sortBy).length > 0) {
      for (const [column, direction] of Object.entries(options.sortBy)) {
        resultDf = resultDf.sort_values(column, { ascending: direction === 'asc' });
      }
    }
    
    // Apply limit if specified
    if (options.limit && options.limit > 0) {
      resultDf = resultDf.head(options.limit);
    }
    
    // Return records as plain objects
    return resultDf.to_json({ orient: 'records' });
  }

  /**
   * Group data by columns and apply aggregations
   * (Manually implementing group by since pandas-js has limited functionality)
   */
  private groupByColumns(
    data: any[],
    groupByColumns: string[],
    aggregations: Record<string, 'sum' | 'avg' | 'min' | 'max' | 'count'>
  ): any[] {
    // Create a map to hold grouped data
    const groupedMap = new Map<string, any>();
    
    // Group data
    for (const row of data) {
      // Create a key based on group by columns
      const groupKey = groupByColumns.map(col => row[col]).join('|');
      
      if (!groupedMap.has(groupKey)) {
        // Initialize group with groupBy columns
        const group: any = {};
        
        for (const col of groupByColumns) {
          group[col] = row[col];
        }
        
        // Initialize aggregation values
        for (const [field, agg] of Object.entries(aggregations)) {
          if (agg === 'count') {
            group[`${field}_count`] = 0;
          } else {
            group[`${field}_${agg}`] = null;
          }
        }
        
        groupedMap.set(groupKey, group);
      }
      
      const group = groupedMap.get(groupKey);
      
      // Apply aggregations
      for (const [field, agg] of Object.entries(aggregations)) {
        const value = row[field];
        
        if (value === null || value === undefined) {
          continue;
        }
        
        if (typeof value !== 'number' && agg !== 'count') {
          continue; // Only numeric values can be aggregated with sum, avg, min, max
        }
        
        switch (agg) {
          case 'sum':
            group[`${field}_sum`] = (group[`${field}_sum`] || 0) + value;
            break;
          case 'min':
            if (group[`${field}_min`] === null || value < group[`${field}_min`]) {
              group[`${field}_min`] = value;
            }
            break;
          case 'max':
            if (group[`${field}_max`] === null || value > group[`${field}_max`]) {
              group[`${field}_max`] = value;
            }
            break;
          case 'avg':
            // For avg, we need to keep track of sum and count
            if (!group[`${field}_sum_for_avg`]) {
              group[`${field}_sum_for_avg`] = 0;
              group[`${field}_count_for_avg`] = 0;
            }
            group[`${field}_sum_for_avg`] += value;
            group[`${field}_count_for_avg`] += 1;
            group[`${field}_avg`] = group[`${field}_sum_for_avg`] / group[`${field}_count_for_avg`];
            break;
          case 'count':
            group[`${field}_count`] += 1;
            break;
        }
      }
    }
    
    // Convert map back to array
    return Array.from(groupedMap.values()).map(group => {
      // Remove temporary fields used for calculation
      for (const key of Object.keys(group)) {
        if (key.endsWith('_sum_for_avg') || key.endsWith('_count_for_avg')) {
          delete group[key];
        }
      }
      return group;
    });
  }

  /**
   * Calculate descriptive statistics for a dataset
   */
  public describeData(data: any[], columns?: string[]): Record<string, any> {
    const df = this.createDataFrame(data);
    const columnsToDescribe = columns || df.columns;
    const stats: Record<string, any> = {};
    
    for (const column of columnsToDescribe) {
      const series = df.get(column);
      
      // Skip non-numeric columns
      if (!this.isNumericSeries(series)) {
        continue;
      }
      
      // Calculate statistics
      const values = series.values.filter(
        (v: any) => v !== null && v !== undefined && !isNaN(v)
      );
      
      if (values.length === 0) {
        continue;
      }
      
      const sum = values.reduce((a: number, b: number) => a + b, 0);
      const mean = sum / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      // Calculate standard deviation
      const squaredDiffs = values.map((value: number) => Math.pow(value - mean, 2));
      const variance = squaredDiffs.reduce((a: number, b: number) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      // Calculate percentiles
      const sortedValues = [...values].sort((a: number, b: number) => a - b);
      const getPercentile = (p: number) => {
        const index = Math.ceil((p / 100) * sortedValues.length) - 1;
        return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
      };
      
      stats[column] = {
        count: values.length,
        mean,
        std: stdDev,
        min,
        '25%': getPercentile(25),
        '50%': getPercentile(50),
        '75%': getPercentile(75),
        max,
      };
    }
    
    return stats;
  }

  /**
   * Check if a series contains numeric values
   */
  private isNumericSeries(series: Series): boolean {
    const values = series.values;
    
    if (values.length === 0) {
      return false;
    }
    
    return values.some(
      (value: any) => typeof value === 'number' && !isNaN(value)
    );
  }
}
