const crypto = require("crypto");
const fs = require("fs");
const EncryptionAlgorithm = "aes-256-cbc";
const key = Buffer.from("70ac30ae736068d90467beec0aedd75f3714cfe1e83b030c67911bb649316be0", "hex");
const iv = Buffer.from("3d4be42df33cc6a030aa54df2e144920", "hex");

const textToEncrypt = "My secrets are here";


function encrypt(buffer, algorithm, key, iv) {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    return Buffer.concat([cipher.update(buffer, null), cipher.final()]);
}

function decrypt(buffer, algorithm, key, iv) {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    return Buffer.concat([decipher.update(buffer), decipher.final()]);
}


function encryptPassowrd(buffer) {
    let encryptedData = encrypt(buffer, EncryptionAlgorithm, key, iv);
    return encryptedData.toString("hex");
}

function decryptPassowrd(password) {
    let encryptedData = Buffer.from(password, "hex");
    let _iv = Buffer.from(iv, "hex");
    return decrypt(encryptedData, EncryptionAlgorithm, key, _iv);
}

module.exports = { encryptPassowrd, decryptPassowrd }