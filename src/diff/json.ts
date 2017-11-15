const fs = require('fs-extra');
const path = require('path');

import DataDragonDownloader from "../DataDragonDownloader";
import DataDragonVersion from "../DataDragonVersion";

export async function diffJson(diffDragonFolder: string, currentVersionFolder: string | null, nextVersionFolder: string, currentVersion: DataDragonVersion | null, nextVersion: DataDragonVersion, file: string) : Promise<void> {
    
    return new Promise<void>((resolve, reject) => {
        let nextPath = path.resolve(nextVersionFolder, file);
        let diffDragonPath = path.resolve(diffDragonFolder, file);
    
        // if we are actually diffing
        if (currentVersionFolder && currentVersion) {
            let currentPath = path.resolve(currentVersionFolder, file).split(nextVersion.toString()).join(currentVersion.toString()); // TODO: Investigate if this can be replaced with a simple replace(). Want to make sure I get all version numbers

            try {
                let currentFileContent = fs.existsSync(currentPath) ? JSON.parse(fs.readFileSync(currentPath)) : {};
                let nextFileContent = fs.existsSync(nextPath) ? JSON.parse(fs.readFileSync(nextPath)) : null;
    
                let newDiff = diffJsonIteratable(currentFileContent, nextFileContent);

                // newDiff is null when file has no changes.
                if (newDiff !== null) fs.writeFileSync(diffDragonPath, JSON.stringify(newDiff));
                resolve();
            }
            catch (e) {
                let error = `Error with ${currentPath} or ${nextPath}: ${e}`;
                console.error(error);
                reject(error);
            }
        }
        
        // Otherwise, this is the base file.
        // TODO: Can download the first ddragon straight into the diffdragon path too. Would save this filecopying step, and the currentVersions (and derivatives) wouldn't have to be typed to null.
        else {
            try {
                fs.copySync(nextPath, diffDragonPath);
                resolve();
            }
            catch (e) {
                let error = `Error copying ${nextPath} to ${diffDragonPath}: ${e}`;
                console.error(error);
                reject(error);
            }
        }
    });
    
}

export function diffJsonIteratable(currentIteratable: any, nextIteratable: any) : object | null {
    
    let diffIteratable: any = {}; 
    let isEmpty = true;

    if (!nextIteratable) {
        return null;
    }

    // Find all changes and additions
    for (var key in nextIteratable) {
        if (!nextIteratable.hasOwnProperty(key))
            continue;

        if (currentIteratable && currentIteratable.hasOwnProperty(key) && currentIteratable[key] == nextIteratable[key])
            continue;

        let currentValue = currentIteratable ? currentIteratable[key] : null;
        let nextValue = nextIteratable[key];

        // Get the data from it if it's iteratable
        if (typeof currentValue === 'object') {

            // If data is null, the object has no changes.
            let data = diffJsonIteratable(currentValue, nextValue);
            if (data !== null) {
                diffIteratable[key] = data;
                isEmpty = false;
            }

            continue;
        }

        diffIteratable[key] = nextValue;

        if (key != "version") // The version key contains the version. By checking this, it will point to the version with the latest changes instead, and not create files unnecessarily.
            isEmpty = false;
    }

    if (isEmpty) return null;

    return diffIteratable;
}