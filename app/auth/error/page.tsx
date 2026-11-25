import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResendConfirmation } from "@/components/resend-confirmation";
import { parseAuthErrorReason } from "@/lib/domain/auth-errors";
import { AUTH_LOCALE, getResendLabels } from "@/lib/auth-labels";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const reason = parseAuthErrorReason((await searchParams).reason);
  const t = await getTranslations({ locale: AUTH_LOCALE, namespace: "Auth" });
  const labels = await getResendLabels();

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t("errorTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">{t(`errors.${reason}`)}</p>
            <Link href="/auth/login" className="text-sm underline underline-offset-4">
              {t("goToLogin")}
            </Link>
            <ResendConfirmation labels={labels} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
