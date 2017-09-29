import fetch from "node-fetch";

export default class DataDragonVersion {
    public major: number;
    public minor: number;
    public patch: number;
    
    constructor(major: number, minor: number, patch: number) {
        this.major = major;
        this.minor = minor;
        this.patch = patch;
    }

    public isOlderThan(version: DataDragonVersion) : boolean {
        
		if (this.major < version.major)
			return true;

		if (this.major > version.major)
			return false;

		// At this point `this.major` can only be equal to `version.major`

		if (this.minor < version.minor)
			return true;

		if (this.minor > version.minor)
			return false;

		// At this point `this.minor` can only be equal to `version.minor`
		return this.patch < version.patch;
    } 
    
    public isNewerThan(version: DataDragonVersion) : boolean {
        
		if (this.major > version.major)
			return true;

		if (this.major < version.major)
			return false;

		// At this point `this.major` can only be equal to `version.major`

		if (this.minor > version.minor)
			return true;

		if (this.minor < version.minor)
			return false;

		// At this point `this.minor` can only be equal to `version.minor`
		return this.patch > version.patch;
    }

    static getFromString(version: string) : DataDragonVersion | null {
        try {
            let numbers = version.split(".");
            return new DataDragonVersion(parseInt(numbers[0]), parseInt(numbers[1]), parseInt(numbers[2]));
        }
        catch (e) {
            return null;
        }
    }

    static async getAllVersions() : Promise<DataDragonVersion[]> {
        
        return new Promise<DataDragonVersion[]>(async(resolve, reject) => {
            let ddragonVersionLog = "https://ddragon.leagueoflegends.com/api/versions.json";
            let versionArray: DataDragonVersion[] = [];
            let minVersion = new DataDragonVersion(3, 6, 14);
    
            let response = await fetch(ddragonVersionLog, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                }
            });

            if (response.status != 200) {
                reject(`Response for the versions of DataDragon returned response code ${response.status}.`);
            }
    
            let json = await response.json();   
            for (let i = 0; i < json.length; i++) {
                let version = DataDragonVersion.getFromString(json[i]);
                if (!version || version.isOlderThan(minVersion)) break;
                versionArray.push(version);
            }

            // Versions are from new to old, we want it the other way around.
            resolve(versionArray.reverse());
        });
    }

    public toString = () : string => {
        return `${this.major}.${this.minor}.${this.patch}`;
    }
};