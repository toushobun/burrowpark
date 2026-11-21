import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import IconButton from "@mui/material/IconButton";
import Link from "next/link";
import { designTokens } from "theme/designTokens";
import Stack from "@mui/material/Stack";
import { slotMapText } from "config/slotMapText";
import { loadReminders } from "internal/parking/adapter/next/loadReminders";
import { ReminderRefresh } from "organisms/slots/SlotReminders/ReminderRefresh";
import { SlotReminders } from "organisms/slots/SlotReminders/SlotReminders";
import { loadSlotMap } from "internal/parking/adapter/next/loadSlotMap";
import { ParkingSlotMap } from "organisms/slots/ParkingSlotMap/ParkingSlotMap";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default async function HomePage() {
  const now = new Date();
  const [slots, reminders] = await Promise.all([
    loadSlotMap(now),
    loadReminders(now),
  ]);

  return (
    <PageShell
      subtitle={slotMapText.subtitle}
      title={slotMapText.title}
      headerAction={
        <IconButton
          component={Link}
          href="/settings"
          aria-label="设置"
          sx={{
            minHeight: designTokens.size.touchTargetMin,
            minWidth: designTokens.size.touchTargetMin,
          }}
        >
          <SettingsOutlinedIcon />
        </IconButton>
      }
    >
      <Stack spacing={3}>
        <ReminderRefresh />
        <SlotReminders reminders={reminders} />
        <ParkingSlotMap slots={slots} />
      </Stack>
    </PageShell>
  );
}
