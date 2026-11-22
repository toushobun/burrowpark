type Shape = { code: string; x: number; y: number; w: number; h: number };

type LabelPosition = { x: number; y: number; fontSize: number };

export type SlotLabelLayout = {
  horizontal: boolean;
  number: LabelPosition;
  status: LabelPosition;
};

/** 中文字约占一个字宽，英文数字约占 0.6；不能一律按英文估算。 */
function textWidthUnits(value: string) {
  return Array.from(value).reduce(
    (width, character) => width + (character.charCodeAt(0) < 128 ? 0.6 : 1),
    0,
  );
}

/** 根据车位方向和实际字宽估算文字中心，防止字框越界或互相覆盖。 */
export function getSlotLabelLayout(
  shape: Shape,
  statusText: string,
): SlotLabelLayout {
  const numberUnits = textWidthUnits(shape.code);
  const statusUnits = textWidthUnits(statusText);

  if (shape.w > shape.h) {
    const padding = 8;
    const gap = 8;
    const fontSize = Math.min(
      45,
      shape.h * 0.5,
      (shape.w - padding * 2 - gap) / (numberUnits + statusUnits),
    );
    return {
      horizontal: true,
      number: {
        x: shape.x + padding + (numberUnits * fontSize) / 2,
        y: shape.y + shape.h / 2,
        fontSize,
      },
      status: {
        x: shape.x + shape.w - padding - (statusUnits * fontSize) / 2,
        y: shape.y + shape.h / 2,
        fontSize,
      },
    };
  }

  return {
    horizontal: false,
    number: {
      x: shape.x + shape.w / 2,
      y: shape.y + shape.h * 0.35,
      fontSize: Math.min(60, shape.h * 0.26, (shape.w - 16) / numberUnits),
    },
    status: {
      x: shape.x + shape.w / 2,
      y: shape.y + shape.h * 0.72,
      fontSize: Math.min(42, shape.h * 0.24, (shape.w - 16) / statusUnits),
    },
  };
}
