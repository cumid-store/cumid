export class RequestError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code?: string,
  ) {
    super(message);
  }
}
export function text(
  value: unknown,
  label: string,
  max = 100,
  min = 1,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)
  )
    throw new RequestError(`Please enter a valid ${label}.`);
  return value.trim();
}
export function uuid(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value)
  )
    throw new RequestError("Invalid reference.");
  return value;
}
export function links(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 10)
    throw new RequestError("Use at most 10 links.");
  return value.map((v) => {
    const raw = text(v, "link", 1500);
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      throw new RequestError("Use complete HTTPS links.");
    }
    if (u.protocol !== "https:" || u.username || u.password)
      throw new RequestError("Use complete HTTPS links.");
    return u.href;
  });
}
export function customer(value: any, email: string) {
  const name = text(value?.name, "name");
  const signedName = text(value?.signedName, "signature");
  if (signedName.toLocaleLowerCase() !== name.toLocaleLowerCase())
    throw new RequestError(
      "Type your full name exactly as entered above to accept the terms.",
    );
  const phone = text(value.phone, "phone", 14).replace(/[ +\-]/g, "");
  if (!/^(91)?[6-9]\d{9}$/.test(phone))
    throw new RequestError("Enter a valid Indian mobile number.");
  const a = value.address || {};
  const pincode = text(a.pincode, "PIN code", 6);
  if (!/^[1-9]\d{5}$/.test(pincode))
    throw new RequestError("Enter a six-digit Indian PIN code.");
  return {
    name,
    signedName,
    email,
    phone,
    address: {
      fullName: name,
      phone,
      street: text(a.street, "street address", 250),
      landmark: text(a.landmark || "", "landmark", 150, 0),
      city: text(a.city, "city", 80),
      state: text(a.state, "state", 80),
      pincode,
    },
  };
}
export async function verifyHmac(
  body: string,
  signature: string | null,
  secret: string,
) {
  if (!signature || !secret || !/^[a-f\d]{64}$/i.test(signature)) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    Uint8Array.from(signature.match(/../g)!, (v) => parseInt(v, 16)),
    new TextEncoder().encode(body),
  );
}
