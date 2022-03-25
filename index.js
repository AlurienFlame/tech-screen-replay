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
    await page.goto(req.query.url);

    const html = await page.content();
    res.send(html);
    await browser.close();
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
