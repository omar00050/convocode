/**
 * Custom SVG path utilities for the pen tool.
 * Handles parsing, serializing, bounding box, and point manipulation of SVG path data.
 * Supports only absolute commands: M, L, C, Z.
 */

/**
 * A single SVG path command with its numeric values.
 */
export interface PathCommand {
  type: "M" | "L" | "C" | "Z";
  values: number[]; // M: [x,y], L: [x,y], C: [cp1x,cp1y,cp2x,cp2y,x,y], Z: []
}

/**
 * Axis-aligned bounding box of a path.
 */
export interface PathBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A draggable point extracted from path commands for editing.
 */
export interface EditablePoint {
  x: number;
  y: number;
  type: "anchor" | "controlIn" | "controlOut";
  commandIndex: number; // index in PathCommand[]
  valueIndex: number;   // index within the command's values array (x value; y = valueIndex+1)
}

/**
 * Parses an SVG path data string into PathCommand[].
 * Supports absolute M, L, C, Z commands.
 */
export function svgPathToCommands(pathData: string): PathCommand[] {
  if (!pathData) return [];

  const commands: PathCommand[] = [];
  // Match command letters followed by numbers
  const tokenPattern = /([MLCZmlcz])([\s,]*[-+]?[\d.]+(?:e[-+]?\d+)?[\s,]*[-+]?[\d.]+(?:[\s,]*[-+]?[\d.]+(?:e[-+]?\d+)?)*)?/gi;
  let match;

  while ((match = tokenPattern.exec(pathData)) !== null) {
    const cmdLetter = match[1].toUpperCase() as PathCommand["type"];
    const valStr = match[2] ?? "";
    const values = valStr
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number)
      .filter((n) => !isNaN(n));

    if (cmdLetter === "Z") {
      commands.push({ type: "Z", values: [] });
    } else if (cmdLetter === "M" || cmdLetter === "L" || cmdLetter === "C") {
      commands.push({ type: cmdLetter, values });
    }
  }

  return commands;
}

/**
 * Serializes PathCommand[] back to an SVG path data string.
 */
export function commandsToSvgPath(commands: PathCommand[]): string {
  return commands
    .map((cmd) => {
      if (cmd.type === "Z") return "Z";
      return `${cmd.type} ${cmd.values.map((v) => Math.round(v * 100) / 100).join(" ")}`;
    })
    .join(" ");
}

/**
 * Computes a conservative bounding box of a path by examining all coordinate values.
 * For cubic bezier curves, includes control points in bbox (conservative estimate).
 */
export function computePathBoundingBox(commands: PathCommand[]): PathBoundingBox {
  const xs: number[] = [];
  const ys: number[] = [];

  for (const cmd of commands) {
    if (cmd.type === "Z") continue;
    // All values are x,y pairs
    for (let i = 0; i < cmd.values.length - 1; i += 2) {
      xs.push(cmd.values[i]);
      ys.push(cmd.values[i + 1]);
    }
  }

  if (xs.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

/**
 * Scales all coordinate values in path commands by scaleX and scaleY.
 * Returns a new array (immutable).
 */
export function scalePathCommands(
  commands: PathCommand[],
  scaleX: number,
  scaleY: number
): PathCommand[] {
  return commands.map((cmd) => {
    if (cmd.type === "Z") return { ...cmd };
    const newValues = cmd.values.map((v, i) => (i % 2 === 0 ? v * scaleX : v * scaleY));
    return { ...cmd, values: newValues };
  });
}

/**
 * Translates all coordinates in path commands by dx, dy.
 * Returns a new array (immutable).
 */
export function translatePathCommands(
  commands: PathCommand[],
  dx: number,
  dy: number
): PathCommand[] {
  return commands.map((cmd) => {
    if (cmd.type === "Z") return { ...cmd };
    const newValues = cmd.values.map((v, i) => (i % 2 === 0 ? v + dx : v + dy));
    return { ...cmd, values: newValues };
  });
}

/**
 * Extracts all draggable EditablePoints from commands.
 * M and L commands produce anchor points.
 * C commands produce: controlIn (cp1), controlOut (cp2), anchor (endpoint).
 */
export function getPointsFromPath(commands: PathCommand[]): EditablePoint[] {
  const points: EditablePoint[] = [];

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    if (cmd.type === "M" || cmd.type === "L") {
      points.push({
        x: cmd.values[0],
        y: cmd.values[1],
        type: "anchor",
        commandIndex: i,
        valueIndex: 0,
      });
    } else if (cmd.type === "C") {
      // cp1 (control in)
      points.push({
        x: cmd.values[0],
        y: cmd.values[1],
        type: "controlIn",
        commandIndex: i,
        valueIndex: 0,
      });
      // cp2 (control out)
      points.push({
        x: cmd.values[2],
        y: cmd.values[3],
        type: "controlOut",
        commandIndex: i,
        valueIndex: 2,
      });
      // endpoint anchor
      points.push({
        x: cmd.values[4],
        y: cmd.values[5],
        type: "anchor",
        commandIndex: i,
        valueIndex: 4,
      });
    }
  }

  return points;
}

/**
 * Returns new PathCommand[] with a single point coordinate updated.
 * Immutable — returns a new array.
 */
export function updatePointInPath(
  commands: PathCommand[],
  commandIndex: number,
  valueIndex: number,
  newX: number,
  newY: number
): PathCommand[] {
  return commands.map((cmd, i) => {
    if (i !== commandIndex) return cmd;
    const newValues = [...cmd.values];
    newValues[valueIndex] = newX;
    newValues[valueIndex + 1] = newY;
    return { ...cmd, values: newValues };
  });
}

/**
 * Inserts a new L (line-to) command after the given command index.
 * Returns new array (immutable).
 */
export function addPointToPath(
  commands: PathCommand[],
  afterIndex: number,
  x: number,
  y: number
): PathCommand[] {
  const newCmd: PathCommand = { type: "L", values: [x, y] };
  const result = [...commands];
  result.splice(afterIndex + 1, 0, newCmd);
  return result;
}

/**
 * Removes the command at the given index and reconnects the path.
 * If the removed command is M (first), the next command becomes M.
 * Returns new array (immutable).
 */
export function removePointFromPath(
  commands: PathCommand[],
  commandIndex: number
): PathCommand[] {
  if (commands.length <= 1) return commands;
  const result = commands.filter((_, i) => i !== commandIndex);
  // Ensure first non-Z command is M
  if (result.length > 0 && result[0].type !== "M") {
    result[0] = { ...result[0], type: "M" };
  }
  return result;
}
