const Jimp = require("jimp");
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

import DataDragonDownloader from "../DataDragonDownloader";
import DataDragonVersion from "../DataDragonVersion";

function pasteImage(nextPath: string, diffDragonPath: string) {
    
    try {
        fs.copySync(nextPath, diffDragonPath);
    }
    catch (e) {
        console.error(`Error copying ${nextPath} to ${diffDragonPath}: ${e}`);
    }
}

export async function diffImage(diffDragonFolder: string, currentVersionFolder: string | null, nextVersionFolder: string, currentVersion: DataDragonVersion | null, nextVersion: DataDragonVersion, file: string) {
        
    let nextPath = path.resolve(nextVersionFolder, file);
    let diffDragonPath = path.resolve(diffDragonFolder, file);

    if (!currentVersionFolder || !currentVersion) {
        pasteImage(nextPath, diffDragonPath);
        return;
    }

    let currentPath = path.resolve(currentVersionFolder, file).split(nextVersion.toString()).join(currentVersion.toString()); // TODO: Investigate if this can be replaced with a simple replace(). Want to make sure I get all version numbers

    let currentFileExists = fs.existsSync(currentPath);
    let nextFileExists = fs.existsSync(nextPath);


    if (!currentFileExists) { // Image is created, appeared for the first time
        pasteImage(nextPath, diffDragonPath);
        return;
    }

    if (!nextFileExists) { // Image is removed.
        return;
    }

    try {
        let currentFile = fs.readFileSync(currentPath);
        let hash = crypto.createHash('sha256');
        let nextFile = fs.readFileSync(nextPath);
        let currentHash = hash.update(currentFile).digest("hex");
        hash = crypto.createHash('sha256');
        let nextHash = hash.update(nextFile).digest("hex");
      
        if (currentHash == nextHash) { // File hasn't changed.
            return;
        }
    
        pasteImage(nextPath, diffDragonPath);
    }
    catch (e) {
        console.error(`Error occurred trying to get hashes from ${file}: ${e}`);
    }
}