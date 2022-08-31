const path = require('path')
const fs = require('fs')
require('dotenv').config()
 
 

async function setChainConfig() {
 
const Settings = await fs.promises.readFile(
    path.join( './contracts/Settings.sol'),
    'utf8'
  )

  const auction = await fs.promises.readFile(
    path.join( './contracts/Template/Istanbul10/logic/Auction.sol'),
    'utf8'
  )

  const Vault = await fs.promises.readFile(
    path.join( './contracts/Template/Istanbul10/logic/Vault.sol'),
    'utf8'
  )
  
 
  let Settings2 = Settings.replace(/feeReceiver(\s+)=(\s+)payable(\S+)/, 'feeReceiver = payable(0xAEb639aa794055Bc1992fB06545fdF2cFF53DC10);')
  let auction2 = auction.replace(/auctionLength(\s+)=(\s+)\d+\s+\S*/, 'auctionLength = 3 days;')
  let Vault2 = Vault.replace('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', '0x6085A86303E362c2A7434a7EA270d60A125B183c')
  
  await fs.promises.writeFile(
    path.join('./contracts/Settings.sol'),
    Settings2
  )

  await fs.promises.writeFile(
    path.join('./contracts/Template/Istanbul10/logic/Auction.sol'),
    auction2
  )
  
  await fs.promises.writeFile(
    path.join('./contracts/Template/Istanbul10/logic/Vault.sol'),
    Vault2
  )

}

setChainConfig()