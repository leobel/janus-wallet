// useMyDataPolling.ts
import type { UserBalance } from '../models/userBalance';
import { usePollingWorker } from './usePollingWorker';


export function useAccountBalance(interval: number) {
    const worker = usePollingWorker<UserBalance>(interval)

    function start (userId: string) {
        const url = `${import.meta.env.VITE_SERVER_BASE_URL}/wallets/${userId}/balance`; // Replace with your actual API endpoint
        worker.start(url)
    }

    function stop() {
        worker.stop()
    }
    return { data: worker.data, start, stop }
}
