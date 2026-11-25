import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/login-form";
import { AUTH_LOCALE } from "@/lib/auth-labels";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ confirmed?: string }>;
}) {
  const { confirmed } = await searchParams;
  const t = await getTranslations({ locale: AUTH_LOCALE, namespace: "Auth" });

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-4">
        {confirmed === "1" && (
          <p role="status" className="rounded-lg border bg-card p-3 text-sm text-card-foreground">
            {t("confirmedNotice")}
          </p>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
