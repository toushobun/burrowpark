type Shape = { code: string; x: number; y: number; w: number; h: number };

type LabelPosition = { x: number; y: number; fontSize: number };

export type SlotLabelLayout = {
  horizontal: boolean;
  number: LabelPosition;
  status: LabelPosition;
};

/** 中文字约占一个字宽，英文数字约占 0.6。 */
function textWidthUnits(value: string) {
  return Array.from(value).reduce(
    (width, character) => width + (character.charCodeAt(0) < 128 ? 0.6 : 1),
    0,
  );
}

/** 新版总览所有车位统一上下排，按格子尺寸限制字框。 */
export function getSlotLabelLayout(
  shape: Shape,
  statusText: string,
): SlotLabelLayout {
  return {
    horizontal: false,
    number: {
      x: shape.x + shape.w / 2,
      y: shape.y + shape.h * 0.28,
      fontSize: Math.min(
        86,
        shape.h * 0.4,
        (shape.w - 12) / textWidthUnits(shape.code),
      ),
    },
    status: {
      x: shape.x + shape.w / 2,
      y: shape.y + shape.h * 0.73,
      fontSize: Math.min(
        66,
        shape.h * 0.34,
        (shape.w - 12) / textWidthUnits(statusText),
      ),
    },
  };
}
