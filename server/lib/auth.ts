import * as cookie from "cookie";
import { Session } from "../../contracts/constants.js";
import { verifySessionToken } from "./session.js";
import { findUserByUnionId } from "../queries/users.js";

/** Çerezdeki oturumu doğrular; geçerli kullanıcıyı ya da null döndürür. */
export async function authenticateRequest(headers: Headers) {
  const cookies = cookie.parse(headers.get("cookie") || "");
  const token = cookies[Session.cookieName];
  if (!token) return null;
  const claim = await verifySessionToken(token);
  if (!claim) return null;
  return (await findUserByUnionId(claim.unionId)) ?? null;
}
