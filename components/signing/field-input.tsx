"use client";

import SignaturePad from "./signature-pad";
import type { FieldType } from "@/lib/actions/field";

interface FieldInputProps {
  fieldId: string;
  type: FieldType;
  label: string | null;
  required: boolean;
  value: string | null;
  options?: string[];
  onChange: (fieldId: string, value: string | null) => void;
  error?: boolean;
  savedSignature?: string | null;
  saveChecked?: boolean;
  onSaveChange?: (save: boolean) => void;
}

const TYPE_LABEL: Record<FieldType, string> = {
  SIGNATURE: "ลายเซ็น Signature",
  INITIALS: "ชื่อย่อ Initials",
  TEXT: "ข้อความ Text",
  DATE: "วันที่ Date",
  NUMBER: "ตัวเลข Number",
  IMAGE: "รูปภาพ Image",
  CHECKBOX: "กล่องเลือก Checkbox",
  RADIO: "ตัวเลือก Multiple Choice",
  SELECT: "เลือก Select",
  FILE: "อัปโหลดไฟล์ File Upload",
  STAMP: "ตรา Stamp",
  PHONE: "โทรศัพท์ Phone",
  CELLS: "ช่อง Cells",
};

const TYPE_BADGE: Record<FieldType, string> = {
  SIGNATURE: "✍️",
  INITIALS: "AA",
  TEXT: "T",
  DATE: "📅",
  NUMBER: "#",
  IMAGE: "🖼",
  CHECKBOX: "☑",
  RADIO: "◉",
  SELECT: "▼",
  FILE: "📎",
  STAMP: "🔏",
  PHONE: "📞",
  CELLS: "▦",
};

export default function FieldInput({
  fieldId,
  type,
  label,
  required,
  value,
  options = [],
  onChange,
  error,
  savedSignature,
  saveChecked,
  onSaveChange,
}: FieldInputProps) {
  const displayLabel = label ?? TYPE_LABEL[type];

  return (
    <div
      className={`rounded-xl border p-4 transition ${error ? "border-red-400 bg-red-50" : "border-zinc-200 bg-white max-w-lg"}`}
    >
      <p className="mb-2 text-sm font-medium text-zinc-700">
        {displayLabel}
        {required && <span className="ml-1 text-red-500">*</span>}
        <span className="ml-2 text-xs font-normal text-zinc-400">
          {TYPE_BADGE[type]}
        </span>
      </p>

      {/* Signature / Initials */}
      {(type === "SIGNATURE" || type === "INITIALS") && (
        <SignaturePad
          value={value}
          onChange={(v) => onChange(fieldId, v)}
          savedSignature={type === "SIGNATURE" ? savedSignature : null}
          saveChecked={saveChecked}
          onSaveChange={type === "SIGNATURE" ? onSaveChange : undefined}
        />
      )}

      {/* Text / Phone */}
      {(type === "TEXT" || type === "PHONE") && (
        <input
          type={type === "PHONE" ? "tel" : "text"}
          value={value ?? ""}
          onChange={(e) => onChange(fieldId, e.target.value || null)}
          placeholder={type === "PHONE" ? "+66 8x-xxxx-xxxx" : "พิมพ์ที่นี่ Type here…"}
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
        />
      )}

      {/* Number */}
      {type === "NUMBER" && (
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(fieldId, e.target.value || null)}
          placeholder="0"
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
        />
      )}

      {/* Cells — individual character boxes */}
      {type === "CELLS" && (
        <div className="flex gap-1">
          {Array.from(
            { length: Math.max(6, (value ?? "").length + 1) },
            (_, i) => (
              <input
                key={i}
                type="text"
                maxLength={1}
                value={(value ?? "")[i] ?? ""}
                onChange={(e) => {
                  const chars = (value ?? "").split("");
                  chars[i] = e.target.value;
                  onChange(fieldId, chars.join("") || null);
                }}
                className="h-10 w-8 rounded border border-zinc-300 bg-zinc-50 text-center text-sm outline-none focus:ring-2 focus:ring-zinc-900"
              />
            ),
          )}
        </div>
      )}

      {/* Date */}
      {type === "DATE" && (
        <input
          type="date"
          value={value ?? ""}
          onChange={(e) => onChange(fieldId, e.target.value || null)}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
        />
      )}

      {/* Checkbox */}
      {type === "CHECKBOX" && (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={value === "true"}
            onChange={(e) =>
              onChange(fieldId, e.target.checked ? "true" : null)
            }
            className="h-4 w-4 rounded border-zinc-300"
          />
          <span>{displayLabel}</span>
        </label>
      )}

      {/* Radio — multiple choice (single select from options) */}
      {type === "RADIO" && (
        <div className="flex flex-col gap-2">
          {(options.length > 0 ? options : ["Option 1", "Option 2"]).map(
            (opt) => (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700"
              >
                <input
                  type="radio"
                  name={fieldId}
                  value={opt}
                  checked={value === opt}
                  onChange={() => onChange(fieldId, opt)}
                  className="h-4 w-4"
                />
                <span>{opt}</span>
              </label>
            ),
          )}
        </div>
      )}

      {/* Select dropdown */}
      {type === "SELECT" && (
        <select
          value={value ?? ""}
          onChange={(e) => onChange(fieldId, e.target.value || null)}
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
        >
          <option value="">เลือก Select…</option>
          {(options.length > 0 ? options : []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}

      {/* Image upload */}
      {type === "IMAGE" && (
        <div className="flex flex-col gap-2">
          {value ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Uploaded"
                className="max-h-40 rounded-lg border border-zinc-200 object-contain"
              />
              <button
                type="button"
                onClick={() => onChange(fieldId, null)}
                className="mt-1 text-xs text-red-500 hover:text-red-700"
              >
                ลบ Remove
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 py-6 text-sm text-zinc-500 hover:border-zinc-400">
              <svg
                className="h-8 w-8 text-zinc-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 5.75 5.75 0 011.344 11.095H6.75z"
                />
              </svg>
              <span>คลิกอัปโหลดรูป Click to upload image</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () =>
                    onChange(fieldId, reader.result as string);
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          )}
        </div>
      )}

      {/* File upload */}
      {type === "FILE" && (
        <div className="flex flex-col gap-2">
          {value ? (
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 p-3">
              <svg
                className="h-5 w-5 text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                />
              </svg>
              <span className="flex-1 truncate text-sm text-zinc-600">
                แนบไฟล์แล้ว File attached
              </span>
              <button
                type="button"
                onClick={() => onChange(fieldId, null)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                ลบ Remove
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 py-6 text-sm text-zinc-500 hover:border-zinc-400">
              <svg
                className="h-8 w-8 text-zinc-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 5.75 5.75 0 011.344 11.095H6.75z"
                />
              </svg>
              <span>คลิกอัปโหลดไฟล์ Click to upload file</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () =>
                    onChange(fieldId, reader.result as string);
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          )}
        </div>
      )}

      {/* Stamp */}
      {type === "STAMP" && (
        <SignaturePad
          value={value}
          onChange={(v) => onChange(fieldId, v)}
          savedSignature={null}
        />
      )}

      {error && (
        <p className="mt-1 text-xs text-red-500">ต้องกรอกฟิลด์นี้ This field is required</p>
      )}
    </div>
  );
}
