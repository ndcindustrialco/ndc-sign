interface Props {
  searchParams: Promise<{ declined?: string; doc?: string }>
}

export default async function SignDonePage({ searchParams }: Props) {
  const { declined } = await searchParams
  const isDeclined = declined === "1"

  return (
    <div
      className="flex min-h-full flex-col items-center justify-center px-4 py-16"
      style={{ background: "var(--secondary, #F1F3F5)" }}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-10 text-center shadow-sm"
        style={{ border: `1px solid ${isDeclined ? "#FECACA" : "#BBF7D0"}` }}
      >
        {/* Icon */}
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: isDeclined ? "#FEE2E2" : "#DCFCE7" }}
        >
          {isDeclined ? (
            <svg className="h-8 w-8" style={{ color: "var(--danger, #DC3545)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-8 w-8" style={{ color: "var(--success, #198754)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        <h1
          className="mt-5 text-2xl font-bold"
          style={{ color: isDeclined ? "var(--danger, #DC3545)" : "var(--foreground, #212529)" }}
        >
          {isDeclined ? "ปฏิเสธการลงนาม Signing Declined" : "ลงนามสำเร็จ Signed Successfully"}
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--accent, #ADB5BD)" }}>
          {isDeclined
            ? "คุณปฏิเสธการลงนามเอกสารนี้ เจ้าของเอกสารได้รับแจ้งแล้ว"
            : "ลงนามเรียบร้อย ปิดหน้านี้ได้เลย Your signature has been submitted."}
        </p>

        {!isDeclined && (
          <div
            className="mx-auto mt-6 flex max-w-xs items-center gap-2 rounded-lg px-4 py-2.5 text-sm"
            style={{ background: "var(--secondary, #F1F3F5)", color: "var(--accent, #ADB5BD)" }}
          >
            <svg className="h-4 w-4 shrink-0" style={{ color: "var(--success, #198754)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            รักษาความปลอดภัยโดย NDC Industrial eSign
          </div>
        )}
      </div>
    </div>
  )
}
