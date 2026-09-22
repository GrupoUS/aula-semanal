export async function readAdminForm(
	request: Request,
): Promise<URLSearchParams | null> {
	if (
		!request.headers
			.get("content-type")
			?.startsWith("application/x-www-form-urlencoded")
	)
		return null;
	if (Number(request.headers.get("content-length") ?? 0) > 4096) return null;
	const body = await request.text();
	return body.length <= 4096 ? new URLSearchParams(body) : null;
}
