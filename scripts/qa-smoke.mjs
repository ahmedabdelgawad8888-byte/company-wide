import { chromium } from "playwright";

const base = "http://127.0.0.1:5173";
const browser = await chromium.launch({ channel: "chrome", headless: false });
const page = await browser.newPage();
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(base + "/workspace", { waitUntil: "networkidle" });
const links = await page.$$eval("a[href]", (as) =>
  [...new Set(as.map((a) => a.getAttribute("href")))].filter((h) => h.startsWith("/")),
);
console.log("LINKS:", links.join(" "));

for (const r of links) {
  const res = await page.goto(base + r, { waitUntil: "networkidle" });
  const body = await page.locator("body").innerText();
  const notFound = /not found|404/i.test(body.slice(0, 4000));
  console.log(String(res?.status()).padEnd(4), notFound ? "NOTFOUND" : "ok      ", r);
}
console.log("CONSOLE ERRORS:", errors.length);
[...new Set(errors)].slice(0, 20).forEach((e) => console.log(" -", e.slice(0, 200)));
await browser.close();
