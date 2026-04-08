import { signIn } from "@/lib/auth"

export default function LoginPage() {
  return (
    <div
      className="flex min-h-full flex-col items-center justify-center px-4 py-16"
      style={{ background: "var(--secondary, #F1F3F5)" }}
    >
      {/* Brand mark */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: "var(--primary, #0F1059)" }}
        >
          <svg viewBox="0 0 20 20" className="h-6 w-6 fill-white" aria-hidden>
            <polygon points="4,2 16,2 18,10 16,18 4,18 2,10" />
          </svg>
        </div>
        <span className="text-lg font-bold uppercase tracking-widest" style={{ color: "var(--primary, #0F1059)" }}>
          eSign
        </span>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm"
        style={{ border: "1px solid var(--border, #E5E7EB)" }}
      >
        <h1 className="mb-1 text-xl font-bold" style={{ color: "var(--foreground, #212529)" }}>
          Sign in
        </h1>
        <p className="mb-6 text-sm" style={{ color: "var(--accent, #ADB5BD)" }}>
          Use your organization account to continue.
        </p>
        <form
          action={async () => {
            "use server"
            await signIn("microsoft-entra-id", { redirectTo: "/dashboard" })
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "#0078d4" }}
          >
            <svg width="18" height="18" viewBox="0 0 21 21" fill="none" aria-hidden>
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            Sign in with Microsoft
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs" style={{ color: "var(--accent, #ADB5BD)" }}>
        NDC Industrial · E-Signature Platform
      </p>
    </div>
  )
}
