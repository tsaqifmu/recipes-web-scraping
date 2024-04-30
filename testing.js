import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs/promises";
import path from "path";

import { fileURLToPath } from "url";
import { dirname } from "path";
// import { writeFile } from "fs";

puppeteer.use(StealthPlugin());

const sleep = () => new Promise((res) => setTimeout(res, 1000));

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // food and page number you want to scrape
  const food = "tempe";
  const pageNumberNow = 1;

  await page.goto(
    `https://cookpad.com/id/cari/${food}?event=search.typed_query&page=${pageNumberNow}`,
    {
      waitUntil: "networkidle2",
    }
  );
  await page.setViewport({ width: 1080, height: 1024 });

  // when next button on pagination is disabled
  let isBtnDisabled = false;
  let pageNumber = pageNumberNow;

  // loop while
  while (!isBtnDisabled) {
    // get url data
    const getUrl = await page.evaluate(() => {
      const links = document.querySelectorAll("a.block-link__main");
      return Array.from(links).map((link) => link.href);
    });
    console.log(
      `banyak link scraping pada halaman ${pageNumber} sebanyak: ${getUrl.length} `
    );

    // get recipe data from each url
    const recipes = [];
    for (const url of getUrl) {
      await page.goto(url, { waitUntil: "load" });
      await sleep();

      const recipe = await page.evaluate(() => {
        // get title data
        const title = document.querySelector("h1.text-cookpad-16").innerText;

        // get ingredients data
        const selectElementIngredients = document.querySelectorAll(
          ".ingredient-list ol li"
        );
        const ingredients = Array.from(selectElementIngredients).map(
          (ingredient) => {
            const amount = ingredient.querySelector("bdi").textContent.trim();
            const name = ingredient.querySelector("span").textContent.trim();
            return { amount, name };
          }
        );

        // get steps data
        const selectElementSteps = document.querySelectorAll(".list-none li");
        const steps = Array.from(selectElementSteps).map((step) => {
          const stepNumber = step
            .querySelector(".flex-shrink-0")
            .innerText.trim();
          const description = step.querySelector(".mb-sm p").innerText.trim();
          return { stepNumber, description };
        });

        return {
          title,
          ingredients,
          steps,
        };
      });

      recipes.push(recipe);
      await page.goBack();
      await sleep();
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const folderPath = path.join(__dirname, "Hasil");

    const subFolder = path.join(folderPath, food);

    const filePath = path.join(subFolder, `${pageNumber}.json`);

    // Fungsi untuk membuat folder secara asinkron
    const createFolderAsync = async (folderPath) => {
      try {
        await fs.mkdir(folderPath, { recursive: true });
        // console.log(`Folder ${folderPath} berhasil dibuat.`);
      } catch (err) {
        console.error(
          // `Terjadi kesalahan saat membuat folder ${folderPath}:`,
          err
        );
      }
    };

    const writeFile = async (filePath, data) => {
      try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        console.log(`File ${filePath} berhasil dibuat.`);
      } catch (err) {
        console.error(`Terjadi kesalahan saat membuat file ${filePath}:`, err);
      }
    };
    // Membuat folder Hasil
    await createFolderAsync(folderPath);
    // Membuat folder ayam
    await createFolderAsync(subFolder);

    await writeFile(filePath, recipes);

    pageNumber++;

    // check if next button is disabled
    const isDisabled =
      (await page.$("div.pagination.my-lg > a:last-child")) === null;

    isBtnDisabled = isDisabled;
    if (!isBtnDisabled) {
      await page.click("div.pagination.my-lg > a:last-child");
      await page.waitForNavigation();
    } else {
      console.log("Halaman sudah habis");
    }
  }

  // await browser.close();
})();
