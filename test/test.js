'use strict'
const fs = require('fs')
const expect = require('expect')
const AEHAvanza = require('../index')
const credentials = require('aeh-credentials')

// process.on('unhandledRejection', function (err) {
//     console.log(err)
// })

process.stdout.write('Verify input parameters...')
expect(process.argv.length).toEqual(4)
expect(process.argv[3].substr(0, 2)).toEqual('ep')
const password = process.argv[3]
const encCredentials = fs.readFileSync(process.argv[2], 'utf8')
console.log(encCredentials)
expect(encCredentials.substr(0, 2)).toEqual('a6')
console.log(' success!')

const avanza = new AEHAvanza()

// async function testFailLogin() {
//     process.stdout.write('Get credentials wrong password...')
//     expect(() => { credentials.decryptCredentials('xxx', process.argv[3]) }).toThrow()
//     console.log(' success!')

//     process.stdout.write('Authenticate wrong credentials...')
//     var creds = {}
//     await expect(avanza.authenticate(creds)).rejects.toThrow()
//     console.log(' success!')
// }

// testFailLogin()


async function test() {
    process.stdout.write('Get credentials...')
    var creds = credentials.decryptCredentials(password, encCredentials)
    creds.password = password
    expect(creds).not.toEqual(null)
    console.log(' success!')

    process.stdout.write('Authenticate Avanza...')
    await avanza.authenticate(creds)
    console.log(' success!')

    process.stdout.write('Get instrument...')
    var instrumentId = '667581'
    var instruentInfo = await avanza.getInstrument('bond', instrumentId)
    expect(instruentInfo.body.tradable).toEqual(true)
    console.log(' success!')

    process.stdout.write('Get instrument fail...')
    instrumentId = '11111'
    await expect(avanza.getInstrument('bond', instrumentId)).rejects.toThrow()
    console.log(' success!')
}

test()
