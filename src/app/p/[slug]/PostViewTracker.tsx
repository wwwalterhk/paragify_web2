"use client";

import { useEffect, useRef } from "react";

type Props = {
	postSlug: string;
};

export default function PostViewTracker({ postSlug }: Props) {
	const sentRef = useRef(false);

	useEffect(() => {
		if (!postSlug || typeof window === "undefined") {
			return;
		}

		const sendView = () => {
			if (sentRef.current) {
				return;
			}

			const payload = JSON.stringify({ postSlug });
			sentRef.current = true;
			void fetch("/api/posts/view", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: payload,
				keepalive: true,
				credentials: "same-origin",
			}).catch(() => {
				if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
					const blob = new Blob([payload], { type: "application/json" });
					navigator.sendBeacon("/api/posts/view", blob);
				}
			});
		};

		const sendIfReady = () => {
			if (sentRef.current || document.visibilityState !== "visible") {
				return;
			}
			sendView();
		};

		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				sendIfReady();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		sendIfReady();

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [postSlug]);

	return null;
}
