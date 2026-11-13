import { PageLoader } from "@/components/page-loader";

export default function LoginLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center app-mesh">
      <PageLoader label="Preparing sign-in…" />
    </div>
  );
}
