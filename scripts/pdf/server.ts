// scripts/pdf/server.ts

async function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForServer(url: string, timeoutMs = 60_000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(url, { method: "GET" });
            if (res.ok) return;
        } catch {
            console.log("Waiting for Vite dev server...");
        }
        await wait(1000);
    }
    throw new Error(`Vite dev server not reachable at ${url} within ${timeoutMs}ms`);
}
