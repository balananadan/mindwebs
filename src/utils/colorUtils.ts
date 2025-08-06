import { ColorRule } from '@/store/useMapStore';

/**
 * Apply color rules to a numeric value
 */
export function applyColorRules(value: number, rules: ColorRule[]): string {
  // Sort rules by priority (most specific first)
  const sortedRules = [...rules].sort((a, b) => {
    // Equality rules have highest priority
    if (a.operator === '=' && b.operator !== '=') return -1;
    if (b.operator === '=' && a.operator !== '=') return 1;
    
    // Then by value (higher values first for >, >=, lower values first for <, <=)
    if (a.operator === '>' || a.operator === '>=') {
      return b.value - a.value;
    }
    if (a.operator === '<' || a.operator === '<=') {
      return a.value - b.value;
    }
    
    return 0;
  });

  // Find the first matching rule
  for (const rule of sortedRules) {
    if (matchesRule(value, rule)) {
      return rule.color;
    }
  }

  // Default color if no rule matches
  return '#cccccc';
}

/**
 * Check if a value matches a color rule
 */
export function matchesRule(value: number, rule: ColorRule): boolean {
  switch (rule.operator) {
    case '=':
      return Math.abs(value - rule.value) < 0.01; // Use small epsilon for float comparison
    case '<':
      return value < rule.value;
    case '>':
      return value > rule.value;
    case '<=':
      return value <= rule.value;
    case '>=':
      return value >= rule.value;
    default:
      return false;
  }
}

/**
 * Get a preview of color mapping for a range of values
 */
export function getColorPreview(rules: ColorRule[], min: number, max: number, steps: number = 10): Array<{ value: number; color: string }> {
  const preview: Array<{ value: number; color: string }> = [];
  const step = (max - min) / (steps - 1);
  
  for (let i = 0; i < steps; i++) {
    const value = min + (step * i);
    const color = applyColorRules(value, rules);
    preview.push({ value, color });
  }
  
  return preview;
}

/**
 * Validate color rules for consistency
 */
export function validateColorRules(rules: ColorRule[]): string[] {
  const errors: string[] = [];
  
  // Check for duplicate equality rules
  const equalityRules = rules.filter(rule => rule.operator === '=');
  const equalityValues = new Set();
  
  equalityRules.forEach(rule => {
    if (equalityValues.has(rule.value)) {
      errors.push(`Duplicate equality rule for value ${rule.value}`);
    }
    equalityValues.add(rule.value);
  });
  
  // Check for conflicting range rules
  const rangeRules = rules.filter(rule => rule.operator !== '=');
  rangeRules.forEach((rule1, i) => {
    rangeRules.slice(i + 1).forEach(rule2 => {
      if (hasRuleConflict(rule1, rule2)) {
        errors.push(`Conflicting rules: ${rule1.operator} ${rule1.value} and ${rule2.operator} ${rule2.value}`);
      }
    });
  });
  
  return errors;
}

/**
 * Check if two rules conflict (cover overlapping ranges)
 */
function hasRuleConflict(rule1: ColorRule, rule2: ColorRule): boolean {
  // This is a simplified conflict detection
  // In practice, you might want more sophisticated logic
  if (rule1.operator === rule2.operator && rule1.value === rule2.value) {
    return true;
  }
  
  return false;
}

/**
 * Generate a set of default color rules for temperature
 */
export function generateDefaultTemperatureRules(): ColorRule[] {
  return [
    { id: 'temp-1', operator: '<', value: 0, color: '#0066cc' },   // Blue for freezing
    { id: 'temp-2', operator: '>=', value: 0, color: '#00cc66' },  // Green for mild
    { id: 'temp-3', operator: '>=', value: 20, color: '#ffcc00' }, // Yellow for warm
    { id: 'temp-4', operator: '>=', value: 30, color: '#ff6600' }, // Orange for hot
    { id: 'temp-5', operator: '>=', value: 40, color: '#cc0000' }, // Red for extreme
  ];
}

/**
 * Interpolate between two colors
 */
export function interpolateColor(color1: string, color2: string, factor: number): string {
  // Simple linear interpolation between two hex colors
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  
  if (!c1 || !c2) return color1;
  
  const r = Math.round(c1.r + (c2.r - c1.r) * factor);
  const g = Math.round(c1.g + (c2.g - c1.g) * factor);
  const b = Math.round(c1.b + (c2.b - c1.b) * factor);
  
  return rgbToHex(r, g, b);
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}