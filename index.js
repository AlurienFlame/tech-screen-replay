const puppeteer = require('puppeteer');
const express = require('express');
const app = express();
const port = 3000;

// Helper functions copied in from the chrome devtools recording auto-generated puppeteer code
async function waitForSelectors(selectors, frame, options) {
    for (const selector of selectors) {
        try {
            return await waitForSelector(selector, frame, options);
        } catch (err) {
            console.error(err);
        }
    }
    throw new Error('Could not find element for selectors: ' + JSON.stringify(selectors));
}

async function scrollIntoViewIfNeeded(element, timeout) {
    await waitForConnected(element, timeout);
    const isInViewport = await element.isIntersectingViewport({ threshold: 0 });
    if (isInViewport) {
        return;
    }
    await element.evaluate(element => {
        element.scrollIntoView({
            block: 'center',
            inline: 'center',
            behavior: 'auto',
        });
    });
    await waitForInViewport(element, timeout);
}

async function waitForConnected(element, timeout) {
    await waitForFunction(async () => {
        return await element.getProperty('isConnected');
    }, timeout);
}

async function waitForInViewport(element, timeout) {
    await waitForFunction(async () => {
        return await element.isIntersectingViewport({ threshold: 0 });
    }, timeout);
}

async function waitForSelector(selector, frame, options) {
    if (!Array.isArray(selector)) {
        selector = [selector];
    }
    if (!selector.length) {
        throw new Error('Empty selector provided to waitForSelector');
    }
    let element = null;
    for (let i = 0; i < selector.length; i++) {
        const part = selector[i];
        if (element) {
            element = await element.waitForSelector(part, options);
        } else {
            element = await frame.waitForSelector(part, options);
        }
        if (!element) {
            throw new Error('Could not find element: ' + selector.join('>>'));
        }
        if (i < selector.length - 1) {
            element = (await element.evaluateHandle(el => el.shadowRoot ? el.shadowRoot : el)).asElement();
        }
    }
    if (!element) {
        throw new Error('Could not find element: ' + selector.join('|'));
    }
    return element;
}

async function waitForElement(step, frame, timeout) {
    const count = step.count || 1;
    const operator = step.operator || '>=';
    const comp = {
        '==': (a, b) => a === b,
        '>=': (a, b) => a >= b,
        '<=': (a, b) => a <= b,
    };
    const compFn = comp[operator];
    await waitForFunction(async () => {
        const elements = await querySelectorsAll(step.selectors, frame);
        return compFn(elements.length, count);
    }, timeout);
}

async function querySelectorsAll(selectors, frame) {
    for (const selector of selectors) {
        const result = await querySelectorAll(selector, frame);
        if (result.length) {
            return result;
        }
    }
    return [];
}

async function querySelectorAll(selector, frame) {
    if (!Array.isArray(selector)) {
        selector = [selector];
    }
    if (!selector.length) {
        throw new Error('Empty selector provided to querySelectorAll');
    }
    let elements = [];
    for (let i = 0; i < selector.length; i++) {
        const part = selector[i];
        if (i === 0) {
            elements = await frame.$$(part);
        } else {
            const tmpElements = elements;
            elements = [];
            for (const el of tmpElements) {
                elements.push(...(await el.$$(part)));
            }
        }
        if (elements.length === 0) {
            return [];
        }
        if (i < selector.length - 1) {
            const tmpElements = [];
            for (const el of elements) {
                const newEl = (await el.evaluateHandle(el => el.shadowRoot ? el.shadowRoot : el)).asElement();
                if (newEl) {
                    tmpElements.push(newEl);
                }
            }
            elements = tmpElements;
        }
    }
    return elements;
}

async function waitForFunction(fn, timeout) {
    let isActive = true;
    setTimeout(() => {
        isActive = false;
    }, timeout);
    while (isActive) {
        const result = await fn();
        if (result) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Timed out');
}

// TODO: read in from request
const instructions = {
    "title": "ex",
    "steps": [
        {
            "type": "setViewport",
            "width": 1536,
            "height": 454,
            "deviceScaleFactor": 1,
            "isMobile": false,
            "hasTouch": false,
            "isLandscape": false
        },
        {
            "type": "navigate",
            "url": "https://example.com/",
            "assertedEvents": [
                {
                    "type": "navigation",
                    "url": "https://example.com/",
                    "title": "Example Domain"
                }
            ]
        },
        {
            "type": "click",
            "selectors": [
                [
                    "aria/More information..."
                ],
                [
                    "body > div > p:nth-child(3) > a"
                ]
            ],
            "target": "main",
            "offsetX": 65,
            "offsetY": 8.524993896484375,
            "assertedEvents": [
                {
                    "type": "navigation",
                    "url": "https://www.iana.org/domains/reserved",
                    "title": ""
                }
            ]
        }
    ]
};

app.get('/save', async (req, res) => {
    // TODO: Provide an interface for submitting puppeteer json gotten from canary devtools,
    // after which it will be added to a database and the user will get a link.

    res.send("TODO: Deliver macro link");
});

app.get('/replay', async (req, res) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const timeout = 5000;
    page.setDefaultTimeout(timeout);

    // Parse instructions into puppeteer code
    // TODO: Read in id from request and use it to fetch instructions from database
    for (step of instructions.steps) {
        switch (step.type) {
            case "setViewport":
                await page.setViewport({ "width": step.width, "height": step.height });
                break;
            case "navigate":
                await Promise.all(
                    [page.goto(step.url),
                    page.waitForNavigation()]
                );
                break;
            case "click":
                const element = await waitForSelectors([["aria/More information..."], ["body > div > p:nth-child(3) > a"]], page, { timeout, visible: true });
                await scrollIntoViewIfNeeded(element, timeout);
                await Promise.all(
                    [element.click({ offset: { x: 75.39999389648438, y: 15.524993896484375 } }),
                    page.waitForNavigation()]
                );
                break;
            default:
                console.log(`Unsupported step type: ${step.type}`);
                break;
        }
    }


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
