"use client";

import Link from "next/link";
import Head from "next/head";
import { PaperClipIcon, DocumentTextIcon, DocumentArrowDownIcon, DocumentChartBarIcon, ArrowDownCircleIcon } from "@heroicons/react/24/outline";
import { use, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction, type MutableRefObject } from "react";

type Locale = "zh" | "en";
const CDN_BASE = "https://cdn.paragify.com";
const CDN_IMAGE_BASE = "https://cdn.paragify.com/cdn-cgi/image/width=768,quality=75,format=auto";
const normalizeCdnUrl = (url: string | null | undefined) => {
	if (!url) return "";
	if (url.startsWith("blob:") || url.startsWith("data:")) return url;
	if (url.startsWith(CDN_IMAGE_BASE)) return url;
	if (url.startsWith(CDN_BASE)) {
		const path = url.slice(CDN_BASE.length);
		return `${CDN_IMAGE_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
	}
	let path = url;
	if (url.startsWith("http://") || url.startsWith("https://")) {
		try {
			const u = new URL(url);
			path = u.pathname + u.search;
		} catch {
			// fallback to original
		}
	}
	if (!path.startsWith("/")) path = `/${path}`;
	return `${CDN_IMAGE_BASE}${path}`;
};

type PendingAttachment = {
	id: string;
	file: File;
	preview: string;
	width: number | null;
	height: number | null;
	mimeType: string;
	size: number;
};

type ChatRoom = {
	convo_id: string;
	convo_type?: string | null;
	listing_pk?: number | null;
	listing_id?: string | null;
	listing_title?: string | null;
	title?: string | null;
	updated_at?: string | null;
	last_body?: string | null;
	last_created_at?: string | null;
	last_sender_pk?: number | null;
	avatar_url?: string | null;
	peer_user_id?: string | null;
	peerUserId?: string | null;
	peer_name?: string | null;
	peerName?: string | null;
};

type RoomsResponse = {
	ok: boolean;
	userPk?: number;
	userId?: string;
	rooms?: ChatRoom[];
	message?: string;
};

type DirectChatResponse = {
	ok: boolean;
	convoId?: string;
	peerUserId?: string | null;
	peerName?: string | null;
	message?: string;
};

type LinkPreview = {
	url: string;
	title: string | null;
	description: string | null;
	imageUrl: string | null;
	siteName: string | null;
	status: string | null;
	errorMessage: string | null;
	imageStatus?: string | null;
	imageErrorMessage?: string | null;
};

type Message = {
	message_id?: number | string;
	clientTempId?: string;
	sender_pk: number;
	body: string;
	created_at?: string;
	pending?: boolean;
	sender_avatar?: string | null;
	sender_name?: string | null;
	reply_message_id?: number | string | null;
	attachments?: { url: string; mimeType: string | null; width: number | null; height: number | null; size?: number | null }[];
	link_preview?: LinkPreview | null;
	linkPreview?: LinkPreview | null;
};

function extractFirstHttpUrl(value: string): string | null {
	const m = value.match(/https?:\/\/[^\s<>"')\]}]+/i);
	if (!m?.[0]) return null;
	return normalizeHttpUrlValue(m[0].trim());
}

function normalizeHttpUrlValue(value: string): string | null {
	try {
		const u = new URL(value);
		const protocol = u.protocol.toLowerCase();
		if (protocol !== "http:" && protocol !== "https:") return null;
		return u.toString();
	} catch {
		return null;
	}
}

function hostnameFromUrl(url: string): string {
	try {
		const u = new URL(url);
		return u.hostname || url;
	} catch {
		return url;
	}
}

function normalizeLinkPreview(raw: unknown): LinkPreview | null {
	if (!raw || typeof raw !== "object") return null;
	const data = raw as Record<string, unknown>;
	const url = typeof data.url === "string" ? data.url.trim() : "";
	if (!url) return null;
	const imageUrlRaw =
		typeof data.imageUrl === "string"
			? data.imageUrl
			: typeof data.image_url === "string"
				? data.image_url
				: typeof data.imageSourceUrl === "string"
					? data.imageSourceUrl
					: typeof data.image_source_url === "string"
						? data.image_source_url
						: "";
	return {
		url,
		title: typeof data.title === "string" ? data.title : null,
		description: typeof data.description === "string" ? data.description : null,
		imageUrl: imageUrlRaw ? imageUrlRaw : null,
		siteName:
			typeof data.siteName === "string"
				? data.siteName
				: typeof data.site_name === "string"
					? data.site_name
					: null,
		status: typeof data.status === "string" ? data.status : null,
		errorMessage:
			typeof data.errorMessage === "string"
				? data.errorMessage
				: typeof data.error_message === "string"
					? data.error_message
					: null,
		imageStatus:
			typeof data.imageStatus === "string"
				? data.imageStatus
				: typeof data.image_status === "string"
					? data.image_status
					: null,
		imageErrorMessage:
			typeof data.imageErrorMessage === "string"
				? data.imageErrorMessage
				: typeof data.image_error_message === "string"
					? data.image_error_message
					: null,
	};
}

type MessageBodySegment = { kind: "text"; value: string } | { kind: "link"; value: string; href: string };

function splitMessageBodySegments(text: string): MessageBodySegment[] {
	const regex = /https?:\/\/[^\s<>"')\]}]+/gi;
	const out: MessageBodySegment[] = [];
	let last = 0;
	let match: RegExpExecArray | null = null;
	while ((match = regex.exec(text)) !== null) {
		const start = match.index;
		const end = regex.lastIndex;
		if (start > last) out.push({ kind: "text", value: text.slice(last, start) });

		let raw = match[0];
		let trailing = "";
		while (raw.length > 0 && /[.,!?;:]$/.test(raw)) {
			trailing = raw.slice(-1) + trailing;
			raw = raw.slice(0, -1);
		}

		const href = normalizeHttpUrlValue(raw);
		if (href) out.push({ kind: "link", value: raw, href });
		else out.push({ kind: "text", value: match[0] });
		if (trailing) out.push({ kind: "text", value: trailing });
		last = end;
	}
	if (last < text.length) out.push({ kind: "text", value: text.slice(last) });
	return out;
}

function renderMessageBodyWithLinks(text: string, mine: boolean) {
	const segments = splitMessageBodySegments(text);
	if (segments.length === 1 && segments[0]?.kind === "text") return text;
	return segments.map((seg, idx) =>
		seg.kind === "link" ? (
			<a
				key={`link-${idx}-${seg.href}`}
				href={seg.href}
				target="_blank"
				rel="noopener noreferrer"
				className={[
					"rounded-sm px-[2px] underline decoration-1 underline-offset-2 transition",
					mine
						? "bg-white/20 text-white decoration-white/70 hover:bg-white/30"
						: "bg-[color:var(--accent-3)]/45 text-[color:var(--accent-1)] decoration-[color:var(--accent-1)] hover:bg-[color:var(--accent-3)]/65",
				].join(" ")}
			>
				{seg.value}
			</a>
		) : (
			<span key={`txt-${idx}`}>{seg.value}</span>
		)
	);
}

function formatDateLabel(date: Date, locale: Locale) {
	const dayStart = new Date(date);
	dayStart.setHours(0, 0, 0, 0);

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const diffDays = Math.round((today.getTime() - dayStart.getTime()) / (24 * 60 * 60 * 1000));
	if (diffDays === 0) return locale === "en" ? "Today" : "今日";
	if (diffDays === 1) return locale === "en" ? "Yesterday" : "昨日";
	return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

type Presence = { userPk: number; online: boolean; lastSeen: string | null; name?: string | null };

const copy: Record<
	Locale,
	{
		title: string;
		subtitle: string;
		refresh: string;
		loading: string;
		uploading: string;
		empty: string;
		error: string;
		lastMessage: string;
		updated: string;
		signIn: string;
		statusConnected: string;
		statusConnecting: string;
		statusError: string;
		placeholder: string;
		send: string;
	}
> = {
	zh: {
		title: "私人訊息",
		subtitle: "管理你的私人訊息。",
		refresh: "重新整理",
		loading: "載入中…",
		uploading: "上傳中…",
		empty: "暫時沒有對話。",
		error: "載入失敗，稍後再試。",
		lastMessage: "最新訊息",
		updated: "更新時間",
		signIn: "請先登入以查看聊天。",
		statusConnected: "已連線",
		statusConnecting: "連線中…",
		statusError: "未連線",
		placeholder: "輸入訊息…",
		send: "傳送",
	},
	en: {
		title: "Private Message",
		subtitle: "Manage your private messages.",
		refresh: "Refresh",
		loading: "Loading…",
		uploading: "Uploading…",
		empty: "No conversations yet.",
		error: "Failed to load. Please try again.",
		lastMessage: "Last message",
		updated: "Updated",
		signIn: "Please sign in to view chats.",
		statusConnected: "Connected",
		statusConnecting: "Connecting…",
		statusError: "Disconnected",
		placeholder: "Type a message…",
		send: "Send",
	},
};

function formatDate(value?: string | null) {
	if (!value) return "—";
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return value;
	return d.toLocaleString(undefined, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function parseHashUserId(hash: string): string | null {
	const rawHash = (hash || "").startsWith("#") ? hash.slice(1) : hash || "";
	if (!rawHash) return null;
	let decoded = rawHash;
	try {
		decoded = decodeURIComponent(rawHash);
	} catch {
		// ignore decode errors and use raw hash
	}
	const normalized = decoded.trim().replace(/^@/, "").toLowerCase();
	if (!normalized) return null;
	return /^[a-z0-9._-]+$/.test(normalized) ? normalized : null;
}

function roomActivityTs(room: ChatRoom): number {
	const raw = room.last_created_at || room.updated_at || "";
	if (!raw) return 0;
	const ts = Date.parse(raw);
	return Number.isNaN(ts) ? 0 : ts;
}

function moveRoomToTop(prev: ChatRoom[], convoId: string, patch: Partial<ChatRoom>): ChatRoom[] {
	const idx = prev.findIndex((r) => r.convo_id === convoId);
	if (idx === -1) return prev;
	const updated = { ...prev[idx], ...patch };
	const next = [updated, ...prev.slice(0, idx), ...prev.slice(idx + 1)];
	next.sort((a, b) => roomActivityTs(b) - roomActivityTs(a));
	return next;
}

function mergeMessages(existing: Message[], incoming: Message[]) {
	if (!incoming.length) return existing.slice();
	const byId = new Map<string | number, Message>();
	const byTemp = new Map<string, Message>();

	const add = (m: Message) => {
		const idKey = m.message_id ?? null;
		if (idKey != null) byId.set(idKey, m);
		if (m.clientTempId) byTemp.set(m.clientTempId, m);
	};

	existing.forEach(add);

	incoming.forEach((m) => {
		if (m.clientTempId && byTemp.has(m.clientTempId)) {
			const prev = byTemp.get(m.clientTempId)!;
			const merged = { ...prev, ...m, pending: false };
			const incomingPreview = normalizeLinkPreview(m.link_preview || m.linkPreview);
			const prevPreview = normalizeLinkPreview(prev.link_preview || prev.linkPreview);
			if (!incomingPreview && prevPreview) merged.link_preview = prevPreview;
			add(merged);
			return;
		}
		if (m.message_id != null && byId.has(m.message_id)) {
			const prev = byId.get(m.message_id)!;
			const merged = { ...prev, ...m, pending: false };
			const incomingPreview = normalizeLinkPreview(m.link_preview || m.linkPreview);
			const prevPreview = normalizeLinkPreview(prev.link_preview || prev.linkPreview);
			if (!incomingPreview && prevPreview) merged.link_preview = prevPreview;
			add(merged);
			return;
		}
		add({ ...m, pending: false });
	});

	const all = Array.from(new Set([...byId.values(), ...byTemp.values()]));
	all.sort((a, b) => {
		const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
		const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
		return ta - tb;
	});
	return all;
}

function numericMessageId(m: Message) {
	if (typeof m.message_id === "number") return m.message_id;
	if (typeof m.message_id === "string") {
		const n = Number(m.message_id);
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

function messageTimestamp(m: Message) {
	if (m.created_at) {
		const t = new Date(m.created_at).getTime();
		if (!Number.isNaN(t)) return t;
	}
	return Date.now();
}

type MessageStatus = "sending" | "sent" | "delivered" | "read" | null;

const HIGHLIGHT_CLASSES = "ring-2 ring-[color:var(--accent-1)] ring-offset-2 ring-offset-[color:var(--cell-2)]";

function summarizeReplyContent(
	m: Message | undefined
): { text: string; thumbUrl: string | null } {
	if (!m) return { text: "…", thumbUrl: null };
	const imageAtt =
		m.attachments?.find((att) => att?.url && (att.mimeType || "").startsWith("image/")) || null;
	let text = "Message";
	if (m.body) text = m.body.length > 80 ? `${m.body.slice(0, 80)}…` : m.body;
	else if (imageAtt) text = "📷 Photo";
	else if (m.attachments?.length) text = "📎 Attachment";
	return { text, thumbUrl: imageAtt?.url ?? null };
}

function preferredExtension(mime: string, url?: string): string | null {
	const m = mime || "";
	if (m === "application/pdf") return "pdf";
	if (m.startsWith("text/")) return "txt";
	if (m.includes("zip")) return "zip";
	if (m.includes("msword")) return "doc";
	if (m.includes("officedocument.wordprocessingml")) return "docx";
	if (m.includes("excel")) return "xls";
	if (m.includes("officedocument.spreadsheetml")) return "xlsx";
	if (m.includes("powerpoint")) return "ppt";
	if (m.includes("officedocument.presentationml")) return "pptx";
	if (m.startsWith("audio/")) return "m4a";
	if (m.startsWith("video/")) return "mp4";
	if (url) {
		try {
			const u = new URL(url, "https://dummy");
			const ext = (u.pathname.split(".").pop() || "").trim();
			if (ext) return ext;
		} catch {
			// ignore parse errors
		}
	}
	return null;
}

function formatBytes(size?: number | null): string | null {
	if (size == null || Number.isNaN(size) || size <= 0) return null;
	const units = ["B", "KB", "MB", "GB"];
	let s = size;
	let i = 0;
	while (s >= 1024 && i < units.length - 1) {
		s /= 1024;
		i += 1;
	}
	return `${s.toFixed(s >= 10 || s % 1 === 0 ? 0 : 1)}${units[i]}`;
}

async function fetchPresenceRemote(userPk: number): Promise<Presence | null> {
	try {
		const res = await fetch(`/api/presence?userPk=${userPk}`, {
			method: "GET",
			credentials: "include",
			headers: { accept: "application/json" },
		});
		if (!res.ok) return null;
		const data = (await res.json()) as { userPk: number; userId?: string; name?: string; online: boolean; lastSeen: string | null };
		if (typeof data.userPk !== "number") return null;
		return { userPk: data.userPk, online: Boolean(data.online), lastSeen: data.lastSeen ?? null, name: data.name ?? null };
	} catch {
		return null;
	}
}

export const dynamic = "force-dynamic";

export default function ChatRoomsPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale: rawLocale } = use(params);
	const locale: Locale = rawLocale?.toLowerCase().startsWith("en") ? "en" : "zh";
	const t = copy[locale];
	const pageTitle = locale === "en" ? "Private Message | Paragify" : "私人訊息 | Paragify";
	const peerBubbleBgClass = "bg-[color:var(--bubble-peer-bg)]";

	const [rooms, setRooms] = useState<ChatRoom[]>([]);
	const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
	const [messages, setMessages] = useState<Message[]>([]);
	const [messageCache, setMessageCache] = useState<Record<string, Message[]>>({});
	const [participantMap, setParticipantMap] = useState<Record<string, number[]>>({});
	const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
	const [uploading, setUploading] = useState(false);
	const [peerPresence, setPeerPresence] = useState<Presence | null>(null);
	const [lastReadMap, setLastReadMap] = useState<Record<string, number>>({});
	const [lastReadTsMap, setLastReadTsMap] = useState<Record<string, number>>({});
	const [latestPeerReceivedMap, setLatestPeerReceivedMap] = useState<Record<string, number>>({});
	const [latestPeerReadMap, setLatestPeerReadMap] = useState<Record<string, number>>({});
	const [latestMyReceivedMap, setLatestMyReceivedMap] = useState<Record<string, number>>({});
	const [latestMyReadMap, setLatestMyReadMap] = useState<Record<string, number>>({});
	const [flashId, setFlashId] = useState<number | null>(null);
	const [replyTo, setReplyTo] = useState<{ id: number; sender: string; preview: string; thumb: string | null } | null>(null);
	const [showScrollToBottom, setShowScrollToBottom] = useState(false);
	const [loadingRooms, setLoadingRooms] = useState(true);
	const [hasFetchedRooms, setHasFetchedRooms] = useState(false);
	const [loadingMessages, setLoadingMessages] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [wsStatus, setWsStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
	const [userId, setUserId] = useState<string | null>(null);
	const [userPk, setUserPk] = useState<number | null>(null);
	const [input, setInput] = useState("");
	const [composerLinkPreview, setComposerLinkPreview] = useState<LinkPreview | null>(null);
	const [hashTargetUserId, setHashTargetUserId] = useState<string | null>(() =>
		typeof window === "undefined" ? null : parseHashUserId(window.location.hash)
	);
	const wsRef = useRef<WebSocket | null>(null);
	const listRef = useRef<HTMLDivElement | null>(null);
	const roomsRef = useRef<ChatRoom[]>([]);
	const selectedRoomRef = useRef<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const hashAutoOpenAttemptedRef = useRef<string | null>(null);
	const hashTargetRef = useRef<string | null>(hashTargetUserId);
	const latestPeerReceivedRef = useRef<Record<string, number>>({});
	const latestPeerReadRef = useRef<Record<string, number>>({});
	const latestMyReceivedRef = useRef<Record<string, number>>({});
	const latestMyReadRef = useRef<Record<string, number>>({});
	const conversationFetchSeqRef = useRef(0);
	const composerPreviewFetchSeqRef = useRef(0);
	const savedLinkPreviewMessageIdsRef = useRef<Record<number, true>>({});
	const savingLinkPreviewMessageIdsRef = useRef<Record<number, true>>({});

	useEffect(() => {
		const syncHashTarget = () => {
			if (typeof window === "undefined") return;
			const parsed = parseHashUserId(window.location.hash);
			hashTargetRef.current = parsed;
			setHashTargetUserId(parsed);
		};
		syncHashTarget();
		window.addEventListener("hashchange", syncHashTarget);
		return () => window.removeEventListener("hashchange", syncHashTarget);
	}, []);

	useEffect(() => {
		hashTargetRef.current = hashTargetUserId;
		hashAutoOpenAttemptedRef.current = null;
	}, [hashTargetUserId]);

	useEffect(() => {
		roomsRef.current = rooms;
	}, [rooms]);

	const bumpMapMax = (setter: Dispatch<SetStateAction<Record<string, number>>>, ref: MutableRefObject<Record<string, number>>) =>
		(convoId: string, value: number | null | undefined) =>
			setter((prev) => {
				if (value == null || Number.isNaN(value)) return prev;
				const current = prev[convoId] ?? 0;
				if (value <= current) return prev;
				const next = { ...prev, [convoId]: value };
				ref.current = next;
				return next;
			});

	const updatePeerReceived = bumpMapMax(setLatestPeerReceivedMap, latestPeerReceivedRef);
	const updatePeerRead = bumpMapMax(setLatestPeerReadMap, latestPeerReadRef);
	const updateMyReceived = bumpMapMax(setLatestMyReceivedMap, latestMyReceivedRef);
	const updateMyRead = bumpMapMax(setLatestMyReadMap, latestMyReadRef);

	const sendReceipt = (convoId: string, messageId: number | null, status: "received" | "read", opts?: { force?: boolean }) => {
		if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
		if (messageId == null || Number.isNaN(messageId)) return;
		const currentMap = status === "read" ? latestMyReadRef.current : latestMyReceivedRef.current;
		if (!opts?.force && (currentMap[convoId] ?? 0) >= messageId) return;
		const payload = { type: "RECEIPT", convoId, payload: { messageId, status } };
		wsRef.current.send(JSON.stringify(payload));
		if (status === "read") {
			updateMyRead(convoId, messageId);
			updateMyReceived(convoId, messageId);
		} else {
			updateMyReceived(convoId, messageId);
		}
	};

	const persistLinkPreviewRecord = async (messageId: number, text: string, preview?: LinkPreview | null) => {
		if (!Number.isFinite(messageId) || messageId <= 0) return;
		if (savedLinkPreviewMessageIdsRef.current[messageId] || savingLinkPreviewMessageIdsRef.current[messageId]) return;
		const normalizedPreview = normalizeLinkPreview(preview ?? null);
		const url = normalizedPreview?.url || extractFirstHttpUrl(text || "");
		if (!url) return;

		savingLinkPreviewMessageIdsRef.current[messageId] = true;
		try {
			const res = await fetch("/api/chat/link-preview", {
				method: "POST",
				headers: { "content-type": "application/json", accept: "application/json" },
				body: JSON.stringify({
					url,
					messageId,
					store: true,
					storeImage: true,
				}),
			});
			const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
			if (res.ok && data?.ok) {
				savedLinkPreviewMessageIdsRef.current[messageId] = true;
			}
		} catch {
			// ignore: keep UI stable; server save can retry later
		} finally {
			delete savingLinkPreviewMessageIdsRef.current[messageId];
		}
	};

	const localePathPrefix = locale === "en" ? "/en" : "/zh";
	const formatPresenceTime = (value?: string | null) => {
		if (!value) return "";
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return "";
		return d.toLocaleString(undefined, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
	};

	useEffect(() => {
		latestPeerReceivedRef.current = latestPeerReceivedMap;
	}, [latestPeerReceivedMap]);
	useEffect(() => {
		latestPeerReadRef.current = latestPeerReadMap;
	}, [latestPeerReadMap]);
	useEffect(() => {
		latestMyReceivedRef.current = latestMyReceivedMap;
	}, [latestMyReceivedMap]);
	useEffect(() => {
		latestMyReadRef.current = latestMyReadMap;
	}, [latestMyReadMap]);

	const fetchPresence = async (userPk: number) => {
		const res = await fetchPresenceRemote(userPk);
		if (res) {
			setPeerPresence(res);
		} else {
			setPeerPresence(null);
		}
	};

	const resizeImageToHeight = (
		file: File,
		targetHeight = 768
	): Promise<{ file: File; width: number | null; height: number | null; preview: string }> =>
		new Promise((resolve) => {
			const objectUrl = URL.createObjectURL(file);
			const img = new Image();
			img.onload = () => {
				const { width, height } = img;
				if (!file.type.startsWith("image/") || height <= targetHeight) {
					// No resize needed
					resolve({ file, width, height, preview: objectUrl });
					return;
				}
				const scale = targetHeight / height;
				const canvas = document.createElement("canvas");
				canvas.width = Math.round(width * scale);
				canvas.height = targetHeight;
				const ctx = canvas.getContext("2d");
				if (!ctx) {
					resolve({ file, width, height, preview: objectUrl });
					return;
				}
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
				canvas.toBlob(
					(blob) => {
						if (!blob) {
							resolve({ file, width, height, preview: objectUrl });
							return;
						}
						const resizedFile = new File([blob], file.name, { type: file.type || "image/jpeg" });
						URL.revokeObjectURL(objectUrl);
						const preview = URL.createObjectURL(resizedFile);
						resolve({ file: resizedFile, width: canvas.width, height: canvas.height, preview });
					},
					file.type || "image/jpeg",
					0.92
				);
			};
			img.onerror = () => {
				resolve({ file, width: null, height: null, preview: objectUrl });
			};
			img.src = objectUrl;
		});

	const handleFilesSelected = async (fileList: FileList | null) => {
		if (!fileList) return;
		const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
		if (!files.length) return;
		const attachments = await Promise.all(
			files.map(async (file) => {
				const resized = await resizeImageToHeight(file);
				return {
					id: crypto.randomUUID(),
					file: resized.file,
					preview: resized.preview,
					width: resized.width ?? null,
					height: resized.height ?? null,
					mimeType: resized.file.type || "application/octet-stream",
					size: resized.file.size,
				} as PendingAttachment;
			})
		);
		setPendingAttachments((prev) => [...prev, ...attachments]);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const removePendingAttachment = (id: string) => {
		setPendingAttachments((prev) => {
			const target = prev.find((p) => p.id === id);
			if (target) URL.revokeObjectURL(target.preview);
			return prev.filter((p) => p.id !== id);
		});
	};

	useEffect(() => {
		void fetchRooms();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

useEffect(() => {
	if (!selectedRoomId) return;
	const cached = messageCache[selectedRoomId] || [];
	setMessages(cached);
	void fetchConversation(selectedRoomId, { showLoading: cached.length === 0 });
	// eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedRoomId]);

	useEffect(() => {
		setPendingAttachments([]);
		if (fileInputRef.current) fileInputRef.current.value = "";
	}, [selectedRoomId]);

	useEffect(() => {
		return () => {
			pendingAttachments.forEach((att) => URL.revokeObjectURL(att.preview));
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (listRef.current) {
			listRef.current.scrollTop = listRef.current.scrollHeight;
		}
	}, [messages]);

	useEffect(() => {
		setShowScrollToBottom(false);
	}, [messages]);

	useEffect(() => {
		if (selectedRoomId) {
			markRoomRead(selectedRoomId);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [messages, selectedRoomId]);

useEffect(() => {
	if (!selectedRoomId) return;
	setPeerPresence(null);
	const peers = participantMap[selectedRoomId] || [];
	const myPk = userPk ?? null;
	const peerPk = peers.find((p) => p !== myPk);
	if (!peerPk) {
		setPeerPresence(null);
			return;
		}
		void fetchPresence(peerPk);
	}, [selectedRoomId, participantMap, userPk]);

useEffect(() => {
	selectedRoomRef.current = selectedRoomId;
}, [selectedRoomId]);

useEffect(() => {
	setReplyTo(null);
}, [selectedRoomId]);

	useEffect(() => {
		setComposerLinkPreview(null);
		composerPreviewFetchSeqRef.current += 1;
	}, [selectedRoomId]);

	useEffect(() => {
		const targetUrl = extractFirstHttpUrl(input);
		if (!targetUrl) {
			composerPreviewFetchSeqRef.current += 1;
			setComposerLinkPreview(null);
			return;
		}
		if (composerLinkPreview?.url === targetUrl) return;

		const seq = ++composerPreviewFetchSeqRef.current;
		setComposerLinkPreview(null);

		const timer = window.setTimeout(() => {
			void (async () => {
				try {
					const res = await fetch("/api/chat/link-preview", {
						method: "POST",
						headers: { "content-type": "application/json", accept: "application/json" },
						body: JSON.stringify({
							url: targetUrl,
							store: false,
							storeImage: false,
						}),
					});
					const data = (await res.json().catch(() => null)) as { ok?: boolean; preview?: unknown } | null;
					if (composerPreviewFetchSeqRef.current !== seq) return;
					const preview = normalizeLinkPreview(data?.preview);
					if (preview) setComposerLinkPreview(preview);
				} catch {
					if (composerPreviewFetchSeqRef.current !== seq) return;
				}
			})();
		}, 380);

		return () => {
			window.clearTimeout(timer);
		};
	}, [input, composerLinkPreview?.url]);

/* eslint-disable react-hooks/exhaustive-deps */
useEffect(() => {
	if (!userId || !userPk) return;
	if (wsRef.current) return; // already connected

		const wsUrl = `wss://chat.paragify.com/ws?user=${encodeURIComponent(userId)}&userPk=${userPk}`;
		const ws = new WebSocket(wsUrl);
		wsRef.current = ws;
		setWsStatus("connecting");

		ws.addEventListener("open", () => {
			setWsStatus("connected");
			const convoIds = new Set([
				...Object.keys(latestMyReadRef.current || {}),
				...Object.keys(latestMyReceivedRef.current || {}),
			]);
			convoIds.forEach((cid) => {
				const readId = latestMyReadRef.current[cid];
				const receId = latestMyReceivedRef.current[cid];
				if (readId && Number.isFinite(readId)) {
					sendReceipt(cid, readId, "read", { force: true });
				} else if (receId && Number.isFinite(receId)) {
					sendReceipt(cid, receId, "received", { force: true });
				}
			});
		});
		ws.addEventListener("error", () => setWsStatus("error"));
		ws.addEventListener("close", () => setWsStatus("error"));
		ws.addEventListener("message", (evt) => {
			try {
				const data = JSON.parse(evt.data);
				const currentRoom = selectedRoomRef.current;
				if (data?.type === "EVENT_RECEIVED") {
					const convoId = data.convoId;
					const msgId = typeof data.messageId === "number" ? data.messageId : Number(data.messageId);
					if (!convoId || !Number.isFinite(msgId)) return;
					if (data.userPk === userPk) {
						updateMyReceived(convoId, msgId);
					} else {
						updatePeerReceived(convoId, msgId);
					}
					return;
				}
				if (data?.type === "EVENT_READ") {
					const convoId = data.convoId;
					const msgId = typeof data.messageId === "number" ? data.messageId : Number(data.messageId);
					if (!convoId || !Number.isFinite(msgId)) return;
					if (data.userPk === userPk) {
						updateMyRead(convoId, msgId);
						updateMyReceived(convoId, msgId);
						setLastReadMap((prev) => {
							const current = prev[convoId] ?? 0;
							return msgId > current ? { ...prev, [convoId]: msgId } : prev;
						});
						if (data.at) {
							const ts = Date.parse(data.at);
							if (!Number.isNaN(ts)) {
								setLastReadTsMap((prev) => {
									const current = prev[convoId] ?? 0;
									return ts > current ? { ...prev, [convoId]: ts } : prev;
								});
							}
						}
					} else {
						updatePeerRead(convoId, msgId);
						updatePeerReceived(convoId, msgId);
					}
					return;
				}
				if (data?.type === "EVENT_MESSAGE") {
					// Build message object
					const attachments =
						Array.isArray(data.attachments) && data.attachments.length
							? data.attachments
									.map(
										(
											a: {
												url?: string;
												attachmentUrl?: string;
												mimeType?: string | null;
												mime_type?: string | null;
												width?: number;
											height?: number;
										}
									) => ({
										url: normalizeCdnUrl(a.url || a.attachmentUrl || ""),
										mimeType: a.mimeType ?? a.mime_type ?? null,
											width: typeof a.width === "number" ? a.width : null,
											height: typeof a.height === "number" ? a.height : null,
										})
									)
									.filter((a: { url: string }) => Boolean(a.url))
							: data?.attachmentUrl
								? [
										{
											url: normalizeCdnUrl(data.attachmentUrl),
											mimeType: data.attachmentMimeType ?? null,
											width: data.attachmentWidth ?? null,
											height: data.attachmentHeight ?? null,
										},
								  ]
								: [];
					const replyMessageId =
						typeof data.reply_message_id === "number"
							? data.reply_message_id
							: typeof data.replyMessageId === "number"
								? data.replyMessageId
								: null;
					const incomingLinkPreview = normalizeLinkPreview(
						data.link_preview ?? data.linkPreview ?? data.preview ?? null
					);
					const senderName = data.senderName ?? data.sender_name ?? null;
					const msg: Message = {
						message_id: data.messageId,
						clientTempId: data.clientTempId,
						sender_pk: data.senderPk,
						body: data.text || data.body || "",
						created_at: data.createdAt,
						pending: false,
						sender_avatar: data.senderAvatar ?? null,
						sender_name: senderName ?? null,
						reply_message_id: replyMessageId,
						attachments,
						...(incomingLinkPreview ? { link_preview: incomingLinkPreview } : {}),
					};
					const numericId = numericMessageId(msg);
					if (numericId != null && Number.isFinite(numericId)) {
						if (data.senderPk === userPk) {
							updateMyReceived(data.convoId, numericId);
							updateMyRead(data.convoId, numericId);
						} else if (currentRoom && data.convoId === currentRoom) {
							sendReceipt(data.convoId, numericId, "read");
						} else {
							sendReceipt(data.convoId, numericId, "received");
						}
						if (incomingLinkPreview) {
							savedLinkPreviewMessageIdsRef.current[numericId] = true;
						} else if (msg.body) {
							void persistLinkPreviewRecord(numericId, msg.body, null);
						}
					}

					// Always update last message preview and bring active room to top
					setRooms((prev) =>
						moveRoomToTop(prev, data.convoId, {
							last_body: data.text || data.body || "",
							last_created_at: data.createdAt || new Date().toISOString(),
						})
					);

					setMessageCache((prev) => {
						const existing = prev[data.convoId] || [];
						return { ...prev, [data.convoId]: mergeMessages(existing, [msg]) };
					});

					// Only update the message list if this room is currently open
					if (currentRoom && data.convoId !== currentRoom) return;

					setMessages((prev) => {
						if (msg.clientTempId) {
							const idx = prev.findIndex((m) => m.clientTempId === msg.clientTempId);
							if (idx >= 0) {
								const copy = [...prev];
								const prevPreview = normalizeLinkPreview(copy[idx].link_preview || copy[idx].linkPreview);
								const nextPreview = normalizeLinkPreview(msg.link_preview || msg.linkPreview);
								copy[idx] = {
									...copy[idx],
									...msg,
									link_preview: nextPreview || prevPreview || undefined,
									pending: false,
								};
								return copy;
							}
						}
						// If this message belongs to another room, ignore
						if (currentRoom && data.convoId !== currentRoom) return prev;
						return [...prev, msg];
					});
					// Update last read for the open room
					const nId = numericMessageId(msg);
					const ts = messageTimestamp(msg);
					if (currentRoom === data.convoId && nId != null) {
						setLastReadMap((prev) => {
							const current = prev[data.convoId] || 0;
							return nId > current ? { ...prev, [data.convoId]: nId } : prev;
						});
					}
					if (currentRoom === data.convoId) {
						setLastReadTsMap((prev) => {
							const current = prev[data.convoId] || 0;
							return ts > current ? { ...prev, [data.convoId]: ts } : prev;
						});
					}
				}
				if (data?.type === "SEND_ACK" && data.convoId === currentRoom) {
					let ackBody: string | null = null;
					let ackPreview: LinkPreview | null = null;
					setMessages((prev) => {
						const idx = prev.findIndex((m) => m.clientTempId === data.clientTempId);
						if (idx === -1) return prev;
						const copy = [...prev];
						ackBody = copy[idx]?.body || null;
						ackPreview = normalizeLinkPreview(copy[idx]?.link_preview || copy[idx]?.linkPreview);
						copy[idx] = {
							...copy[idx],
							message_id: data.messageId ?? copy[idx].message_id,
							created_at: data.createdAt ?? copy[idx].created_at,
							pending: false,
						};
						return copy;
					});
						if (currentRoom) {
							setMessageCache((prev) => {
								const existing = prev[currentRoom] || [];
								const updated = existing.map((m) =>
									m.clientTempId === data.clientTempId
										? {
											...m,
											message_id: data.messageId ?? m.message_id,
											created_at: data.createdAt ?? m.created_at,
											pending: false,
									  }
									: m
							);
							return { ...prev, [currentRoom]: updated };
						});
						const ackId = typeof data.messageId === "number" ? data.messageId : Number(data.messageId);
						if (Number.isFinite(ackId) && ackId > 0) {
							if (ackPreview) {
								void persistLinkPreviewRecord(ackId, ackBody || "", ackPreview);
							} else if (ackBody) {
								void persistLinkPreviewRecord(ackId, ackBody, null);
							}
						}
					}
				}
			} catch {
				// ignore parse errors
			}
		});

		return () => {
			ws.close();
			wsRef.current = null;
			setWsStatus("idle");
		};
		}, [userId, userPk]);
