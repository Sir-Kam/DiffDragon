const http = require('http');
const fs = require('fs');
const targz = require('node-tar.gz');

import DataDragonVersion from "./DataDragonVersion";

export default class DataDragonDownloader {
    private downloadLocation: string;
    private minVersion: DataDragonVersion = new DataDragonVersion(3, 6, 14);

    constructor(downloadLocation: string) {
        var hasTrailingSeparator = downloadLocation[downloadLocation.length - 1] == '/' || downloadLocation[downloadLocation.length - 1] == '\\';
        this.downloadLocation = downloadLocation + (hasTrailingSeparator == false ? '/' : '');
    }

    public download(version: DataDragonVersion): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            let destination = `dragontail-${version.major}.${version.minor}.${version.patch}`;
            let downloadUrl = `http://ddragon.leagueoflegends.com/cdn/${destination}.tgz`;

            let destinationFolder = this.downloadLocation + destination + "/";
            if (fs.existsSync(destinationFolder)) {
                console.log(`Folder '${destinationFolder}' exists, skipping..`);
                resolve(destinationFolder);
            }

            try {
                let file = targz().createWriteStream(destinationFolder);
            
                let request = http.get(downloadUrl, function(response: any) {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close(resolve(destinationFolder));
                    });
                })
                .on('error', (err: any) => {
                    fs.unlink(destination); 
                    reject("Failed to download file");
                });
            }
            catch(e) {
                reject(e);
            }
        });
    }
};