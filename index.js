const puppeteer = require('puppeteer');
const express = require('express');
const app = express();
const port = 3000;

// TODO: /record endpoint to record macro

app.get('/replay', async (req, res) => {
    // TODO: Read in macro data and run it with puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://example.com');

    const html = await page.content();
    res.send(html);
    await browser.close();
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
