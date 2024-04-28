import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs/promises";

puppeteer.use(StealthPlugin());

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  const pageNumberNow = 8;

  await page.goto(
    `https://cookpad.com/id/cari/buncis?event=search.typed_query&page=${pageNumberNow}`,
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
      `banyak link scraping: ${getUrl.length} pada halaman ${pageNumber}`
    );

    // get recipe data from each url
    const recipes = [];
    for (const url of getUrl) {
      await page.goto(url, { waitUntil: "load" });
      await sleep(1000);

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
      await sleep(1000);
    }

    await fs.writeFile(`${pageNumber}.json`, JSON.stringify(recipes, null, 2));
    pageNumber++;

    // check if next button is disabled
    const isDisabled =
      (await page.$("div.pagination.my-lg > a:last-child")) === null;

    isBtnDisabled = isDisabled;
    if (!isBtnDisabled) {
      await page.click("div.pagination.my-lg > a:last-child");
      await page.waitForNavigation();
    } else {
      console.log("button disabled");
    }
  }

  // await browser.close();
})();