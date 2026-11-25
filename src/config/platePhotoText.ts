export const platePhotoText = {
  takePhoto: "拍照",
  retakePhoto: "重拍",
  removePhoto: "删除照片",
  loadingModels: {
    checkin: "首次识别需下载组件（约 23 MB），有照片即可登记，无需等待识别。",
    lease: "首次识别需下载组件（约 23 MB），也可直接手动填写车牌。",
  },
  recognizing: "正在识别车牌…",
  recognized: "已自动填入，请核对",
  recognitionFailed: {
    checkin: "没认出来，可直接使用照片登记",
    lease: "没认出来，可手动填写车牌",
  },
  recognitionSuggestion: (plate: string) => `识别结果：${plate}，点这里填入`,
  photoPreview: "车头照片",
} as const;
