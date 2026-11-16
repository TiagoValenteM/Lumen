type PhotoCredit = { author: string; source: string; license: string; licenseUrl: string };

const credits = new Map<string, PhotoCredit>([
  ["/images/zurich-bullingerplatz-roland-fischer.jpg", {
    author: "Roland Fischer, Zürich (Switzerland)",
    source: "https://commons.wikimedia.org/wiki/File:Bullingerplatz_Z%C3%BCrich_20181112_143911.jpg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  }],
]);

export function getCuratedPhotoCredit(url: string) {
  return credits.get(url);
}
