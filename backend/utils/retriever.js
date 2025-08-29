import fs from "fs";
import path from "path";

export function getAttractions(city) {
  const filePath = path.resolve("data/attractions.json");
  const rawData = fs.readFileSync(filePath);
  const allData = JSON.parse(rawData);

  const cityData = allData.find(item => item.city.toLowerCase() === city.toLowerCase());
  return cityData ? cityData.attractions : [];
}
