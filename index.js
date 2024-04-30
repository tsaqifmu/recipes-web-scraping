import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

import { scrapeRecipes } from "./scraper.js";

puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // food and page number you want to scrape
  const food = "toge";
  const pageNumberNow = 1;
  const setTimeout = 1000;

  await scrapeRecipes(page, food, pageNumberNow, setTimeout);

  await browser.close();
})();
