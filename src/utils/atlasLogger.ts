/**
 * ATLAS Unified Logging System
 * Consolidates all ATLAS/balancing related logging with levels and filtering
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 'weight' | 'formation' | 'optimization' | 'validation' | 'progression' | 'general';

interface LogConfig {
  enabled: boolean;
  levels: LogLevel[];
  categories: LogCategory[];
  showTimestamps: boolean;
  maxMessages: number;
}

class AtlasLogger {
  private config: LogConfig = {
    enabled: true,
    levels: ['info', 'warn', 'error'], // Default: hide debug logs
    categories: ['formation', 'optimization', 'validation'],
    showTimestamps: false,
    maxMessages: 100
  };

  private messageCount = 0;

  /**
   * Configure logging behavior
   */
  configure(newConfig: Partial<LogConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.messageCount = 0;
  }

  /**
   * Enable verbose logging (all levels and categories)
   */
  enableVerbose() {
    this.configure({
      levels: ['debug', 'info', 'warn', 'error'],
      categories: ['weight', 'formation', 'optimization', 'validation', 'progression', 'general']
    });
  }

  /**
   * Enable only critical logging
   */
  enableCriticalOnly() {
    this.configure({
      levels: ['error'],
      categories: ['validation']
    });
  }

  /**
   * Reset message counter
   */
  reset() {
    this.messageCount = 0;
  }

  private shouldLog(level: LogLevel, category: LogCategory): boolean {
    if (!this.config.enabled) return false;
    if (this.messageCount >= this.config.maxMessages) return false;
    if (!this.config.levels.includes(level)) return false;
    if (!this.config.categories.includes(category)) return false;
    return true;
  }

  private formatMessage(level: LogLevel, category: LogCategory, message: string, data?: any): string {
    const icons = {
      debug: '🔍',
      info: '🏛️',
      warn: '⚠️',
      error: '🚨'
    };

    const categoryLabels = {
      weight: 'WEIGHT',
      formation: 'FORMATION',
      optimization: 'OPTIMIZATION', 
      validation: 'VALIDATION',
      progression: 'PROGRESSION',
      general: 'ATLAS'
    };

    const timestamp = this.config.showTimestamps ? `[${new Date().toLocaleTimeString()}] ` : '';
    const icon = icons[level];
    const categoryLabel = categoryLabels[category];
    
    return `${timestamp}${icon} ATLAS ${categoryLabel}: ${message}`;
  }

  private log(level: LogLevel, category: LogCategory, message: string, data?: any) {
    if (!this.shouldLog(level, category)) return;

    this.messageCount++;
    const formattedMessage = this.formatMessage(level, category, message, data);

    switch (level) {
      case 'debug':
      case 'info':
        console.log(formattedMessage, data || '');
        break;
      case 'warn':
        console.warn(formattedMessage, data || '');
        break;
      case 'error':
        console.error(formattedMessage, data || '');
        break;
    }
  }

  // Weight calculation logging
  weightCalculated(username: string, points: number, source: string) {
    this.log('debug', 'weight', `${username}: ${points}pts (${source})`);
  }

  weightCacheHit(username: string) {
    this.log('debug', 'weight', `Cache hit for ${username}`);
  }

  weightCalculationFailed(username: string, error: any) {
    this.log('error', 'weight', `Weight calculation failed for ${username}`, error);
  }

  // Team formation logging
  formationStarted(playerCount: number, teamCount: number, teamSize: number) {
    this.log('info', 'formation', `Starting formation: ${playerCount} players → ${teamCount} teams (max ${teamSize} each)`);
  }

  captainAssigned(username: string, points: number, teamIndex: number) {
    this.log('info', 'formation', `Captain ${username} (${points}pts) → Team ${teamIndex + 1}`);
  }

  playerAssigned(username: string, points: number, teamIndex: number, reasoning: string) {
    this.log('debug', 'formation', `${username} (${points}pts) → Team ${teamIndex + 1}: ${reasoning}`);
  }

  formationComplete(teams: any[][], pointDifference: number) {
    const teamSummary = teams.map((team, i) => 
      `T${i+1}=${team.reduce((sum, p) => sum + (p.evidenceWeight || p.adaptiveWeight || 0), 0)}pts`
    ).join(', ');
    this.log('info', 'formation', `Formation complete: ${teamSummary} (diff: ${pointDifference}pts)`);
  }

  // Optimization logging
  optimizationStarted(algorithm: string, playerCount: number) {
    this.log('info', 'optimization', `${algorithm} optimization: ${playerCount} players`);
  }

  combinationsEvaluated(count: number, bestScore: number) {
    this.log('debug', 'optimization', `Evaluated ${count} combinations, best score: ${bestScore.toFixed(2)}`);
  }

  optimizationComplete(finalScore: number, eliteDistribution: number[]) {
    this.log('info', 'optimization', `Complete: score ${finalScore.toFixed(2)}, elite distribution: [${eliteDistribution.join(', ')}]`);
  }

  // Validation logging
  validationStarted(teamCount: number) {
    this.log('info', 'validation', `Starting validation for ${teamCount} teams`);
  }

  constraintViolation(type: string, details: string) {
    this.log('error', 'validation', `${type} violation: ${details}`);
  }

  capacityError(username: string, teamSizes: number[], teamSize: number) {
    this.log('error', 'validation', `Cannot assign ${username} - all teams at capacity (${teamSizes} vs max ${teamSize})`);
  }

  radiantViolation(violations: any[]) {
    this.log('warn', 'validation', `Radiant distribution violations detected`, violations);
  }

  validationComplete(isValid: boolean, violations: number) {
    this.log('info', 'validation', `Validation ${isValid ? 'passed' : 'failed'}: ${violations} violations`);
  }

  // Progression logging
  progressUpdate(percentage: number, stage: string) {
    this.log('debug', 'progression', `${Math.round(percentage * 100)}% - ${stage}`);
  }

  // General logging
  info(message: string, data?: any) {
    this.log('info', 'general', message, data);
  }

  debug(message: string, data?: any) {
    this.log('debug', 'general', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', 'general', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', 'general', message, data);
  }
}

// Export singleton instance
export const atlasLogger = new AtlasLogger();

// Convenience functions for easy migration
export const logAtlasWeight = atlasLogger.weightCalculated.bind(atlasLogger);
export const logAtlasFormation = atlasLogger.playerAssigned.bind(atlasLogger);
export const logAtlasOptimization = atlasLogger.optimizationStarted.bind(atlasLogger);
export const logAtlasValidation = atlasLogger.validationStarted.bind(atlasLogger);
export const logAtlasError = atlasLogger.error.bind(atlasLogger);