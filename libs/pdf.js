const puppeteer = require('puppeteer')

const args = [   '--disable-features=IsolateOrigins',
'--disable-site-isolation-trials',
'--autoplay-policy=user-gesture-required',
'--disable-background-networking',
'--disable-background-timer-throttling',
'--disable-backgrounding-occluded-windows',
'--disable-breakpad',
'--disable-client-side-phishing-detection',
'--disable-component-update',
'--disable-default-apps',
'--disable-dev-shm-usage',
'--disable-domain-reliability',
'--disable-extensions',
'--disable-features=AudioServiceOutOfProcess',
'--disable-hang-monitor',
'--disable-ipc-flooding-protection',
'--disable-notifications',
'--disable-offer-store-unmasked-wallet-cards',
'--disable-popup-blocking',
'--disable-print-preview',
'--disable-prompt-on-repost',
'--disable-renderer-backgrounding',
'--disable-setuid-sandbox',
'--disable-speech-api',
'--disable-sync',
'--hide-scrollbars',
'--ignore-gpu-blacklist',
'--metrics-recording-only',
'--mute-audio',
'--no-default-browser-check',
'--no-first-run',
'--no-pings',
'--no-sandbox',
'--no-zygote',
'--password-store=basic',
'--use-gl=swiftshader',
'--use-mock-keychain']

module.exports = {
    generatePdf: (htmlContent, callback) => {
        puppeteer.launch({headless: true, args})
            .then(async (browser) => {
                try {
                    const page = await browser.newPage()
                    await page.setContent(htmlContent)
                    await page.addStyleTag({path: 'views/eticket.css'})
                    const buffer = await page.pdf({format: 'A4'})
                    await browser.close()

                    callback(null, buffer)
                } catch (err) {
                    callback(err)
                }
            })
            .catch((err) => {
                callback(err)
            })
    }
}