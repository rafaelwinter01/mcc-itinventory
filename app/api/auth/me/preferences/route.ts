import { NextRequest, NextResponse } from "next/server";
import { eq, max } from "drizzle-orm";
import { db } from "@/db";
import { systemUser } from "@/db/schema";
import { getSession } from "@/lib/session";
import { MAX_PREFERENCES_LIST_ITEMS } from "@/constants/preferences";

type PreferenceItem = Record<string, unknown>;
type PreferenceBucket = {
	last: PreferenceItem;
	list: PreferenceItem[];
};
type PreferencesMap = Record<string, PreferenceBucket>;


function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePreferences(raw: unknown): PreferencesMap {
	if (!isObject(raw)) return {};

	const normalized: PreferencesMap = {};

	for (const [key, value] of Object.entries(raw)) {
		if (!isObject(value)) continue;

		const last = isObject(value.last) ? value.last : {};
		const list = Array.isArray(value.list)
			? value.list.filter((item): item is PreferenceItem => isObject(item))
			: [];

		normalized[key] = { last, list };
	}

	return normalized;
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const username = searchParams.get("username");
		const key = searchParams.get("key");

		if (!username || !key) {
			return NextResponse.json(
				{ error: "Query params 'username' and 'key' are required" },
				{ status: 400 }
			);
		}

		const [systemUserRecord] = await db
			.select({
				username: systemUser.username,
				preferences: systemUser.preferences,
			})
			.from(systemUser)
			.where(eq(systemUser.username, username))
			.limit(1);

		if (!systemUserRecord) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const preferences = normalizePreferences(systemUserRecord.preferences);
		const preference = preferences[key] ?? { last: {}, list: [] };

		return NextResponse.json({
			username: systemUserRecord.username,
			key,
            maxListItems: MAX_PREFERENCES_LIST_ITEMS,
			data: preference,
		});
	} catch (error) {
		console.error("Error getting user preference:", error);
		return NextResponse.json(
			{ error: "Failed to fetch preference" },
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const sessionUser = await getSession();

		if (!sessionUser) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const command = body?.command;
		const property = body?.property;
		const value = body?.value;
		const index = body?.index;

		if (command !== "new" && command !== "last") {
			return NextResponse.json(
				{ error: "Property 'command' must be 'new' or 'last'" },
				{ status: 400 }
			);
		}

		if (typeof property !== "string" || property.trim().length === 0) {
			return NextResponse.json(
				{ error: "Property 'property' is required" },
				{ status: 400 }
			);
		}

		if (!isObject(value)) {
			return NextResponse.json(
				{ error: "Property 'value' must be an object" },
				{ status: 400 }
			);
		}

		if (
			index !== undefined &&
			(!Number.isInteger(index) || index < 0)
		) {
			return NextResponse.json(
				{ error: "Property 'index' must be a non-negative integer" },
				{ status: 400 }
			);
		}

		const [systemUserRecord] = await db
			.select({
				id: systemUser.id,
				username: systemUser.username,
				preferences: systemUser.preferences,
			})
			.from(systemUser)
			.where(eq(systemUser.id, sessionUser.id))
			.limit(1);

		if (!systemUserRecord) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const preferences = normalizePreferences(systemUserRecord.preferences);
		const currentProperty = preferences[property] ?? { last: {}, list: [] };

		const updatedProperty: PreferenceBucket =
			command === "new"
				? (() => {
						if (index === undefined) {
							return {
								last: currentProperty.last,
								list: [
									...currentProperty.list.slice(-(MAX_PREFERENCES_LIST_ITEMS - 1)),
									value,
								],
							};
						}

						if (index >= currentProperty.list.length) {
							throw new Error("INDEX_OUT_OF_RANGE");
						}

						const updatedList = [...currentProperty.list];
						updatedList[index] = value;

						return {
							last: currentProperty.last,
							list: updatedList,
						};
				  })()
				: {
						last: value,
						list: currentProperty.list,
				  };

		const updatedPreferences: PreferencesMap = {
			...preferences,
			[property]: updatedProperty,
		};

		await db
			.update(systemUser)
			.set({
				preferences: updatedPreferences,
			})
			.where(eq(systemUser.id, systemUserRecord.id));

		return NextResponse.json({
			message: "Preference updated successfully",
			username: systemUserRecord.username,
			property,
			command,
			index,
			data: updatedProperty,
		});
	} catch (error) {
		if (error instanceof Error && error.message === "INDEX_OUT_OF_RANGE") {
			return NextResponse.json(
				{ error: "Property 'index' is out of range for current list" },
				{ status: 400 }
			);
		}

		console.error("Error updating preferences:", error);
		return NextResponse.json(
			{ error: "Failed to update preference" },
			{ status: 500 }
		);
	}
}
