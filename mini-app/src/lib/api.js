const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
let authToken = localStorage.getItem("vaulttap-token");
function withAuth(headers = {}) {
    if (!authToken)
        return headers;
    return {
        ...headers,
        Authorization: `Bearer ${authToken}`
    };
}
async function request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...withAuth(options.headers)
        }
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Request failed." }));
        throw new Error(error.message || "Request failed.");
    }
    return response.json();
}
export const api = {
    setToken(token) {
        authToken = token;
        localStorage.setItem("vaulttap-token", token);
    },
    getToken() {
        return authToken;
    },
    clearToken() {
        authToken = null;
        localStorage.removeItem("vaulttap-token");
    },
    login(payload) {
        return request("/auth/telegram", {
            method: "POST",
            body: JSON.stringify(payload)
        });
    },
    me() {
        return request("/auth/me");
    },
    gameMe() {
        return request("/game/me");
    },
    tap(taps) {
        return request("/game/tap", {
            method: "POST",
            body: JSON.stringify({ taps })
        });
    },
    buyUpgrade(upgradeId) {
        return request(`/game/upgrades/${upgradeId}/buy`, {
            method: "POST"
        });
    },
    getTasks() {
        return request("/tasks");
    },
    claimTask(taskId, cipher) {
        return request(`/tasks/${taskId}/claim`, {
            method: "POST",
            body: JSON.stringify({ cipher })
        });
    },
    leaderboard(type) {
        return request(`/game/leaderboard?type=${type}&limit=50`);
    },
    referrals() {
        return request("/game/referrals");
    },
    claimAirdrop(walletAddress) {
        return request("/game/claim-airdrop", {
            method: "POST",
            body: JSON.stringify({ walletAddress })
        });
    }
};
