export const operationText = {
  undo: "撤销",
  close: "关闭提示",
  undone: "已撤销",
  returning: "正在返回地图…",
  photoUploadFailed: "照片没传上去，车已登记",
  checkedIn: (slotName: string, plate: string) =>
    "已登记 " + slotName + " " + plate,
  reserved: (slotName: string, guestName: string | null) =>
    "已预留 " +
    slotName +
    (guestName?.trim() ? "（" + guestName.trim() + "）" : ""),
  leased: (slotName: string, tenantName: string) =>
    slotName + "已设为长租（" + tenantName + "）",
} as const;
