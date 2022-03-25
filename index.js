const puppeteer = require('puppeteer');
const express = require('express');
const app = express();
const port = 3000;

// Eg: /record?url=https://example.com
app.get('/record', async (req, res) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(req.query.url);

    // const client = await page.target().createCDPSession();
    // TODO: Use chrome devtools protocol to record macro

    await browser.close();
    res.send("TODO: Deliver macro link");
});

// Eg: /replay?url=https://example.com
app.get('/replay', async (req, res) => {
    // TODO: Read in macro data and run it with puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(req.query.url, { waitUntil: 'networkidle0' });

    // Click a link to test asset loading
    await Promise.all([
        page.click("a"),
        page.waitForNavigation()
    ]);

    const html = await ssr(page);

    res.send(html);
    await browser.close();
});

async function ssr(page) {
    // TODO: ssr more than just CSS. Maybe this can wait till the proof of concept is done.
    // This function is based on the guide at https://developers.google.com/web/tools/puppeteer/articles/ssr

    const stylesheetContents = {};

    // 1. Stash the responses of local stylesheets.
    page.on('response', async resp => {
        const responseUrl = resp.url();
        const sameOrigin = new URL(responseUrl).origin === new URL(page.url()).origin;
        const isStylesheet = resp.request().resourceType() === 'stylesheet';
        if (sameOrigin && isStylesheet) {
            stylesheetContents[responseUrl] = await resp.text();
        }
    });

    // 2. Load page as normal, waiting for network requests to be idle.
    await page.goto(page.url(), { waitUntil: 'networkidle0' });

    // 3. Inline the CSS.
    // Replace stylesheets in the page with their equivalent <style>.
    await page.$$eval('link[rel="stylesheet"]', (links, content) => {
        links.forEach(link => {
            const cssText = content[link.href];
            if (cssText) {
                const style = document.createElement('style');
                style.textContent = cssText;
                link.replaceWith(style);
            }
        });
    }, stylesheetContents);

    // 4. Get updated serialized HTML of page.
    return await page.content();
}

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
