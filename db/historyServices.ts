import { db } from "@/db";
import { history } from "@/db/schema";

type SaveHistoryParams = {
	userId: number | null;
	action: string;
	entityName: string;
	description: string;
	entityId: number | null;
};

export async function saveHistory({
	userId,
	action,
	entityName,
	description,
	entityId,
}: SaveHistoryParams): Promise<void> {
	await db.insert(history).values({
		userId,
		action,
		entityName,
		description,
		entityId: entityId === null || entityId === 0 ? null : entityId,
	});
}
