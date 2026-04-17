/**
 * Represents a single color with hex and name
 */
export class ColorPreset {
  readonly hex: string;
  readonly name: string;

  constructor(hex: string, name: string) {
    if (!this.isValidHex(hex)) {
      throw new Error(`Invalid hex color: ${hex}`);
    }
    this.hex = hex.toUpperCase();
    this.name = name;
  }

  private isValidHex(hex: string): boolean {
    return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
  }

  equals(other: ColorPreset): boolean {
    return this.hex === other.hex && this.name === other.name;
  }
}

/**
 * Represents a color palette with a name and collection of colors
 */
export class ColorPalette {
  readonly name: string;
  readonly colors: ColorPreset[];

  constructor(name: string, colors: ColorPreset[]) {
    if (colors.length === 0) {
      throw new Error("Palette must contain at least one color");
    }
    this.name = name;
    this.colors = [...colors];
  }

  getColorByName(name: string): ColorPreset | undefined {
    return this.colors.find((c) => c.name === name);
  }

  getColorByHex(hex: string): ColorPreset | undefined {
    const normalizedHex = hex.toUpperCase();
    return this.colors.find((c) => c.hex === normalizedHex);
  }
}

/**
 * Preset color palettes for v2.2.0
 */
export const PRESET_PALETTES = {
  warm: new ColorPalette("Warm", [
    new ColorPreset("#FFA500", "Orange"),
    new ColorPreset("#FFD700", "Amber"),
    new ColorPreset("#FFF8DC", "Warm White"),
    new ColorPreset("#FF8C00", "Dark Orange"),
    new ColorPreset("#FFDAB9", "Peach"),
  ]),
  cool: new ColorPalette("Cool", [
    new ColorPreset("#87CEEB", "Sky Blue"),
    new ColorPreset("#00CED1", "Cyan"),
    new ColorPreset("#00BFFF", "Deep Sky Blue"),
    new ColorPreset("#E0FFFF", "Cool White"),
    new ColorPreset("#0000FF", "Blue"),
  ]),
  pastel: new ColorPalette("Pastel", [
    new ColorPreset("#FFB3BA", "Pastel Pink"),
    new ColorPreset("#FFDFBA", "Pastel Peach"),
    new ColorPreset("#FFFFBA", "Pastel Yellow"),
    new ColorPreset("#BAE1FF", "Pastel Blue"),
    new ColorPreset("#BAE1BA", "Pastel Green"),
  ]),
  vivid: new ColorPalette("Vivid", [
    new ColorPreset("#FF0000", "Red"),
    new ColorPreset("#00FF00", "Green"),
    new ColorPreset("#0000FF", "Blue"),
    new ColorPreset("#FFFF00", "Yellow"),
    new ColorPreset("#FF00FF", "Magenta"),
  ]),
};
