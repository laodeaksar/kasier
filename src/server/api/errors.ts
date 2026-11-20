export type ApiStatus = 400 | 401 | 403 | 404 | 409 | 422 | 500

export class ApiError extends Error {
  constructor(
    public readonly status: ApiStatus,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new ApiError(400, 'Isi permintaan tidak dapat dibaca.')
  }
}

export function firstValidationMessage(issues: readonly { message: string }[]): string {
  return issues[0]?.message ?? 'Periksa kembali isian Anda.'
}
