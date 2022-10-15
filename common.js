"use strict";
exports.__esModule = true;
exports.generateKey = void 0;
var crypt = require("crypto");
function generateKey(size) {
    return crypt.randomBytes(size).toString("hex");
}
exports.generateKey = generateKey;
