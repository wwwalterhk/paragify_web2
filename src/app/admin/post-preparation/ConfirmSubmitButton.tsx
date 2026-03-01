"use client";

import type { MouseEvent } from "react";

type ConfirmSubmitButtonProps = {
	name: string;
	value: string;
	label: string;
	confirmMessage: string;
	className?: string;
};

export function ConfirmSubmitButton({ name, value, label, confirmMessage, className }: ConfirmSubmitButtonProps) {
	const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
		if (window.confirm(confirmMessage)) return;
		event.preventDefault();
		event.stopPropagation();
	};

	return (
		<button type="submit" name={name} value={value} onClick={handleClick} className={className}>
			{label}
		</button>
	);
}

