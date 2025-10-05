// Generic per-render context stack for DFM.
// Any paired container can push variables (e.g., pb) on open and pop on close.
// Consumers (like ability-scores) read the nearest defined value from the top.

export type DfmScopeVars = Record<string, unknown>
export interface DfmEnv { dfm?: { scopeStack?: DfmScopeVars[] } }

/** Push a new scope frame (only the provided vars). */
export function pushScope(env: DfmEnv, vars: DfmScopeVars = {}): void {
    const dfm = (env.dfm ??= {})
    const stack = (dfm.scopeStack ??= [])
    stack.push(vars)
}

/** Pop the last scope frame (if any). */
export function popScope(env: DfmEnv): void {
    const stack = env.dfm?.scopeStack
    if (stack && stack.length) stack.pop()
}

/** Get the nearest defined variable from the top of the stack. */
export function getVar<T = unknown>(env: DfmEnv, key: string): T | undefined {
    const stack = env.dfm?.scopeStack
    if (!stack || stack.length === 0) return undefined
    for (let i = stack.length - 1; i >= 0; i--) {
        const v = stack[i][key]
        if (v !== undefined) return v as T
    }
    return undefined
}
