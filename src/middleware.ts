import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const REQUEST_PATHNAME_HEADER = "x-paragify-pathname";

export function middleware(request: NextRequest) {
	const requestHeaders = new Headers(request.headers);
	requestHeaders.set(REQUEST_PATHNAME_HEADER, request.nextUrl.pathname);

	return NextResponse.next({
		request: {
			headers: requestHeaders,
		},
	});
}

export const config = {
	matcher: ["/p/:path*"],
};
