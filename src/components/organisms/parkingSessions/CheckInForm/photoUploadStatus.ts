/** 没有选择照片时，服务端的 photoSaved=false 不代表上传失败。 */
export function photoUploadFailed(
  submittedPhoto: Blob | null,
  photoSaved: boolean,
): boolean {
  return submittedPhoto !== null && !photoSaved;
}
