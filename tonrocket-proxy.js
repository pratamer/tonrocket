const axios = require('axios');
const fs = require('fs').promises;
const readline = require('readline');
const colors = require('colors');
const { HttpsProxyAgent } = require('https-proxy-agent');

class TonRocketClaimer {
    constructor() {
        this.headers = {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Host': 'tonrocket.com',
            'Referer': 'https://tonrocket.com/home',
            'Sec-CH-UA': '"Not)A;Brand";v="99", "Microsoft Edge";v="127", "Chromium";v="127", "Microsoft Edge WebView2";v="127"',
            'Sec-CH-UA-Mobile': '?0',
            'Sec-CH-UA-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0',
            'X-Requested-With': 'XMLHttpRequest'
        };
    }

    log(msg) {
        console.log(`[*] ${msg}`);
    }

    async waitWithCountdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`===== Waiting ${i.toString().cyan} seconds to continue =====`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('');
    }

    async readCookies() {
        const data = await fs.readFile('data.txt', 'utf8');
        return data
            .split('\n')
            .map(line => line.trim().replace(/\r$/, ''))
            .filter(line => line !== '');
    }

    async readProxies() {
        const data = await fs.readFile('proxy.txt', 'utf8');
        return data
            .split('\n')
            .map(line => line.trim().replace(/\r$/, ''))
            .filter(line => line !== '');
    }

    async checkProxyIP(proxy) {
        try {
            const proxyAgent = new HttpsProxyAgent(proxy);
            const response = await axios.get('https://api.ipify.org?format=json', {
                httpsAgent: proxyAgent
            });
            if (response.status === 200) {
                return response.data.ip;
            } else {
                throw new Error(`Unable to check proxy IP. Status code: ${response.status}`);
            }
        } catch (error) {
            throw new Error(`Error when checking proxy IP: ${error.message}`);
        }
    }

    async processCookie(cookie, no, proxy) {
        try {
            const proxyAgent = new HttpsProxyAgent(proxy);
            this.headers['Cookie'] = cookie;
            this.headers['httpsAgent'] = proxyAgent;

            const ip = await this.checkProxyIP(proxy);
            console.log(`========== Account ${(no + 1).toString().cyan} | IP: ${ip.green} ==========`);

            const claimResponse = await axios.get('https://tonrocket.com/home/claim', { headers: this.headers });
            if (claimResponse.data.status === 'success') {
                this.log(`Claim successful, received: ${claimResponse.data.payout}`);

                await this.waitWithCountdown(1);

                try {
                    const withdrawResponse = await axios.get('https://tonrocket.com/home/wallet/withdraw', { headers: this.headers });
                    this.log('Withdraw successful!');
                } catch (withdrawError) {
                    this.log('Error during withdrawal:');
                    console.error(withdrawError.response ? withdrawError.response.data : withdrawError.message);
                }
            } else {
                this.log('Claim not successful, not yet time!');
                console.log(claimResponse.data);
            }
        } catch (error) {
            this.log(`Error using proxy or claiming for account number ${(no + 1).toString().cyan}`);
            console.error(error.message);
        }
    }

    async run() {
        while (true) {
            const cookies = await this.readCookies();
            const proxies = await this.readProxies();
            for (let i = 0; i < cookies.length; i++) {
                if (i < proxies.length) {
                    await this.processCookie(cookies[i], i, proxies[i]);
                } else {
                    this.log(`No proxy available for account number ${(i + 1).toString().cyan}`);
                }
            }
            await this.waitWithCountdown(3600);
        }
    }
}

const claimer = new TonRocketClaimer();
claimer.run().catch(console.error);
