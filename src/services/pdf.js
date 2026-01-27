import puppeteer from "puppeteer-core";
import { getChromiumPath } from "../utils/helpers.js";

export async function generatePDF(htmlContent, options = {}) {
  const chromiumPath = getChromiumPath();
  
  if (!chromiumPath) {
    throw new Error("Chromium not found for PDF generation");
  }

  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      executablePath: chromiumPath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
        "--no-zygote",
      ],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: options.format || "A4",
      printBackground: true,
      margin: options.margin || {
        top: "0.5in",
        right: "0.5in",
        bottom: "0.5in",
        left: "0.5in",
      },
    });

    return pdfBuffer;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function generateScreenshot(htmlContent, options = {}) {
  const chromiumPath = getChromiumPath();
  
  if (!chromiumPath) {
    throw new Error("Chromium not found for screenshot generation");
  }

  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      executablePath: chromiumPath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
        "--no-zygote",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({
      width: options.width || 800,
      height: options.height || 1200,
    });
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const screenshot = await page.screenshot({
      type: "png",
      fullPage: options.fullPage !== false,
    });

    return screenshot;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
