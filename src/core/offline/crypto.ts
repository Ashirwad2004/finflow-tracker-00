import CryptoJS from 'crypto-js';

// A strict local-only derived key based on the user's authenticated ID.
// While not enterprise-grade KMS, it strongly obfuscates the IndexedDB contents 
// preventing casual inspection of financial data in DevTools.
const getSecretKey = (userId: string) => {
    return CryptoJS.SHA256(`finflow-secure-${userId}`).toString();
};

export const encryptPayload = (payload: any, userId: string): string => {
    if (!payload) return "";
    const key = getSecretKey(userId);
    return CryptoJS.AES.encrypt(JSON.stringify(payload), key).toString();
};

export const decryptPayload = (cipherText: string, userId: string): any => {
    if (!cipherText) return null;
    try {
        const key = getSecretKey(userId);
        const bytes = CryptoJS.AES.decrypt(cipherText, key);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
        return JSON.parse(decryptedString);
    } catch (error) {
        console.error("[Offline Sync] Failed to decrypt local payload", error);
        return null;
    }
};
