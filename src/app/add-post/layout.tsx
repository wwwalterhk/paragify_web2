import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";

const ADD_POST_PATH = "/add-post";
const SIGN_IN_PATH = "/auth/signin";

export const dynamic = "force-dynamic";

export default async function AddPostLayout({ children }: { children: ReactNode }) {
	const session = await getServerSession(authOptions);
	if (!session?.user?.email) {
		redirect(`${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(ADD_POST_PATH)}`);
	}

	return children;
}
