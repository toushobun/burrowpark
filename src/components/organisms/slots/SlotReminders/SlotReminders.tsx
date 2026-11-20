import ButtonBase from "@mui/material/ButtonBase";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import { SlotStatusBadge } from "atoms/slots/SlotStatusBadge/SlotStatusBadge";
import { slotRemindersText } from "config/slotRemindersText";
import type { SlotReminder } from "internal/parking";
import { designTokens } from "theme/designTokens";

export function SlotReminders({ reminders }: { reminders: SlotReminder[] }) {
  return (
    <Stack component="section" spacing={2}>
      <Typography component="h2" variant="h2">
        {slotRemindersText.title}
      </Typography>
      {reminders.length === 0 ? (
        <Paper variant="outlined" sx={{ borderRadius: `${designTokens.radius.lg}px`, p: 2 }}>
          <Typography variant="body1">{slotRemindersText.empty}</Typography>
        </Paper>
      ) : reminders.map((reminder) => (
        <Paper key={reminder.code} variant="outlined"
          sx={{ borderRadius: `${designTokens.radius.lg}px`, overflow: "hidden" }}>
          <ButtonBase component={Link} href={`/slots/${reminder.code}`}
            sx={{ display: "flex", minHeight: designTokens.size.touchTargetMin,
              textAlign: "left", width: "100%", p: 2 }}>
            <Stack spacing={1} sx={{ alignItems: "flex-start", width: "100%" }}>
              <Stack direction="row" spacing={1.5}
                sx={{ alignItems: "center", flexWrap: "wrap" }} useFlexGap>
                <Typography variant="h3">{reminder.name}</Typography>
                <SlotStatusBadge status={reminder.status} />
              </Stack>
              <Typography variant="body1">{reminder.displayName}</Typography>
              <Typography variant="body1" color="textSecondary">
                {reminder.description}
              </Typography>
            </Stack>
          </ButtonBase>
        </Paper>
      ))}
    </Stack>
  );
}