/* eslint-enable react-hooks/exhaustive-deps */

	const fetchRooms = async () => {
		setLoadingRooms(true);
		setError(null);
		try {
			const res = await fetch("/api/mobile/chat/rooms", { method: "GET", headers: { accept: "application/json" } });
			if (res.status === 401 || res.status === 403) {
				setError(t.signIn);
				setRooms([]);
				return;
			}
			const data = (await res.json()) as RoomsResponse;
			if (!res.ok || !data?.ok) {
				setError(t.error);
				return;
			}
			const nextRooms = data.rooms ?? [];
			setRooms(nextRooms);
			setUserId(data.userId ?? null);
			setUserPk(data.userPk ?? null);
			const currentSelectedRoomId = selectedRoomRef.current;
			const hashFromUrl = typeof window === "undefined" ? null : parseHashUserId(window.location.hash);
			const currentHashTarget = hashFromUrl || hashTargetRef.current;
			if (!currentSelectedRoomId && nextRooms.length) {
				if (currentHashTarget) {
					const target = currentHashTarget.trim().toLowerCase();
					const matched = nextRooms.find((room) => {
						if (room.convo_id === target) return true;
						const peerUserId = (room.peerUserId || room.peer_user_id || "").trim().toLowerCase();
						return peerUserId === target;
					});
					if (matched?.convo_id) {
						setSelectedRoomId(matched.convo_id);
					}
				} else {
					setSelectedRoomId(nextRooms[0].convo_id);
				}
			}
		} catch {
			setError(t.error);
		} finally {
			setHasFetchedRooms(true);
			setLoadingRooms(false);
		}
	};

	useEffect(() => {
		const targetUserId = hashTargetUserId;
		if (!targetUserId || loadingRooms || !userPk) return;

		const existing = roomsRef.current.find((room) => {
			if (room.convo_id === targetUserId) return true;
			const peerUserId = (room.peerUserId || room.peer_user_id || "").trim().toLowerCase();
			return peerUserId === targetUserId;
		});
		if (existing?.convo_id) {
			if (selectedRoomRef.current !== existing.convo_id) setSelectedRoomId(existing.convo_id);
			return;
		}

		if (hashAutoOpenAttemptedRef.current === targetUserId) return;
		hashAutoOpenAttemptedRef.current = targetUserId;

		let cancelled = false;
		void (async () => {
			try {
				const res = await fetch("/api/mobile/chat", {
					method: "POST",
					headers: { "content-type": "application/json", accept: "application/json" },
					body: JSON.stringify({ action: "direct", user_id: targetUserId }),
				});
				const data = (await res.json().catch(() => null)) as DirectChatResponse | null;
				if (!res.ok || !data?.ok || !data.convoId) {
					if (cancelled) return;
					if (res.status === 401 || res.status === 403) setError(t.signIn);
					else if (res.status === 404) setError(locale === "en" ? `User @${targetUserId} not found.` : `找不到用戶 @${targetUserId}。`);
					else if (res.status === 400 && data?.message === "cannot chat with yourself") {
						setError(locale === "en" ? "You cannot start a chat with yourself." : "你不能和自己開始對話。");
					} else if (res.status === 400 && data?.message) {
						setError(data.message);
					}
					else setError(t.error);
					return;
				}
				if (cancelled) return;
				const convoId = data.convoId;
				const peerUserId = data.peerUserId || targetUserId;
				const peerName = data.peerName || null;
				setError(null);
				setRooms((prev) => {
					if (prev.some((room) => room.convo_id === convoId)) return prev;
					const now = new Date().toISOString();
					return [
						{
							convo_id: convoId,
							convo_type: "direct",
							title: peerName || peerUserId,
							updated_at: now,
							last_body: "",
							last_created_at: now,
							peer_user_id: peerUserId,
							peerUserId: peerUserId,
							peer_name: peerName,
							peerName: peerName,
						},
						...prev,
					];
				});
				setSelectedRoomId(convoId);
			} catch {
				if (!cancelled) setError(t.error);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [hashTargetUserId, loadingRooms, locale, t.error, t.signIn, userPk]);

	useEffect(() => {
		if (typeof window === "undefined" || !selectedRoomId) return;
		const room = rooms.find((r) => r.convo_id === selectedRoomId);
		if (!room) return;
		const target = (room.peerUserId || room.peer_user_id || room.convo_id || "").trim();
		if (!target) return;
		const normalizedTarget = parseHashUserId(`#${encodeURIComponent(target)}`);

		// Keep deep-link hash untouched until that target room exists, otherwise the in-flight create request gets cancelled.
		if (hashTargetUserId && normalizedTarget && normalizedTarget !== hashTargetUserId) {
			const hashTargetExists = rooms.some((r) => {
				if (r.convo_id === hashTargetUserId) return true;
				const peerUserId = (r.peerUserId || r.peer_user_id || "").trim().toLowerCase();
				return peerUserId === hashTargetUserId;
			});
			if (!hashTargetExists) return;
		}

		const encodedTarget = encodeURIComponent(target);
		const currentHash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
		if (currentHash !== encodedTarget) {
			const nextUrl = `${window.location.pathname}${window.location.search}#${encodedTarget}`;
			window.history.replaceState(window.history.state, "", nextUrl);
		}

		if (normalizedTarget && normalizedTarget !== hashTargetUserId) {
			setHashTargetUserId(normalizedTarget);
		}
	}, [hashTargetUserId, rooms, selectedRoomId]);

	const fetchConversation = async (convoId: string, opts?: { showLoading?: boolean }) => {
		const fetchSeq = ++conversationFetchSeqRef.current;
		const isActiveView = () => selectedRoomRef.current === convoId && conversationFetchSeqRef.current === fetchSeq;
		const cached = messageCache[convoId] || [];
		const shouldShowLoading = opts?.showLoading ?? cached.length === 0;
		if (selectedRoomRef.current === convoId) {
			setLoadingMessages(shouldShowLoading);
			setError(null);
			if (cached.length) setMessages(cached);
		}

		const sinceId = cached.reduce<number | null>((max, m) => {
			const n = numericMessageId(m);
			if (n != null && !Number.isNaN(n)) {
				return max == null ? n : Math.max(max, n);
			}
			return max;
		}, null);

		try {
			const res = await fetch("/api/chat/conversation", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(
					sinceId != null ? { convo_id: convoId, since_message_id: sinceId } : { convo_id: convoId }
				),
			});
			if (res.status === 401 || res.status === 403) {
				if (isActiveView()) {
					setError(t.signIn);
					setMessages([]);
				}
				return;
			}
			const data = (await res.json()) as {
				ok: boolean;
				convoId: string;
				currentUserPk: number;
				currentUserId: string;
				messages?: Message[];
				participantPks?: number[];
				latestMyReceivedMessageId?: number | null;
				latestMyReadMessageId?: number | null;
				latestPeerReceivedMessageId?: number | null;
				latestPeerReadMessageId?: number | null;
			};
			if (!res.ok || !data?.ok) {
				if (isActiveView()) setError(t.error);
				return;
			}
			setUserId((prev) => prev ?? data.currentUserId);
			setUserPk((prev) => prev ?? data.currentUserPk);
			if (data.participantPks) {
				setParticipantMap((prev) => ({ ...prev, [convoId]: data.participantPks ?? [] }));
			}
				updateMyReceived(convoId, data.latestMyReceivedMessageId ?? null);
				updateMyRead(convoId, data.latestMyReadMessageId ?? null);
				updatePeerReceived(convoId, data.latestPeerReceivedMessageId ?? null);
				updatePeerRead(convoId, data.latestPeerReadMessageId ?? null);
				const incoming = data.messages ?? [];
				incoming.forEach((m) => {
					const mid = numericMessageId(m);
					if (mid == null || !Number.isFinite(mid)) return;
					const preview = normalizeLinkPreview(m.link_preview || m.linkPreview);
					if (preview) {
						savedLinkPreviewMessageIdsRef.current[mid] = true;
						return;
					}
					if (m.body) {
						void persistLinkPreviewRecord(mid, m.body, null);
					}
				});
				const merged = mergeMessages((messageCache[convoId] || []), incoming);
			setMessageCache((prev) => ({ ...prev, [convoId]: merged }));
			if (isActiveView()) setMessages(merged);
			const maxId = merged.reduce<number>((mx, m) => {
				const n = numericMessageId(m);
				return n != null && n > mx ? n : mx;
			}, 0);
			const maxTs = merged.reduce<number>((mx, m) => {
				const ts = messageTimestamp(m);
				return ts > mx ? ts : mx;
			}, 0);
			if (isActiveView()) {
				const seedRead = data.latestMyReadMessageId ?? 0;
				setLastReadMap((prev) => ({ ...prev, [convoId]: Math.max(maxId, seedRead) }));
				setLastReadTsMap((prev) => ({ ...prev, [convoId]: maxTs }));
				if (maxId > 0) {
					sendReceipt(convoId, maxId, "read", { force: true });
				}
				if (merged.length) {
					const last = merged[merged.length - 1];
					setRooms((prev) =>
						moveRoomToTop(prev, convoId, {
							last_body: last.body,
							last_created_at: last.created_at || new Date().toISOString(),
						})
					);
				}
			}
		} catch {
			if (isActiveView()) setError(t.error);
		} finally {
			if (isActiveView()) setLoadingMessages(false);
		}
	};

	const sendMessage = async () => {
		if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !selectedRoomId || !userPk) return;
		if (!input.trim() && pendingAttachments.length === 0) return;
		setError(null);
		const convoId = selectedRoomId;
		const text = input;
		const tempId = crypto.randomUUID();
		const attachmentsSnapshot = pendingAttachments.slice();
		const createdAt = new Date().toISOString();
		const optimisticLastBody = text.trim() || (attachmentsSnapshot.length ? (locale === "en" ? "[Attachment]" : "[附件]") : "");
		const firstUrlInInput = extractFirstHttpUrl(text);
		const optimisticLinkPreview =
			firstUrlInInput && composerLinkPreview?.url === firstUrlInInput ? composerLinkPreview : null;

		const local: Message = {
			clientTempId: tempId,
			sender_pk: userPk,
			body: text,
			created_at: createdAt,
			pending: true,
			reply_message_id: replyTo?.id ?? null,
			attachments: attachmentsSnapshot.map((att) => ({
				url: att.preview,
				mimeType: att.mimeType ?? null,
				width: att.width,
				height: att.height,
				size: att.size,
			})),
			link_preview: optimisticLinkPreview,
		};
		setMessages((prev) => [...prev, local]);
		setMessageCache((prev) => {
			const existing = prev[convoId] || [];
			return { ...prev, [convoId]: [...existing, local] };
		});
		setRooms((prev) =>
			moveRoomToTop(prev, convoId, {
				last_body: optimisticLastBody,
				last_created_at: createdAt,
			})
		);

				const uploadedAttachments: { url: string; mimeType: string | null; width: number | null; height: number | null; size?: number | null }[] = [];
		if (attachmentsSnapshot.length) {
			setUploading(true);
			try {
				for (const att of attachmentsSnapshot) {
					const res = await fetch("/api/chat/upload", {
						method: "POST",
						headers: {
							"content-type": att.mimeType || "application/octet-stream",
							"x-size-bytes": `${att.size}`,
						},
						body: att.file,
					});
					const data = (await res.json()) as { ok?: boolean; url?: string; cdnUrl?: string };
					if (!res.ok || !data?.ok || !data.url) throw new Error("upload failed");
					// Send relative path to backend; keep CDN URL only for rendering if needed.
					let sendUrl = data.url;
					if (sendUrl && !sendUrl.startsWith("/")) {
						try {
							const u = new URL(sendUrl);
							sendUrl = u.pathname + u.search;
						} catch {
							// leave as-is
						}
					}
					const cdnPath = normalizeCdnUrl(data.cdnUrl || data.url || sendUrl);
					const displayUrl = cdnPath;
					uploadedAttachments.push({
						url: sendUrl,
						mimeType: att.mimeType ?? null,
						width: att.width,
						height: att.height,
						size: att.size,
					});
					// Update optimistic preview to use CDN if available
					setMessages((prev) =>
						prev.map((m) =>
							m.clientTempId === tempId
								? {
										...m,
										attachments: (m.attachments || []).map((a, idx) =>
											idx < uploadedAttachments.length ? { ...a, url: displayUrl } : a
										),
								  }
								: m
						)
					);
				}
			} catch {
				setError("Failed to upload attachments");
				setUploading(false);
				// remove optimistic message
					setMessages((prev) => prev.filter((m) => m.clientTempId !== tempId));
					setMessageCache((prev) => {
						const existing = prev[convoId] || [];
						return { ...prev, [convoId]: existing.filter((m) => m.clientTempId !== tempId) };
					});
					return;
				}
			}

		const payload = {
			type: "SEND",
			convoId,
			userPk,
			payload: {
				text,
				clientTempId: tempId,
				reply_message_id: replyTo?.id ?? null,
				replyMessageId: replyTo?.id ?? null,
				attachments: uploadedAttachments,
			},
		};
		wsRef.current.send(JSON.stringify(payload));
		setInput("");
		setComposerLinkPreview(null);
		composerPreviewFetchSeqRef.current += 1;
		setPendingAttachments([]);
		attachmentsSnapshot.forEach((att) => URL.revokeObjectURL(att.preview));
		setUploading(false);
		setReplyTo(null);
	};

	const statusLabel = wsStatus === "connected" ? t.statusConnected : wsStatus === "connecting" ? t.statusConnecting : t.statusError;
	const statusColor =
		wsStatus === "connected" ? "text-emerald-600" : wsStatus === "connecting" ? "text-amber-600" : "text-rose-600";
	const canSend = wsStatus === "connected" && !!selectedRoomId && !!userPk && (input.trim() || pendingAttachments.length > 0) && !uploading;
	const composerPreviewHost = composerLinkPreview ? hostnameFromUrl(composerLinkPreview.url) : "";

	const selectedRoom = rooms.find((r) => r.convo_id === selectedRoomId) || null;
	const selectedPeerDisplayName = selectedRoom ? (selectedRoom.peerName || selectedRoom.peer_name || "").trim() : "";
	const selectedRoomTitle = selectedRoom
		? selectedPeerDisplayName || selectedRoom.title || selectedRoom.listing_title || selectedRoom.listing_id || selectedRoom.convo_id
		: "";

	const unreadCount = (roomId: string) => {
		const cache = messageCache[roomId] || [];
		const lastRead = lastReadMap[roomId] || 0;
		const lastReadTs = lastReadTsMap[roomId] || 0;
		return cache.reduce((cnt, m) => {
			const n = numericMessageId(m);
			if (n != null) {
				return n > lastRead ? cnt + 1 : cnt;
			}
			const ts = messageTimestamp(m);
			return ts > lastReadTs ? cnt + 1 : cnt;
		}, 0);
	};

	const markRoomRead = (roomId: string) => {
		const cache = messageCache[roomId] || [];
		const maxId = cache.reduce<number>((mx, m) => {
			const n = numericMessageId(m);
			return n != null && n > mx ? n : mx;
		}, lastReadMap[roomId] || 0);
		const maxTs = cache.reduce<number>((mx, m) => {
			const ts = messageTimestamp(m);
			return ts > mx ? ts : mx;
		}, lastReadTsMap[roomId] || 0);
		setLastReadMap((prev) => ({ ...prev, [roomId]: maxId }));
		setLastReadTsMap((prev) => ({ ...prev, [roomId]: maxTs }));
		if (maxId && maxId > (latestMyReadRef.current[roomId] ?? 0)) {
			sendReceipt(roomId, maxId, "read");
		}
	};

	const lastReadId = selectedRoomId ? lastReadMap[selectedRoomId] || 0 : 0;
	const lastReadTs = selectedRoomId ? lastReadTsMap[selectedRoomId] || 0 : 0;
	const firstUnreadIndex = useMemo(() => {
		for (let i = 0; i < messages.length; i++) {
			const m = messages[i];
			const n = numericMessageId(m);
			if (n != null) {
				if (n > lastReadId) return i;
			} else {
				if (messageTimestamp(m) > lastReadTs) return i;
			}
		}
		return -1;
	}, [messages, lastReadId, lastReadTs]);

	const getMessageStatus = (m: Message, convoId: string | null): MessageStatus => {
		if (!convoId) return null;
		if (m.pending) return "sending";
		const id = numericMessageId(m);
		if (id == null) return "sent";
		const peerRead = latestPeerReadMap[convoId] ?? 0;
		const peerReceived = latestPeerReceivedMap[convoId] ?? 0;
		if (peerRead >= id) return "read";
		if (peerReceived >= id) return "delivered";
		return "sent";
	};

	const messageById = useMemo(() => {
		const map = new Map<number, Message>();
		messages.forEach((m) => {
			const id = numericMessageId(m);
			if (id != null) map.set(id, m);
		});
		return map;
	}, [messages]);

	const scrollToBottom = () => {
		if (!listRef.current) return;
		listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
		setShowScrollToBottom(false);
	};

	const handleMessageScroll = () => {
		if (!listRef.current) return;
		const el = listRef.current;
		const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
		setShowScrollToBottom(distance > 120);
	};

	const jumpToMessage = (id: number | null) => {
		if (id == null || !listRef.current) return;
		const el = listRef.current.querySelector(`[data-message-id=\"${id}\"]`) as HTMLElement | null;
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "center" });
			setFlashId(id);
			window.setTimeout(() => {
				setFlashId((prev) => (prev === id ? null : prev));
			}, 1400);
		}
	};

	return (
		<>
			<style jsx global>{`
				:root {
					--bubble-peer-bg: var(--cell-1);
				}
				@media (prefers-color-scheme: dark) {
					:root {
						--bubble-peer-bg: var(--cell-3);
					}
				}
			`}</style>
			<Head>
				<title>{pageTitle}</title>
			</Head>
			<main className="mx-auto max-w-5xl px-6 py-10 sm:px-10 lg:px-16">
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-[color:var(--txt-1)]">{t.title}</h1>
					<p className="text-sm text-[color:var(--txt-2)]">{t.subtitle}</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={fetchRooms}
						disabled={loadingRooms}
						className="inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--txt-2)] transition hover:-translate-y-0.5 hover:bg-[color:var(--cell-2)] disabled:opacity-60"
					>
						{t.refresh}
					</button>
					<span className={`text-xs ${statusColor}`}>{statusLabel}</span>
				</div>
			</div>

			{error && rooms.length === 0 ? <div className="mb-3 text-sm text-rose-600">{error}</div> : null}

			<div className="grid gap-4 lg:grid-cols-[320px_1fr]">
				<div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] p-3 shadow-sm max-h-[72vh] overflow-hidden">
					{(loadingRooms || !hasFetchedRooms) && rooms.length === 0 ? <div className="text-sm text-[color:var(--txt-3)]">{t.loading}</div> : null}
					{!loadingRooms && hasFetchedRooms && !error && rooms.length === 0 ? <div className="text-sm text-[color:var(--txt-3)]">{t.empty}</div> : null}
						<div className="mt-1 space-y-2 overflow-y-auto overscroll-contain pr-1 max-h-[64vh]">
							{rooms.map((room) => {
								const href = room.listing_id ? `${localePathPrefix}/sell/${room.listing_id}` : null;
								const active = room.convo_id === selectedRoomId;
								const avatar = room.avatar_url || "";
								const peerDisplayName = (room.peerName || room.peer_name || "").trim();
								const rowTitle = peerDisplayName || room.title || room.listing_title || room.listing_id || room.convo_id;
								const unread = unreadCount(room.convo_id);
								return (
									<button
									key={room.convo_id}
									type="button"
									onClick={() => setSelectedRoomId(room.convo_id)}
									className={[
										"w-full rounded-2xl border px-3 py-2 text-left transition overflow-hidden",
										active
											? "border-[color:var(--accent-1)] bg-[color:var(--accent-3)]/25 shadow-sm"
											: "border-[color:var(--surface-border)] bg-[color:var(--cell-1)] hover:bg-[color:var(--cell-2)]",
									].join(" ")}
								>
									<div className="flex items-start justify-between gap-2">
										<div className="flex flex-1 items-start gap-3">
											<div className="relative mt-0.5 h-10 w-10 flex-shrink-0">
												<div className="h-10 w-10 overflow-hidden rounded-full border border-[color:var(--surface-border)] bg-[color:var(--cell-2)]">
														{avatar ? (
															<img src={avatar} alt="" className="h-full w-full object-cover" />
														) : (
															<div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-[color:var(--txt-3)]">
																{(rowTitle || "C").slice(0, 2).toUpperCase()}
															</div>
														)}
													</div>
												{unread > 0 ? (
													<span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center rounded-full bg-[color:var(--accent-1)] px-1.5 py-[2px] text-[10px] font-semibold text-[color:var(--on-accent-1)] shadow-sm">
														{unread}
													</span>
												) : null}
											</div>
												<div className="space-y-1 min-w-0">
												<div className="text-sm font-semibold text-[color:var(--txt-1)] whitespace-normal break-words">
													{rowTitle}
												</div>
											<div className="text-[11px] text-[color:var(--txt-3)] truncate">
												{t.lastMessage}: {room.last_body || "—"}
											</div>
											<div className="text-[11px] text-[color:var(--txt-3)] truncate">
												{t.updated}: {formatDate(room.last_created_at || room.updated_at)}
											</div>
										</div>
										</div>
										{href ? (
											<Link
												href={href}
												onClick={(e) => e.stopPropagation()}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex items-center gap-1 rounded-full border border-[color:var(--surface-border)] px-2 py-[2px] text-[10px] font-semibold text-[color:var(--accent-1)] transition hover:-translate-y-0.5 hover:bg-[color:var(--cell-2)]"
											>
												{locale === "en" ? "Listing" : "放盤"}
											</Link>
										) : null}
									</div>
								</button>
							);
						})}
					</div>
				</div>

				<div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] p-4 shadow-sm flex flex-col min-h-[520px] lg:h-[72vh] overflow-hidden min-h-0">
					{selectedRoom ? (
						<>
							<div className="mb-3 flex items-center justify-between gap-2">
								<div className="flex items-center gap-3 min-w-0">
										<div className="h-10 w-10 overflow-hidden rounded-full border border-[color:var(--surface-border)] bg-[color:var(--cell-2)] flex-shrink-0">
											{selectedRoom.avatar_url ? (
												<img src={selectedRoom.avatar_url} alt="" className="h-full w-full object-cover" />
											) : (
												<div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-[color:var(--txt-3)]">
													{(selectedRoomTitle || "C").slice(0, 2).toUpperCase()}
												</div>
											)}
										</div>
										<div className="min-w-0">
											<div className="text-sm font-semibold text-[color:var(--txt-1)] truncate">
												{selectedRoomTitle}
											</div>
										<div className="text-[11px] text-[color:var(--txt-3)] truncate">
											{t.updated}: {formatDate(selectedRoom.last_created_at || selectedRoom.updated_at)}
										</div>
									</div>
								</div>
								{peerPresence ? (
									<div className="flex items-center gap-2 text-[11px] text-[color:var(--txt-3)]">
										<span
											className={`inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full ${
												peerPresence.online ? "bg-emerald-500" : peerPresence.lastSeen ? "bg-amber-500" : "bg-rose-500"
											}`}
											aria-hidden
										/>
										<span>
											{peerPresence.online
												? (locale === "en" ? "Online" : "在線")
												: peerPresence.lastSeen
													? `${locale === "en" ? "Last seen" : "上次上線"} ${formatPresenceTime(peerPresence.lastSeen)}`
													: (locale === "en" ? "Offline" : "離線")}
										</span>
									</div>
								) : null}
							</div>

							<div
								ref={listRef}
								onClick={() => selectedRoomId && markRoomRead(selectedRoomId)}
								onScroll={() => {
									if (selectedRoomId) markRoomRead(selectedRoomId);
									handleMessageScroll();
								}}
								className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--cell-2)]/40 p-3 space-y-2"
							>
								{loadingMessages && messages.length === 0 ? (
									<div className="flex h-full items-center justify-center">
											<div className="flex items-center gap-3 rounded-2xl bg-[color:var(--cell-1)]/90 px-4 py-3 text-sm text-[color:var(--txt-3)] shadow-sm animate-pulse">
												<span className="inline-block h-4 w-4 rounded-full bg-[color:var(--txt-3)]/60" />
												<span>{t.loading}</span>
											</div>
										</div>
									) : null}
								{!loadingMessages && messages.length === 0 ? (
									<div className="text-sm text-[color:var(--txt-3)]">{t.empty}</div>
								) : null}
								{messages.map((m, idx) => {
									const prev = messages[idx - 1];
									const showDate =
										!prev ||
										(new Date(prev.created_at ?? 0).toDateString() !== new Date(m.created_at ?? 0).toDateString());
									const messageId = numericMessageId(m);
									const mine = userPk != null && m.sender_pk === userPk;
									const status = mine ? getMessageStatus(m, selectedRoomId) : null;
									const timeLabel =
										m.created_at && !Number.isNaN(new Date(m.created_at).getTime())
											? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
											: "";
									const statusLabel =
										status === "read"
											? "✓✓"
											: status === "delivered"
												? "✓✓"
												: status === "sent"
													? "✓"
													: status === "sending"
														? "…"
														: "";
									const statusClass = status === "read" ? "text-[color:var(--on-accent-1)]" : "text-[color:var(--txt-3)]";
									const attachments = m.attachments?.filter((a) => !!a?.url) ?? [];
									const linkPreview = normalizeLinkPreview(m.link_preview || m.linkPreview);
									const linkPreviewHost = linkPreview ? hostnameFromUrl(linkPreview.url) : "";
									const gridCols = attachments.length <= 1 ? "grid-cols-1" : "grid-cols-2";
									const maxThumbs = 4;
									const visibleAttachments = attachments.slice(0, maxThumbs);
									const remaining = attachments.length - visibleAttachments.length;
									const singleAttachment = attachments.length === 1;
									const containerWidth = singleAttachment ? "max-w-[280px]" : "max-w-[240px]";
									const cardHeight = singleAttachment ? "" : "h-32";
									const replyId =
										typeof m.reply_message_id === "number"
											? m.reply_message_id
											: typeof m.reply_message_id === "string"
												? Number(m.reply_message_id)
												: null;
									const repliedTo = replyId != null ? messageById.get(replyId) : undefined;
									const replySenderLabel =
										repliedTo && typeof repliedTo.sender_pk === "number"
											? repliedTo.sender_pk === userPk
												? locale === "en"
													? "You"
													: "你"
												: repliedTo.sender_name || (locale === "en" ? "Contact" : "用戶")
											: locale === "en"
												? "Message"
												: "訊息";
									const { text: replyPreview, thumbUrl: replyThumb } = summarizeReplyContent(repliedTo);
									const handleReplyClick = () => {
										if (messageId == null) return;
										const sender =
											m.sender_pk === userPk ? (locale === "en" ? "You" : "你") : m.sender_name || (locale === "en" ? "Contact" : "用戶");
										const { text, thumbUrl } = summarizeReplyContent(m);
										setReplyTo({ id: messageId, sender, preview: text, thumb: thumbUrl });
										// focus composer
										document.querySelector<HTMLTextAreaElement>("textarea[data-chat-input]")?.focus();
									};
									return (
										<div key={m.message_id ?? m.clientTempId ?? idx} className="space-y-2 group">
											{firstUnreadIndex === idx ? (
												<div className="flex items-center gap-2 text-[11px] text-[color:var(--txt-3)]">
													<span className="h-px flex-1 bg-[color:var(--surface-border)]" />
													<span className="rounded-full bg-[color:var(--cell-1)] px-3 py-1 font-semibold shadow-sm">
														{locale === "en" ? "Unread" : "未讀"}
													</span>
													<span className="h-px flex-1 bg-[color:var(--surface-border)]" />
												</div>
											) : null}
											{showDate && m.created_at ? (
												<div className="flex justify-center">
													<span className="rounded-full bg-[color:var(--cell-1)] px-3 py-1 text-[11px] font-semibold text-[color:var(--txt-3)] shadow-sm">
														{formatDateLabel(new Date(m.created_at), locale)}
													</span>
													</div>
											) : null}
											<div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
												<div className="flex max-w-[80%] flex-col items-end">
													<div
														data-message-id={messageId ?? undefined}
														className={[
															"w-fit rounded-2xl px-3 py-2 text-sm shadow-sm",
															mine
																? "bg-[color:var(--accent-1)] text-[color:var(--on-accent-1)]"
																: `${peerBubbleBgClass} text-[color:var(--txt-1)]`,
															flashId === messageId ? HIGHLIGHT_CLASSES : "",
														].join(" ")}
													>
														{replyId != null ? (
															<button
																type="button"
																onClick={() => jumpToMessage(replyId)}
																className="mb-2 block w-full text-left focus:outline-none"
															>
																<div
																	className={[
																		"rounded-r-xl rounded-l-none border-l-4 pl-3 pr-2 py-2 text-xs",
																		mine
																			? "bg-white/15 border-white/60 text-white/90"
																			: "bg-black/5 border-[color:var(--accent-1)] text-[color:var(--txt-2)]",
																	].join(" ")}
																>
																	<div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide opacity-80">
																		<span>{locale === "en" ? "Replying to" : "回覆"}</span>
																		<span className="truncate">{replySenderLabel}</span>
																	</div>
																	<div className="mt-1 flex items-start gap-2">
																		{replyThumb ? (
																			<div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-[color:var(--surface-border)] bg-black/5">
																				<img src={replyThumb} alt="" className="h-full w-full object-cover" />
																			</div>
																		) : null}
																		<div className={`line-clamp-2 break-words ${replyThumb ? "flex-1" : ""}`}>
																			{replyPreview}
																		</div>
																	</div>
																</div>
															</button>
														) : null}
														{attachments.length ? (
															<div className={`mb-2 grid gap-2 ${gridCols} ${containerWidth}`}>
																{visibleAttachments.map((att, i) => {
																	const isImage = (att.mimeType || "").startsWith("image/");
																	const showOverlay = remaining > 0 && i === visibleAttachments.length - 1;
																	const thumbUrl = att.url;
																	const fullUrl = thumbUrl.startsWith(CDN_IMAGE_BASE)
																		? thumbUrl.replace(CDN_IMAGE_BASE, CDN_BASE)
																		: thumbUrl.startsWith("/")
																			? `${CDN_BASE}${thumbUrl}`
																			: thumbUrl;
																	const extLabel = preferredExtension(att.mimeType || "", fullUrl)?.toUpperCase() || (att.mimeType || "FILE").toUpperCase();
																	const sizeLabel = formatBytes(att.size);
																	const icon =
																		extLabel === "PDF"
																			? DocumentArrowDownIcon
																			: extLabel === "XLS" || extLabel === "XLSX"
																				? DocumentChartBarIcon
																				: DocumentTextIcon;
																	const IconComp = icon;
																	return (
																		<a
																			key={`${att.url}-${i}`}
																			href={fullUrl}
																			target="_blank"
																			rel="noopener noreferrer"
																			className={`group relative block ${cardHeight} overflow-hidden rounded-xl border border-[color:var(--surface-border)] bg-black/5`}
																		>
																			{isImage ? (
																				<img
																					src={thumbUrl}
																					alt=""
																					loading="lazy"
																					className={
																						singleAttachment
																							? "w-full h-auto max-h-72 object-contain transition duration-200 group-hover:scale-[1.01]"
																							: "h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
																					}
																				/>
																			) : (
																				<div className="flex h-full w-full items-center justify-center gap-4 px-5 py-3 text-[12px] font-semibold text-[color:var(--txt-2)]">
																					<IconComp className="h-7 w-7 text-[color:var(--txt-3)]" />
																					<div className="flex flex-col items-start leading-tight">
																						<span className="uppercase tracking-wide text-[13px]">{extLabel}</span>
																						{sizeLabel ? (
																							<span className="text-[11px] font-medium text-[color:var(--txt-3)]">{sizeLabel}</span>
																						) : null}
																					</div>
																				</div>
																			)}
																			{showOverlay ? (
																				<div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white">
																					+{remaining}
																				</div>
																			) : null}
																		</a>
																	);
																})}
															</div>
														) : null}
														{linkPreview ? (
															<a
																href={linkPreview.url}
																target="_blank"
																rel="noopener noreferrer"
																className={[
																	"mb-2 block max-w-[320px] overflow-hidden rounded-lg border transition hover:-translate-y-0.5",
																	mine
																		? "border-white/35 bg-black/10 text-[color:var(--on-accent-1)]"
																		: "border-[color:var(--surface-border)] bg-[color:var(--cell-1)] text-[color:var(--txt-1)]",
																].join(" ")}
															>
																<div className="flex min-h-[84px] items-stretch">
																	<div className={`w-1.5 shrink-0 ${mine ? "bg-white/65" : "bg-emerald-500"}`} />
																	<div className="min-w-0 flex-1 px-3 py-2">
																		<div className={`text-[10px] uppercase tracking-wide ${mine ? "text-white/70" : "text-[color:var(--txt-3)]"}`}>
																			{linkPreview.siteName || linkPreviewHost}
																		</div>
																		<div className="mt-0.5 line-clamp-2 text-[12px] font-semibold break-words">
																			{linkPreview.title || linkPreviewHost}
																		</div>
																		{linkPreview.description ? (
																			<div className={`mt-1 line-clamp-2 text-[11px] break-words ${mine ? "text-white/90" : "text-[color:var(--txt-2)]"}`}>
																				{linkPreview.description}
																			</div>
																		) : null}
																		<div className={`mt-1 truncate text-[10px] ${mine ? "text-white/70" : "text-[color:var(--txt-3)]"}`}>
																			{linkPreviewHost}
																		</div>
																	</div>
																	{linkPreview.imageUrl ? (
																		<div className={`h-[84px] w-[84px] shrink-0 overflow-hidden ${mine ? "border-l border-white/20" : "border-l border-[color:var(--surface-border)]"}`}>
																			<img src={linkPreview.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
																		</div>
																	) : null}
																</div>
															</a>
														) : null}
														{m.body ? <div className="whitespace-pre-wrap break-words">{renderMessageBodyWithLinks(m.body, mine)}</div> : null}
														{timeLabel || statusLabel ? (
															<div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
																{timeLabel ? <span>{timeLabel}</span> : null}
																{mine && statusLabel ? (
																	<span className={`${statusClass} text-[12px] leading-none font-semibold`}>{statusLabel}</span>
																) : null}
															</div>
														) : null}
													</div>
												</div>
												{!mine ? (
													<button
														type="button"
														onClick={handleReplyClick}
														className="inline-flex h-10 w-10 items-center justify-center self-center rounded-full border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] text-[12px] font-semibold text-[color:var(--txt-3)] opacity-100 transition hover:bg-[color:var(--cell-2)] sm:opacity-0 sm:group-hover:opacity-100"
														title={locale === "en" ? "Reply" : "回覆"}
														aria-label={locale === "en" ? "Reply" : "回覆"}
													>
														↩
													</button>
												) : null}
											</div>
										</div>
									);
								})}
								{showScrollToBottom ? (
									<button
										type="button"
										onClick={scrollToBottom}
										className="pointer-events-auto absolute bottom-4 right-4 inline-flex items-center gap-1 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-3 py-2 text-[12px] font-semibold text-[color:var(--txt-1)] shadow-md transition hover:-translate-y-0.5 hover:bg-[color:var(--cell-2)]"
									>
										<ArrowDownCircleIcon className="h-4 w-4" />
										<span>{locale === "en" ? "New" : "最新"}</span>
									</button>
								) : null}
							</div>

							{pendingAttachments.length ? (
								<div className="mt-3 flex flex-wrap gap-3">
									{pendingAttachments.map((att) => (
										<div
											key={att.id}
											className="relative h-20 w-20 rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)]"
										>
											<div className="h-full w-full overflow-hidden rounded-xl">
												<img src={att.preview} alt="" className="h-full w-full object-cover" />
											</div>
											<div className="pointer-events-none absolute inset-0 flex items-start justify-end p-1">
												<button
													type="button"
													onClick={() => removePendingAttachment(att.id)}
													className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-[12px] font-semibold text-white shadow-sm backdrop-blur"
													aria-label="Remove attachment"
												>
													×
												</button>
											</div>
										</div>
									))}
								</div>
							) : null}

							<div className="mt-3 flex flex-wrap items-center gap-2">
								<input
									ref={fileInputRef}
									type="file"
									accept="image/*"
									multiple
									className="hidden"
									onChange={(e) => void handleFilesSelected(e.target.files)}
								/>
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									className="h-10 w-10 inline-flex items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] text-[color:var(--txt-2)] shadow-sm hover:bg-[color:var(--cell-2)]"
								>
									<PaperClipIcon className="h-5 w-5" />
								</button>
									{replyTo ? (
										<div className="flex min-w-full items-center gap-3 rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-3 py-2 text-xs text-[color:var(--txt-2)]">
										<div className="w-1 rounded-full bg-[color:var(--accent-1)] h-8" />
										{replyTo.thumb ? (
											<div className="h-10 w-10 overflow-hidden rounded-lg border border-[color:var(--surface-border)] bg-black/5">
												<img src={replyTo.thumb} alt="" className="h-full w-full object-cover" />
											</div>
										) : null}
										<div className="flex-1 min-w-0">
											<div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--txt-3)]">
												{locale === "en" ? "Replying to" : "回覆"} {replyTo.sender}
											</div>
											<div className="line-clamp-2 break-words">{replyTo.preview}</div>
										</div>
										<button
											type="button"
											onClick={() => setReplyTo(null)}
											className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/10 text-[11px] font-semibold text-[color:var(--txt-3)] hover:bg-black/20"
											aria-label="Cancel reply"
										>
											×
										</button>
										</div>
										) : null}
										{composerLinkPreview ? (
											<div className="min-w-full overflow-hidden rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] text-xs text-[color:var(--txt-2)]">
												<div className="flex min-h-[76px] items-stretch">
													<div className="w-1.5 shrink-0 bg-emerald-500" />
													<div className="min-w-0 flex-1 px-3 py-2">
														<div className="text-[10px] uppercase tracking-wide text-[color:var(--txt-3)]">
															{composerLinkPreview.siteName || composerPreviewHost}
														</div>
														<div className="mt-0.5 line-clamp-2 text-[12px] font-semibold break-words text-[color:var(--txt-1)]">
															{composerLinkPreview.title || composerPreviewHost}
														</div>
														{composerLinkPreview.description ? (
															<div className="mt-1 line-clamp-2 text-[11px] break-words text-[color:var(--txt-2)]">
																{composerLinkPreview.description}
															</div>
														) : null}
														<div className="mt-1 truncate text-[10px] text-[color:var(--txt-3)]">
															{composerPreviewHost}
														</div>
													</div>
													{composerLinkPreview?.imageUrl ? (
														<div className="h-[76px] w-[76px] shrink-0 overflow-hidden border-l border-[color:var(--surface-border)] bg-black/5">
															<img src={composerLinkPreview.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
														</div>
													) : null}
												</div>
											</div>
										) : null}
									<textarea
										value={input}
										onChange={(e) => setInput(e.target.value)}
									placeholder={t.placeholder}
									className="h-20 flex-1 resize-none rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--cell-1)] px-3 py-2 text-sm text-[color:var(--txt-1)] outline-none focus:ring-2 focus:ring-[color:var(--accent-1)]/40"
									data-chat-input
								/>
								<button
									type="button"
									disabled={!canSend}
									onClick={sendMessage}
									className="h-10 inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--accent-1)] px-4 text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--on-accent-1)] shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
								>
									{uploading ? t.uploading : t.send}
								</button>
							</div>
						</>
					) : (
						<div className="flex flex-1 items-center justify-center text-sm text-[color:var(--txt-3)]">
							{rooms.length
								? (locale === "en" ? "Select a chat on the left." : "請在左側選擇對話。")
								: (loadingRooms || !hasFetchedRooms ? t.loading : t.empty)}
						</div>
					)}
				</div>
			</div>
			</main>
		</>
	);
}
