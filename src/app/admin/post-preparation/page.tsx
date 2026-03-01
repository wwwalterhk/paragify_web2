import type { Metadata } from "next";
import { PostPreparationAdminClient } from "./post-preparation-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Admin - Post Preparation | Paragify",
	description: "Create prepare posts and review prepare queue.",
};

export default function PostPreparationAdminPage() {
	return <PostPreparationAdminClient />;
}
