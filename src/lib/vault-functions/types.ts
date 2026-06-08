export interface VaultFunction<TArgs = Record<string, unknown>, TResult = unknown> {
    name: string
    description: string
    requiredSecretType: string
    execute(secret: string, args: TArgs): Promise<TResult>
}
