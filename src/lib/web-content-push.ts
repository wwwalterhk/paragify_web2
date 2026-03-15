const DEVICE_PUSH_URL = "https://paragify-noti.wwwalterhk.workers.dev/send-device-push";

type WebContentPushTarget = {
	content_id: number;
	title: string | null;
	noti_type: string | null;
	noti_device_token: string | null;
};

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildNotificationMessage(contentId: number, contentTitle: string | null, prepareStatus: number) {
	const title = contentTitle ?? `Web content #${contentId}`;

	switch (prepareStatus) {
		case 1:
			return { title, body: "Preparation started." };
		case 2:
			return { title, body: "Preparation completed." };
		case 3:
			return { title, body: "Preparation failed." };
		default:
			return { title, body: "Preparation updated." };
	}
}

export async function sendWebContentPrepareStatusPush(
	db: D1Database,
	contentId: number,
	prepareStatus: number,
): Promise<void> {
	try {
		const target = await db
			.prepare(
				`SELECT wc.content_id, wc.title, u.noti_type, u.noti_device_token
           FROM web_contents wc
           JOIN users u
             ON u.user_pk = wc.user_pk
          WHERE wc.content_id = ?
          LIMIT 1`,
			)
			.bind(contentId)
			.first<WebContentPushTarget>();

		const deviceToken = readString(target?.noti_device_token);
		const notiType = readString(target?.noti_type)?.toUpperCase();
		if (!target?.content_id || !deviceToken || notiType !== "APNS") {
			return;
		}

		const pushPayload = {
			deviceToken,
			...buildNotificationMessage(contentId, readString(target.title), prepareStatus),
		};

		const response = await fetch(DEVICE_PUSH_URL, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(pushPayload),
		});

		if (!response.ok) {
			console.warn("web content push notify response", { contentId, status: response.status });
		}
	} catch (error) {
		console.warn("web content push notify failed", { contentId, error });
	}
}
