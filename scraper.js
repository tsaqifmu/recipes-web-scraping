import fs from "fs/promises";
import path from "path";

import { fileURLToPath } from "url";
import { dirname } from "path";
import { time } from "console";

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

export const scrapeRecipes = async (page, food, pageNumberNow, timeOut) => {
  const pending = () => new Promise((res) => setTimeout(res, timeOut));

  await page.goto(
    `https://cookpad.com/id/cari/${food}?event=search.typed_query&page=${pageNumberNow}`,
    {
      waitUntil: "networkidle2",
    }
  );
  await page.setViewport({ width: 1080, height: 1024 });

  let pageNumber = pageNumberNow;
  let isBtnDisabled = false;

  while (!isBtnDisabled) {
    const getUrl = await page.evaluate(() => {
      const links = document.querySelectorAll("a.block-link__main");
      return Array.from(links).map((link) => link.href);
    });

    console.log(
      `banyak link scraping pada halaman ${pageNumber} sebanyak: ${getUrl.length} `
    );

    const recipes = [];

    for (const url of getUrl) {
      await page.goto(url, { waitUntil: "load" });
      await pending();

      // get recipe data
      const recipe = await page.evaluate(() => {
        // get title data
        const title = document.querySelector("h1.text-cookpad-16").innerText;

        const selectElementIngredients = document.querySelectorAll(
          ".ingredient-list ol li"
        );

        // get ingredients data
        const ingredients = Array.from(selectElementIngredients).map(
          (ingredient) => {
            const amount = ingredient.querySelector("bdi").textContent.trim();
            const name = ingredient.querySelector("span").textContent.trim();

            return { amount, name };
          }
        );

        // get step data
        const selectElementStep = document.querySelectorAll(".list-none li");
        const step = Array.from(selectElementStep).map((step) => {
          const stepNumber = step
            .querySelector(".flex-shrink-0")
            .innerText.trim();
          const stepDescription = step
            .querySelector(".mb-sm p")
            .innerText.trim();
          return { stepNumber, stepDescription };
        });

        return { title, ingredients, step };
      });

      recipes.push(recipe);
      await page.goBack();
      await pending();
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const folderPath = path.join(__dirname, "Hasil");
    const subFolder = path.join(folderPath, food);
    const filePath = path.join(subFolder, `${pageNumber}.json`);

    await createFolderAsync(folderPath);
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
};
