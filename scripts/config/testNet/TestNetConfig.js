const path = require('path')
const fs = require('fs')
require('dotenv').config()
const { fee_receiver, weth } = process.env

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
  
  let Settings2 = Settings.replace(/feeReceiver(\s+)=(\s+)payable(\S+)/, 'feeReceiver = payable(0x8B3e5ab10b12822784E4E2d380D5fC1b55716c81);')
  let auction2 = auction.replace(/auctionLength(\s+)=(\s+)\d+\s+\S*/, 'auctionLength = 2 minutes;')
  let Vault2 = Vault.replace('0x6085A86303E362c2A7434a7EA270d60A125B183c', '0x6085A86303E362c2A7434a7EA270d60A125B183c')
  
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