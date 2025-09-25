export interface Panchayat {
  name: string;
  villages: string[];
}

export interface District {
  name: string;
  panchayats?: Panchayat[];
}

// Cache for the entire dataset, fetched once.
let locationDataPromise: Promise<District[]> | null = null;

/**
 * Fetches and caches the entire location dataset from a single JSON file.
 * This function is called internally by the other service functions.
 * It also cleans the data by trimming whitespace from names.
 */
function fetchAllData(): Promise<District[]> {
    if (!locationDataPromise) {
        locationDataPromise = (async () => {
            try {
                const response = await fetch('/data/tamilNaduData.json');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                // The server might return an array of districts directly.
                const data: any[] = await response.json();
                
                // Standardize and clean the data
                return data.map((district: any) => ({
                    name: (district.name || district.district).trim(),
                    panchayats: district.panchayats?.map((panchayat: any) => ({
                        name: panchayat.name.trim(),
                        villages: panchayat.villages.map((village: string) => village.trim())
                    })) || []
                }));
            } catch (error) {
                console.error("Could not fetch consolidated location data:", error);
                return []; // Return empty array on failure
            }
        })();
    }
    return locationDataPromise;
}

/**
 * Gets a list of all district names.
 * @returns A promise that resolves to an array of strings.
 */
export async function getDistrictNames(): Promise<string[]> {
    const allData = await fetchAllData();
    return allData.map(d => d.name).sort(); // Return sorted names
}

/**
 * Gets the detailed data for a specific district by name.
 * @param districtName The name of the district to fetch.
 * @returns A promise that resolves to a District object or null if not found.
 */
export async function getDistrictData(districtName: string): Promise<District | null> {
    const allData = await fetchAllData();
    const district = allData.find(d => d.name === districtName);
    return district || null;
}

/**
 * Gets the entire location dataset.
 * @returns A promise that resolves to an array of all District objects.
 */
export function getAllLocationData(): Promise<District[]> {
    return fetchAllData();
}
