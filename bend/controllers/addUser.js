const crypto = require('crypto');

function hashPassword(password) {
    const N = 32768;
    const r = 8;
    const p = 1;

    const salt = crypto.randomBytes(12).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);

    const keyLength = 64;

    const derivedKey = crypto.scryptSync(password, salt, keyLength, {
        N,
        r,
        p,
        maxmem: 128 * 1024 * 1024
    });

    const keyHex = derivedKey.toString("hex");

    return `scrypt:${N}:${r}:${p}$${salt}$${keyHex}`;
}

const hash = hashPassword("123456");
console.log(hash);