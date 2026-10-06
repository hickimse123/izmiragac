import { eq } from "drizzle-orm";
import * as schema from "../../db/schema.js";
import { getDb } from "./connection.js";

export async function findUserByUnionId(unionId: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.unionId, unionId))
    .limit(1);
  return rows.at(0);
}
