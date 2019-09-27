'use strict'
const https = require('https')
const speakeasy = require('speakeasy')

const BASE_URL = 'www.avanza.se'
const USER_AGENT = `Avanza API client/${require('./package.json').version}`

// Path
const INSTRUMENT_PATH = '/_mobile/market/{0}/{1}'

// Instrument
const BOND = 'bond'

class AEHAvanza {
    async authenticate(credentials) {
        const data = {
            maxInactiveMinutes: 60 * 24,
            password: credentials.password,
            username: credentials.username
        }
        this._credentials = credentials
        const transactionId = await authenticateStep1(data)
        const totpCode = getTotpCode(credentials.totpSecret)
        const response = await authenticateStep2(totpCode, transactionId)
        this.securityToken = response.headers['x-securitytoken']
        this.authenticationSession = response.body.authenticationSession
    }

    async getBonds(instruments) {
        return new Promise((resolve) => {
            let instruentInfo = []
            var size = instruments.length
            var received = 0
            
            const interval = setInterval(() => {
                if (received == size) {
                    clearInterval(interval)
                    resolve(instruentInfo)
                }
            }, 10)

            for (var index = 0; index < size; index++) {
                var instrument = instruments[index]
                this.getInstrument(BOND, instrument).then(info => {
                    received += 1
                    instruentInfo.push(info)
                })
            }
        })
    }

    async getInstrument(instrumentType, instrumentId) {
        const path = INSTRUMENT_PATH
            .replace('{0}', instrumentType)
            .replace('{1}', instrumentId)
        return request({
            method: 'GET',
            path: path,
            data: {},
            headers: {
                'X-AuthenticationSession': this.authenticationSession,
                'X-SecurityToken': this.securityToken
            }
        })
    }
}

async function authenticateStep1(data) {
    return new Promise((resolve, reject) => {
        request({
            method: 'POST',
            path: '/_api/authentication/sessions/usercredentials',
            data
        }).then(response => {
            if (response.body.twoFactorLogin.method !== 'TOTP') {
                reject(new Error(`Unsupported second factor method ${response.body.twoFactorLogin.method}`))
            }
            resolve(response.body.twoFactorLogin.transactionId)
        })
    })
}

async function authenticateStep2(totpCode, transactionId) {
    return new Promise((resolve) => {
        request({
            method: 'POST',
            path: '/_api/authentication/sessions/totp',
            data: {
                method: 'TOTP',
                totpCode
            },
            headers: {
                Cookie: `AZAMFATRANSACTION=${transactionId}`
            }
        }).then(response => {
            resolve(response)
        })
    })
}

function getTotpCode(totpSecret) {
    const totpCode = speakeasy.totp({
        secret: totpSecret,
        encoding: 'base32'
    })
    return totpCode
}

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function request(options) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(options.data)
        const req = https.request({
            host: BASE_URL,
            port: 443,
            method: options.method,
            path: options.path,
            headers: Object.assign({
                'Accept': '*/*',
                'Content-Type': 'application/json',
                'User-Agent': USER_AGENT,
                'Content-Length': data.length
            }, options.headers)
        }, (response) => {
            const body = []
            response.on('data', chunk => body.push(chunk))
            response.on('end', () => {
                const res = {
                    statusCode: response.statusCode,
                    statusMessage: response.statusMessage,
                    headers: response.headers,
                    body: IsJsonString(body.join('')) ? JSON.parse(body.join('')) : body
                }
                if (res.statusCode < 200 || res.statusCode > 299) {
                    reject(new Error(`Error response (${res.statusCode})from server: ${res.statusMessage}`))
                } else {
                    resolve(res)
                }
            })
        })
        if (data) {
            req.write(data)
        }
        req.on('error', e => {
            console.log('request: ' + e)
            reject(new Error('Request error: ' + e))
        })
        req.end()
    })
}

module.exports = AEHAvanza
