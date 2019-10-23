const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.connect({
        "browserWSEndpoint": "ws://localhost:9222/devtools/browser/fd401619-1ab9-45d3-94b0-815bc21d0d16"
    });
    const page = await browser.newPage();
    
    await page.goto('http://localhost:3000/test/mission-trigger');
    await page.click("body > form > div > input[type=submit]");
    await page.close({runBeforeUnload:true});

    const mattermost_page = await browser.newPage();
    await mattermost_page.goto('https://csc510-mattermost-19.herokuapp.com');
    await mattermost_page.waitFor(5000);
    await mattermost_page.screenshot({path: 'mission_trigger.png'});

    const aElementsWithHi = await mattermost_page.$x("//a[contains(., 'here')]");
    await aElementsWithHi[0].click();
    await mattermost_page.waitFor(5000);
    await mattermost_page.screenshot({path: 'user-report.png'});
    // await browser.close();
})().catch(function(e) {
    console.log(e);
});