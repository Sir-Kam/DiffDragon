const fs = require('fs-extra');
const path = require('path');

import DataDragonDownloader from "./DataDragonDownloader";
import DataDragonVersion from "./DataDragonVersion";

const dataDragonFolder = "C:/ddragon";
const diffDragonFolder = "C:/diffdragon";
const backgroundDownloadCount = 3;

async function doBackgroundDownloads(downloader: DataDragonDownloader, downloadPromises: { [version: string] : Promise<string> }, versionPromise: Promise<DataDragonVersion[]>) {
    let versions = await versionPromise; // Need the version list for this to work
    return new Promise<void>(async(resolve, reject) => {
        console.log("Starting downloads");
        for(let i = 0; i < versions.length; i += backgroundDownloadCount) {
            for(let j = 0; j < backgroundDownloadCount; j++) {
                let version = versions[i + j];
                console.log("Starting download for version " + version);
                downloadPromises[version.toString()] = downloader.download(version);
            }

            for(let j = 0; j < backgroundDownloadCount; j++) {
                let version = versions[i + j];
                await downloadPromises[version.toString()];
            }
        }
    });
}

enum Iteratable {
    Array,
    Object
}

function diffJsonIteratable(currentIteratable: any, nextIteratable: any) : object | null {

    let diffIteratable: any = {}; 
    let isEmpty = true;

    // Find all changes and additions
    for (var key in nextIteratable) {
        if (!nextIteratable.hasOwnProperty(key))
            continue;

        if (currentIteratable.hasOwnProperty(key) && currentIteratable[key] == nextIteratable[key])
            continue;

        let currentValue = currentIteratable[key];
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
        isEmpty = false;
    }

    if (isEmpty) return null;

    return diffIteratable;
}

async function diffJson(diffDragonFolder: string, currentVersionFolder: string | null, nextVersionFolder: string, currentVersion: DataDragonVersion | null, nextVersion: DataDragonVersion, file: string) : Promise<void> {
    
    return new Promise<void>((resolve, reject) => {
        let nextPath = path.resolve(nextVersionFolder, file);
        let diffDragonPath = path.resolve(diffDragonFolder, file);
    
        // if we are actually diffing
        if (currentVersionFolder && currentVersion) {
            let currentPath = path.resolve(currentVersionFolder, file).split(nextVersion.toString()).join(currentVersion.toString()); // TODO: Investigate if this can be replaced with a simple replace(). Want to make sure I get all version numbers

            let currentFileContent = JSON.parse(fs.readFileSync(currentPath));
            let nextFileContent = JSON.parse(fs.readFileSync(nextPath));

            let newDiff = diffJsonIteratable(currentFileContent, nextFileContent);

            // newDiff is null when file has no changes.
            if (newDiff !== null) fs.writeFileSync(diffDragonPath, JSON.stringify(newDiff));
            resolve();
        }
        
        // Otherwise, this is the base file.
        // TODO: Can download dragontail-3.6.14 straight into the diffdragon path too. Would save this filecopying step, and the currentVersions (and derivatives) wouldn't have to be typed to null.
        else {
            try {
                fs.copySync(nextPath, diffDragonPath);
                resolve();
            }
            catch (e) {
                console.error(e);
            }
        }
    });
    
}

async function diff(downloadPromises: { [version: string] : Promise<string> }, currentVersion: DataDragonVersion | null, nextVersion: DataDragonVersion) {

    let currentVersionFolder = currentVersion ? await downloadPromises[currentVersion.toString()] : null;
    let nextVersionFolder = await downloadPromises[nextVersion.toString()];

    let directories: string[] = [nextVersionFolder];
    let relativeDirectories: string[] = [""];

    // Make sure the base diffdragon folder exists
    if (!fs.existsSync(diffDragonFolder)) 
        fs.mkdirSync(diffDragonFolder);
        
    // create the diff dragon folder of the next version
    let diffdragonBase = path.join(diffDragonFolder, nextVersion.toString());
    if (fs.existsSync(diffdragonBase)) {
        console.error(`Unable to create '${diffdragonBase}', folder already exists.`);
        //return;
        fs.remove(diffdragonBase);
    }
    fs.mkdirSync(diffdragonBase);

    // For each folder in the next version
    while(directories.length != 0) {

        let currentFolder = directories[0];
        let currentRelativeFolder = relativeDirectories[0];
        let currentFolderContent: string = fs.readdirSync(currentFolder);

        // For every file in that folder
        for (let fileEntry of currentFolderContent) {
            let fullPath = path.resolve(currentFolder, fileEntry);
            let relativePath = path.join(currentRelativeFolder, fileEntry);

            let fileStats = fs.statSync(fullPath);

            // If it's another folder, add it to the list
            if (fileStats.isDirectory()) {
                directories.push(fullPath);
                relativeDirectories.push(relativePath);

                let diffDragonPath = path.resolve(diffdragonBase, relativePath);
                fs.mkdirSync(diffDragonPath);
                continue;
            }

            console.log(fileEntry);
            let fileExtension = path.extname(fileEntry);
            switch (fileExtension) {
                case ".json":
                    await diffJson(diffdragonBase, currentVersionFolder, nextVersionFolder, currentVersion, nextVersion, relativePath);
                    break;
            }
        };

        directories.splice(0, 1);
        relativeDirectories.splice(0, 1);
    }
}

async function main() : Promise<number> {
    return new Promise<number>(async(resolve, reject) => {
        let downloadPromises: { [version: string] : Promise<string> } = {};
        try {
            // Fetch all versions
            let versionPromise = DataDragonVersion.getAllVersions();
            let folderPromise = fs.mkdirs(dataDragonFolder);
    
            await folderPromise; // Need folder to exist for the downloader
            let downloader = new DataDragonDownloader(dataDragonFolder);
    
            doBackgroundDownloads(downloader, downloadPromises, versionPromise);
            
            console.log(`Waiting for version list..`);
            let versions = await versionPromise;
            for (let i = 0; i < versions.length; i++) {
                console.log(`Waiting for the download of version ${versions[i].toString()}`);
                await downloadPromises[versions[i].toString()];
                
                let curVersion = i ? versions[i - 1].toString() : "none";
                let nextVersion = versions[i].toString();
                console.log(`Diffing ${curVersion} vs ${nextVersion}`);

                diff(downloadPromises,  i ? versions[i - 1] : null, versions[i]);
            }
            
            resolve(0);
        }
        catch (e) {
            console.error("Error in main: " + e);
            resolve(1);
        }
    });
}

main().then(function(returnCode: number) {
    console.log("Main exited with code " + returnCode);
});