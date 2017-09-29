const fs = require('fs-extra');

import DataDragonDownloader from "./DataDragonDownloader";
import DataDragonVersion from "./DataDragonVersion";

const dataDragonFolder = "C:/ddragon";
const backgroundDownloadCount = 3;

async function doBackgroundDownloads(downloader: DataDragonDownloader, downloadPromises: { [version: string] : Promise<boolean> }, versionPromise: Promise<DataDragonVersion[]>) {
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

async function main() : Promise<number> {
    return new Promise<number>(async(resolve, reject) => {
        let downloadPromises: { [version: string] : Promise<boolean> } = {};
        try {
            // Fetch all versions
            let versionPromise = DataDragonVersion.getAllVersions();
            let folderPromise = fs.mkdirs(dataDragonFolder);
    
            await folderPromise; // Need folder to exist for the downloader
            let downloader = new DataDragonDownloader(dataDragonFolder);
    
            doBackgroundDownloads(downloader, downloadPromises, versionPromise);
            
            let versions = await versionPromise;
            for (let i = 0; i < versions.length; i++) {
                console.log("Waiting for version " + versions[i]);
                await downloadPromises[versions[i].toString()];

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