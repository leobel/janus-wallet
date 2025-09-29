export type PollingMessage = {
    action: string
    url?: string
    interval?: number
}

let timerId: NodeJS.Timeout | null = null
let interval: number | undefined;
let url: string;

self.onmessage = async (e: MessageEvent<PollingMessage>) => {
    if (e.data.action == 'init') {
        interval = e.data.interval
        if (timerId) clearInterval(timerId)
        timerId = null
    }
    else if (e.data.action === 'start') {
        url = e.data.url!
        await poll(url) // Initial fetch
        timerId = setInterval(() => poll(url), interval)
    }
    else if (e.data.action === 'stop') {
        if (timerId) clearInterval(timerId)
        timerId = null
    }
    else if (e.data.action === 'refresh') {
        if (url) {
            await poll(url) // fetch
        }
    }
}

const poll = async (url: string) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include', // Include cookies in the request
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        self.postMessage({ type: 'data', payload: data })
    } catch (error: any) {
        self.postMessage({ type: 'error', payload: error.message })
    }
}
