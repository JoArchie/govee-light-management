import {
  ColorPalette,
  ColorPreset,
  PRESET_PALETTES,
} from "../value-objects/ColorPalette";

/**
 * Domain service for managing color palettes and recent colors
 */
export class ColorPaletteService {
  private recentColors: ColorPreset[] = [];
  private readonly maxRecentColors = 10;

  /**
   * Get all preset color palettes
   */
  getPresetPalettes(): ColorPalette[] {
    return [
      PRESET_PALETTES.warm,
      PRESET_PALETTES.cool,
      PRESET_PALETTES.pastel,
      PRESET_PALETTES.vivid,
    ];
  }

  /**
   * Get a specific preset palette by name
   */
  getPresetPalette(name: string): ColorPalette | undefined {
    return this.getPresetPalettes().find((p) => p.name === name);
  }

  /**
   * Add a color to recent colors (most recent first)
   * Duplicates are moved to the front instead of being added again
   */
  addRecentColor(color: ColorPreset): void {
    if (!this.isValidHexColor(color.hex)) {
      throw new Error(`Invalid hex color: ${color.hex}`);
    }

    const normalizedHex = color.hex.toUpperCase();

    // Remove if already exists
    this.recentColors = this.recentColors.filter(
      (c) => c.hex !== normalizedHex,
    );

    // Add to front
    this.recentColors.unshift(new ColorPreset(normalizedHex, color.name));

    // Limit to max
    if (this.recentColors.length > this.maxRecentColors) {
      this.recentColors = this.recentColors.slice(0, this.maxRecentColors);
    }
  }

  /**
   * Get recent colors (most recent first)
   */
  getRecentColors(): ColorPreset[] {
    return [...this.recentColors];
  }

  /**
   * Clear all recent colors
   */
  clearRecentColors(): void {
    this.recentColors = [];
  }

  /**
   * Load recent colors from persistent storage (bulk restore)
   */
  loadRecentColors(colors: Array<{ hex: string; name: string }>): void {
    this.recentColors = colors
      .filter((c) => this.isValidHexColor(c.hex))
      .slice(0, this.maxRecentColors)
      .map((c) => new ColorPreset(c.hex, c.name));
  }

  /**
   * Export recent colors for persistence
   */
  exportRecentColors(): Array<{ hex: string; name: string }> {
    return this.recentColors.map((c) => ({ hex: c.hex, name: c.name }));
  }

  /**
   * Check if a hex color string is valid
   */
  isValidHexColor(hex: string): boolean {
    return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
  }

  /**
   * Normalize hex color to uppercase with # prefix
   */
  normalizeHex(hex: string): string {
    if (!this.isValidHexColor(hex)) {
      throw new Error(`Invalid hex color: ${hex}`);
    }
    const normalized = hex.toUpperCase();
    return normalized.startsWith("#") ? normalized : `#${normalized}`;
  }
}
