type Shape = { code: string; x: number; y: number; w: number; h: number };

type LabelPosition = { x: number; y: number; fontSize: number };

export type SlotLabelLayout = {
  horizontal: boolean;
  number: LabelPosition;
  status: LabelPosition;
};

/** 根据车位方向和文字长度计算文字中心，防止字框越界或互相覆盖。 */
export function getSlotLabelLayout(
  shape: Shape,
  statusText: string,
): SlotLabelLayout {
  if (shape.w > shape.h) {
    const fontSize = Math.min(
      45,
      shape.h * 0.5,
      ((shape.w / 3 - 8) * 2) / (0.6 * (shape.code.length + statusText.length)),
    );
    return {
      horizontal: true,
      number: {
        x: shape.x + shape.w / 3,
        y: shape.y + shape.h / 2,
        fontSize,
      },
      status: {
        x: shape.x + (shape.w * 2) / 3,
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
      fontSize: Math.min(
        60,
        shape.h * 0.26,
        (shape.w - 16) / (shape.code.length * 0.6),
      ),
    },
    status: {
      x: shape.x + shape.w / 2,
      y: shape.y + shape.h * 0.72,
      fontSize: Math.min(
        42,
        shape.h * 0.24,
        (shape.w - 16) / (statusText.length * 0.6),
      ),
    },
  };
}
