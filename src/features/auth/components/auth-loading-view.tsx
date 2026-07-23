import { TopProgressBar } from "@/components/top-progress-bar";

export function AuthLoadingView() {
  return (
    <div className="fixed inset-0 bg-[#1e1f22]">
      <TopProgressBar label="Signing you in" />
    </div>
  );
}
