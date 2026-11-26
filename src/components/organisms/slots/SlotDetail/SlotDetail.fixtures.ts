import type { SlotDetail as SlotDetailData } from "internal/parking";

import type { SlotDetailDisplay } from "./SlotDetail";

export const detailDisplay: SlotDetailDisplay = {
  enteredAt: "11月19日 10:00",
  paidUntil: "11月19日 12:00",
  elapsed: "2 小时 15 分",
  borrowUntil: "12:30",
  leasePaidUntil: "11月30日",
};

export const emptyDetail: SlotDetailData = {
  code: "7",
  name: "7号",
  kind: "regular",
  isActive: true,
  status: "empty",
  presentVehicle: null,
  reservation: null,
  lease: null,
};

export const hotelExpiringDetail: SlotDetailData = {
  ...emptyDetail,
  status: "expiringSoon",
  presentVehicle: {
    plate: "粤B12345",
    billingType: "hotel_daily",
    enteredAt: "2026-11-19T02:00:00.000Z",
    paidUntil: "2026-11-19T04:00:00.000Z",
    borrowUntil: null,
    photoUrl: null,
  },
};

export const hourlyDetail: SlotDetailData = {
  ...hotelExpiringDetail,
  status: "occupied",
  presentVehicle: {
    ...hotelExpiringDetail.presentVehicle!,
    billingType: "hourly",
    paidUntil: null,
  },
};

export const leaseAwayDetail: SlotDetailData = {
  ...emptyDetail,
  status: "leaseAway",
  lease: {
    id: "00000000-0000-4000-8000-000000000006",
    plate: "粤B00111",
    startsOn: "2026-11-01",
    note: "夜市长期",
    recentPayments: [
      {
        id: "payment-1",
        paidAt: "2026-11-01T04:00:00.000Z",
        amountCents: 10000,
        method: "cash",
      },
    ],
    tenantName: "王先生",
    phone: "13800000000",
    paidUntil: "2026-11-30T04:00:00.000Z",
  },
};

export const privateBorrowedDetail: SlotDetailData = {
  ...hourlyDetail,
  kind: "private",
  status: "privateBorrowed",
  presentVehicle: {
    ...hourlyDetail.presentVehicle!,
    sessionId: "00000000-0000-4000-8000-000000000005",
    borrowUntil: "2026-11-19T04:30:00.000Z",
  },
};
