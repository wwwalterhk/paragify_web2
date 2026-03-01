"use client";

import { signOut } from "next-auth/react";

type ProfileSignOutButtonProps = {
	callbackUrl: string;
	label: string;
	className?: string;
};

export default function ProfileSignOutButton({
	callbackUrl,
	label,
	className,
}: ProfileSignOutButtonProps) {
	return (
		<button
			type="button"
			onClick={() => void signOut({ callbackUrl })}
			className={className}
		>
			{label}
		</button>
	);
}
