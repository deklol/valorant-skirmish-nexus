/**
 * Debug utility for controlled logging
 * Only shows logs in development or when explicitly enabled
 */

export const DEBUG_CONFIG = {
  enabled: process.env.NODE_ENV === 'development',
  categories: {
    tournament: true,
    balancing: true,
    auth: true,
    match: true,
    admin: true,
    performance: false
  }
};

export function debugLog(category: keyof typeof DEBUG_CONFIG.categories, message: string, data?: any) {
  if (!DEBUG_CONFIG.enabled || !DEBUG_CONFIG.categories[category]) {
    return;
  }
  
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = `[${timestamp}] [${category.toUpperCase()}]`;
  
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export function debugError(category: keyof typeof DEBUG_CONFIG.categories, message: string, error: any) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = `[${timestamp}] [${category.toUpperCase()}] ERROR:`;
  console.error(`${prefix} ${message}`, error);
}

export function debugPerformance(operation: string, fn: () => any) {
  if (!DEBUG_CONFIG.categories.performance) {
    return fn();
  }
  
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  debugLog('performance', `${operation} took ${(end - start).toFixed(2)}ms`);
  return result;
}