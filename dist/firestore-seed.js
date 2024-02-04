"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const seed = require("./index");
const cwd = process.cwd();
const readJSONFile = (name) => {
    return JSON.parse(fs.readFileSync(path.join(cwd, name), "utf-8"));
};
// read "firestore-seed" property in package.json
const config = readJSONFile("package.json")['firestore-seed'];
if (config === undefined) {
    console.log(`"firestore-seed" property must be contains in 'package.json'.`);
    process.exit(1);
}
// read configs from package.json.
if (config.credentialPath === undefined) {
    config.credentialPath = path.join(cwd, "firebase-credential.json");
}
if (config.seedDataPath === undefined) {
    config.seedDataPath = "firestore-seed.js";
}
if (config.databaseURL === undefined) {
    console.log(`"databaseURL" is required parameter.`);
    process.exit(1);
}
/*
 * Import seed data.
 */
(function () {
    return __awaiter(this, void 0, void 0, function* () {
        const serviceAccount = readJSONFile(config.credentialPath);
        const seedDataPath = path.join(cwd, config.seedDataPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: config.databaseURL
        });
        const seedDataRaw = (yield Promise.resolve(`${seedDataPath}`).then(s => __importStar(require(s)))).default;
        let seedData;
        if (seedDataRaw instanceof Array) {
            seedData = seedDataRaw;
        }
        else {
            seedData = [seedDataRaw];
        }
        try {
            yield seed.importCollections(admin, seedData);
            console.log("Successfully imported documents.");
        }
        catch (e) {
            console.log("Failed to import documents: " + e);
        }
    });
}());
