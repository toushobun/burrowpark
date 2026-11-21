import { getBusinessMonth } from "./parkingDomain";

/** 图片只按登记当刻的上海业务月份归档，不取服务器本地月份。 */
export function buildPlatePhotoPath(now: Date, sessionId: string): string {
  return getBusinessMonth(now).replace("-", "/") + "/" + sessionId + ".jpg";
}
