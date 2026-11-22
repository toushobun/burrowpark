import "server-only";

import { createRequestContainer } from "internal/container";
import { createServerRequestDependencies } from "internal/shared/context/createServerRequestDependencies";
import { parseRecordsFilter } from "../../schema";
import { getBusinessDate, getBusinessDateTime } from "../../util/parkingDomain";

export async function loadRecords(
  params: {
    date?: unknown;
    plate?: unknown;
    mode?: unknown;
    leaseBy?: unknown;
    leaseQuery?: unknown;
  },
  now = new Date(),
) {
  const filter = parseRecordsFilter(params, now);
  const dependencies = await createServerRequestDependencies();
  const records =
    await createRequestContainer(dependencies).parking.getRecords(filter);
  const date = filter.kind === "date" ? filter.date : getBusinessDate(now);
  const midnight = Date.parse(getBusinessDateTime(date, 0));
  const previousDate = getBusinessDate(new Date(midnight - 86400000));
  const nextDate = getBusinessDate(new Date(midnight + 86400000));
  return {
    filter,
    records,
    previousDate,
    nextDate: nextDate <= getBusinessDate(now) ? nextDate : null,
  };
}
