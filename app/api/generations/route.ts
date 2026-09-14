import { withOwner } from "@/lib/server/http";
import { listGenerations, serialise } from "@/lib/server/generations";

export async function GET() {
  return withOwner(async (owner) => ({ body: { items: listGenerations(owner.userId, owner.anonId).map((r) => serialise(r)) } }));
}
