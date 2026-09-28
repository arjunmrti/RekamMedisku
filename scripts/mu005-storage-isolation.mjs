import crypto from "node:crypto";

const API_URL = (process.env.API_URL ?? process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON_KEY = process.env.ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
const JWT_SECRET = process.env.JWT_SECRET ?? "";

const USER_A = "00000000-0000-0000-0000-0000000000a1";
const USER_B = "00000000-0000-0000-0000-0000000000b2";
const BUCKET = "rekammedisku-attachments";
const OBJECT_PATH = `${USER_A}/mu005-api-attachment.txt`;
const OBJECT_BODY = "MU005-A-ATTACHMENT";

function required(name: string, value: string): string {
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function signUserToken(userId: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .toString("base64url");

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      aud: "authenticated",
      exp: now + 300,
      iat: now,
      iss: "supabase",
      role: "authenticated",
      sub: userId,
    }),
  ).toString("base64url");

  const input = `${header}.${payload}`;
  const signature = crypto
    .createHmac("sha256", required("JWT_SECRET", JWT_SECRET))
    .update(input)
    .digest("base64url");

  return `${input}.${signature}`;
}

function objectUrl(path: string): string {
  return `${required("API_URL", API_URL)}/storage/v1/object/${BUCKET}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

async function request(
  label: string,
  token: string,
  init: RequestInit,
): Promise<Response> {
  const response = await fetch(objectUrl(OBJECT_PATH), {
    ...init,
    headers: {
      apikey: required("ANON_KEY", ANON_KEY),
      authorization: `Bearer ${token}`,
      ...(init.body instanceof Uint8Array
        ? { "content-type": "text/plain" }
        : {}),
      ...(init.headers ?? {}),
    },
  });

  console.log(`[MU-005 Storage API] ${label}: HTTP ${response.status}`);
  return response;
}

async function readText(response: Response): Promise<string> {
  return response.text();
}

function assertOk(label: string, response: Response): void {
  if (!response.ok) {
    throw new Error(`${label} failed with HTTP ${response.status}`);
  }
}

function assertDenied(label: string, response: Response): void {
  if (response.ok) {
    throw new Error(`${label} unexpectedly succeeded with HTTP ${response.status}`);
  }
}

async function main(): Promise<void> {
  required("API_URL", API_URL);
  required("ANON_KEY", ANON_KEY);
  required("JWT_SECRET", JWT_SECRET);

  const tokenA = signUserToken(USER_A);
  const tokenB = signUserToken(USER_B);

  const upload = await request("User A upload", tokenA, {
    method: "POST",
    headers: {
      "content-type": "text/plain",
      "x-upsert": "true",
    },
    body: OBJECT_BODY,
  });
  await readText(upload);
  assertOk("User A upload", upload);

  const ownDownload = await request("User A download", tokenA, {
    method: "GET",
  });
  const ownBody = await readText(ownDownload);
  assertOk("User A download", ownDownload);
  if (ownBody !== OBJECT_BODY) {
    throw new Error("User A download returned unexpected object content");
  }

  const foreignDownload = await request("User B download", tokenB, {
    method: "GET",
  });
  await readText(foreignDownload);
  assertDenied("User B download", foreignDownload);

  const foreignUpdate = await request("User B update", tokenB, {
    method: "PUT",
    headers: {
      "content-type": "text/plain",
    },
    body: "MU005-B-ATTACK",
  });
  await readText(foreignUpdate);
  assertDenied("User B update", foreignUpdate);

  const foreignDelete = await request("User B delete", tokenB, {
    method: "DELETE",
  });
  await readText(foreignDelete);
  assertDenied("User B delete", foreignDelete);

  const ownerStillHasObject = await request(
    "User A download after User B attempts",
    tokenA,
    { method: "GET" },
  );
  const finalBody = await readText(ownerStillHasObject);
  assertOk("User A download after User B attempts", ownerStillHasObject);
  if (finalBody !== OBJECT_BODY) {
    throw new Error("User B altered or removed the User A attachment");
  }

  const ownerDelete = await request("User A cleanup delete", tokenA, {
    method: "DELETE",
  });
  await readText(ownerDelete);
  assertOk("User A cleanup delete", ownerDelete);

  console.log("MU-005 Storage API isolation: PASS");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
