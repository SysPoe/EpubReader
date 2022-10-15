const crypt = require("crypto");

export function generateKey(size: number): string {
    return crypt.randomBytes(size).toString('base64');
}