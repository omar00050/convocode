export interface ColorPalette {
  name: string;
  colors: string[];
}

export const PRESET_PALETTES: ColorPalette[] = [
  {
    name: "Material Design",
    colors: [
      "#F44336", "#E91E63", "#9C27B0", "#673AB7", "#3F51B5", "#2196F3",
      "#03A9F4", "#00BCD4", "#009688", "#4CAF50", "#8BC34A", "#CDDC39",
      "#FFEB3B", "#FFC107", "#FF9800", "#FF5722", "#795548", "#9E9E9E",
      "#607D8B", "#000000", "#FFFFFF",
    ],
  },
  {
    name: "Tailwind CSS",
    colors: [
      "#EF4444", "#F97316", "#EAB308", "#22C55E", "#10B981", "#14B8A6",
      "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7", "#EC4899",
      "#F43F5E", "#64748B", "#6B7280", "#374151", "#111827", "#FFFFFF",
    ],
  },
  {
    name: "Pastel",
    colors: [
      "#FFB3BA", "#FFDFBA", "#FFFFBA", "#BAFFC9", "#BAE1FF", "#E8BAFF",
      "#FFB3DE", "#B3FFF5", "#FFC8B3", "#B3D9FF", "#D4FFB3", "#FFB3B3",
      "#F5E6FF", "#E6FFE6", "#FFE6E6", "#E6F5FF", "#FFF5E6", "#F5FFE6",
    ],
  },
  {
    name: "Earth Tones",
    colors: [
      "#8B4513", "#A0522D", "#CD853F", "#DEB887", "#D2B48C", "#F4A460",
      "#BC8A5F", "#8B6914", "#6B4226", "#4A3728", "#2C1810", "#7B5234",
      "#9E6B3F", "#C4956A", "#E8C5A0", "#5C4033", "#3E2723", "#795548",
    ],
  },
  {
    name: "Neon",
    colors: [
      "#FF00FF", "#00FFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00",
      "#FF6600", "#FF0099", "#00FF99", "#9900FF", "#FF00CC", "#00CCFF",
      "#CCFF00", "#FF3300", "#00FF33", "#3300FF", "#FF33CC", "#33CCFF",
    ],
  },
  {
    name: "Monochrome",
    colors: [
      "#000000", "#111111", "#222222", "#333333", "#444444", "#555555",
      "#666666", "#777777", "#888888", "#999999", "#AAAAAA", "#BBBBBB",
      "#CCCCCC", "#DDDDDD", "#EEEEEE", "#F5F5F5", "#FAFAFA", "#FFFFFF",
    ],
  },
  {
    name: "Ocean",
    colors: [
      "#001F5B", "#003B8E", "#0055C4", "#0077FF", "#2196F3", "#4FC3F7",
      "#80DEEA", "#B2EBF2", "#E0F7FA", "#006994", "#0288D1", "#29B6F6",
      "#81D4FA", "#00BCD4", "#4DD0E1", "#26C6DA", "#00ACC1", "#0097A7",
    ],
  },
  {
    name: "Sunset",
    colors: [
      "#FF6B35", "#F7931E", "#FFD700", "#FF4500", "#FF6347", "#FF7F50",
      "#FFA07A", "#FFB347", "#FFDAB9", "#FF8C00", "#FF69B4", "#FF1493",
      "#C71585", "#FF0066", "#FF3366", "#FF6699", "#FFCCCC", "#FFF0E6",
    ],
  },
];
