import { AccessCodeLoginForm } from "organisms/auth/AccessCodeLoginForm/AccessCodeLoginForm";
import { loginWithAccessCode } from "internal/auth/adapter/next/loginWithAccessCode";
import { commonText } from "config/commonText";
import { authMessages } from "internal/auth";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default function LoginPage() {
  return (
    <PageShell subtitle={authMessages.subtitle} title={commonText.appName}>
      <AccessCodeLoginForm action={loginWithAccessCode} />
    </PageShell>
  );
}
