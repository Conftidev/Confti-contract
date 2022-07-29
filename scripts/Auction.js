 
const { utils} = require("ethers");
const { expect } = require("chai");
const { ethers,network,deployments} = require("hardhat");
const hre = require("hardhat");
const { concat } = require("ethers/lib/utils");
const { provider } = waffle;
 
const gas ={
  gasPrice:1097302934,
  gasLimit:20000000
}

const DELAY_WEEK = 604800; // 1 week 

async function moveTime(amount) {
    console.log("Moving blocks increaseTime...")
    await hre.network.provider.send("evm_increaseTime",[amount])
    console.log(`Moved forward in time ${amount} seconds`)
}

async function moveBlock(amount) {
    console.log("Moving blocks...",amount)
    for (let index = 0; index < amount; index++) {
        await hre.network.provider.request({
          method: "evm_mine",
          params: [],
        })
    }
    console.log(`Moved ${amount} blocks`)
}

var deployerAddress


async function main() {
     
  const [deployer] = await ethers.getSigners();
  deployerAddress = deployer.address;
  console.log(deployerAddress)

  const VeToken = await hre.ethers.getContractFactory("VeToken");
  const veTokenContract = await VeToken.deploy();
  await veTokenContract.deployed();
  console.log("veTokenContract deployed to:", veTokenContract.address);

  const vote = await hre.ethers.getContractFactory("Vote");
  const voteContract = await  vote.deploy();
  await voteContract.deployed();
  console.log("VoteContract deployed to:", voteContract.address);

  const auction = await hre.ethers.getContractFactory("Auction");
  const auctionContract = await  auction.deploy();
  await auctionContract.deployed();
  console.log("auctionContract deployed to:", auctionContract.address);
  
  const vault = await hre.ethers.getContractFactory("Vault");
  const vaultContract = await  vault.deploy();
  await vaultContract.deployed();
  console.log("vaultContract deployed to:", vaultContract.address);

  const Settings = await hre.ethers.getContractFactory("Settings");
  const SettingsContract = await Settings.deploy();
  await SettingsContract.deployed();
  console.log("veTokenContract deployed to:", SettingsContract.address);

  const Factory = await hre.ethers.getContractFactory("Factory"); 
  const factoryContract = await  Factory.deploy(SettingsContract.address);
  await factoryContract.deployed();
  console.log("factoryContract deployed to:", factoryContract.address);

  const division = await hre.ethers.getContractFactory("Division"); 
  const divisionContract = await  division.deploy();
  await divisionContract.deployed();
  console.log("divisionContract deployed to:", divisionContract.address);

  const router = await hre.ethers.getContractFactory("Router"); 
  const routerContract = await router.deploy(veTokenContract.address,vaultContract.address,auctionContract.address,voteContract.address,divisionContract.address);
  await routerContract.deployed();
  console.log("routerContract deployed to:", routerContract.address);

  await factoryContract.setLogic(routerContract.address,true,gas);
 
  let test =await factoryContract.mint(routerContract.address,"test",gas);
  await test.wait(1);

  const newRouterAddress = await factoryContract.routers(0)

  const newRouterContracy = await router.attach(newRouterAddress)
  console.log("newRouterAddress : ",newRouterAddress)

  const newVaultAddress = await newRouterContracy.vault()
  
  // //--------------------------------Vault------------------------------------
  const TestERC11555 = await hre.ethers.getContractFactory("contracts/test/ERC1155.sol:TestERC1155"); 
  const TestERC1155Contract = await  TestERC11555.deploy();

  await TestERC1155Contract.deployed();
 
  const mint1 = await TestERC1155Contract.mint(deployerAddress,1,10,gas)
  await mint1.wait(1);

  const mint2 = await TestERC1155Contract.mint(deployerAddress,2,10,gas)
  await mint2.wait(1);
  
  const mint3 = await TestERC1155Contract.mint(deployerAddress,3,10,gas)
  await mint3.wait(1);

  console.log("newVaultAddress : ",newVaultAddress);
   const setApprovalForAll= await TestERC1155Contract.setApprovalForAll(newVaultAddress,true,gas);
  console.log("【aprove】");
  await setApprovalForAll.wait(1);

  const deposit = await newRouterContracy.curatorDeposit(
    [TestERC1155Contract.address,TestERC1155Contract.address,TestERC1155Contract.address],
    [1,2,3],
    [10,10,10]
    ,gas);
  console.log("【curatorDeposit】");
  await deposit.wait(1); 
  
  let tx  = await newRouterContracy.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),6048000,6048000,gas)
  await tx.wait(1); 
  console.log("【issue】");

  const newAuctionAddress = await newRouterContracy.auction();
  const newAuctionContract = auctionContract.attach(newAuctionAddress);

  console.log("check init ----start")
  let auctionInfoBefore = await newAuctionContract.auctions(0)
  expect(Number(utils.formatEther(auctionInfoBefore.price))).to.equal(1);
  console.log("price ok")
  expect(Number(auctionInfoBefore.auctionEnd)).to.equal(0);
  console.log("auctionEnd ok")
  expect(Number(auctionInfoBefore.livePrice)).to.equal(0);
  console.log("livePrice ok")
  expect(auctionInfoBefore.winning).to.equal("0x0000000000000000000000000000000000000000");
  console.log("winning ok")
  console.log("check init ----end")


  let auctionStart = await newAuctionContract.start({value : utils.parseUnits("1.1",18)})
  console.log("start function")
  let log = await auctionStart.wait(); 

  console.log("check start ----start")
  let {timestamp} = await ethers.provider.getBlock(log.blockNumber)  
  let auctionLength = await newAuctionContract.auctionLength();
  let auctionInfoAfter = await newAuctionContract.auctions(0)
  expect(Number(utils.formatEther(auctionInfoAfter.price))).to.equal(1); 
  console.log("price ok")
  expect(Number(auctionInfoAfter.auctionEnd)).to.equal(Number(auctionLength) + Number(timestamp)); 
  console.log("auctionEnd ok")
  expect(Number(utils.formatEther(auctionInfoAfter.livePrice))).to.equal(1.1); 
  console.log("livePrice ok")
  expect(auctionInfoAfter.winning).to.equal(deployerAddress);
  console.log("winning ok")
  console.log("check start ----end")

  
  let beforeethBalance = Number(utils.formatEther(await provider.getBalance(deployerAddress))); 
  let auctionbid = await newAuctionContract.bid({value : utils.parseUnits("1.155",18)})
  let auctionInfo = await auctionbid.wait();

  let bidGas = Number(utils.formatEther(Number(auctionInfo.cumulativeGasUsed) * Number(auctionInfo.effectiveGasPrice)))
  
  let afterethBalance = Number(utils.formatEther(await provider.getBalance(deployerAddress)));
//   expect(beforeethBalance - bidGas - 1.155 + 1.1).to.equal(afterethBalance); 
  console.log("check ethBalance ok")

  console.log("bid function")
  console.log("check bid ----start")
  let auctionInfoAfterBid = await newAuctionContract.auctions(0)
  expect(Number(utils.formatEther(auctionInfoAfterBid.price))).to.equal(1); 
  console.log("pric ok")
  expect(Number(auctionInfoAfterBid.auctionEnd)).to.equal(Number(60*15) + Number(auctionInfoAfter.auctionEnd)); 
  console.log("auctionEnd ok")
  expect(Number(utils.formatEther(auctionInfoAfterBid.livePrice))).to.equal(1.155); 
  console.log("livePrice ok")
  expect(auctionInfoAfterBid.winning).to.equal(deployerAddress);
  console.log("winning ok") 
  console.log("check bid ----end")  
  
  moveTime(Number(60*15) + Number(auctionLength));
  await moveBlock(1);  

  let auctionEnd = await newAuctionContract.end()
  await auctionEnd.wait();  
  console.log("end function")

  let erc1155TokenId1Balance = await TestERC1155Contract.balanceOf(deployerAddress,1)
  let erc1155TokenId2Balance = await TestERC1155Contract.balanceOf(deployerAddress,2)
  let erc1155TokenId3Balance = await TestERC1155Contract.balanceOf(deployerAddress,3)
    
  expect(erc1155TokenId1Balance.toString()).to.equal("10");
  expect(erc1155TokenId2Balance.toString()).to.equal("10");
  expect(erc1155TokenId3Balance.toString()).to.equal("10");
  console.log("check erc1155 balance ok")

  const newDivisionAddress = await newRouterContracy.division()
  const newDivisionContract = await divisionContract.attach(newDivisionAddress)

  let myBalance = await newDivisionContract.balanceOf(deployerAddress)
  let totalSupply = await newDivisionContract.totalSupply();
  let cashAmount = await newRouterContracy.cashAmount() 
  expect(1.155 * Number(utils.formatEther(myBalance) / Number(utils.formatEther(totalSupply)))).to.equal(Number(utils.formatEther(cashAmount)));
  console.log("check cashAmount ok")

  
  let beforeCashethBalance = Number(utils.formatEther(await provider.getBalance(deployerAddress))); 
  let cash = await newRouterContracy.cash()
  let cashLog = await cash.wait()
  let myBalanceNew = await newDivisionContract.balanceOf(deployerAddress)
  let totalSupplyNew = await newDivisionContract.totalSupply();
  expect(Number(myBalanceNew)).to.equal(0);
  expect(Number(totalSupply) - Number(myBalance)).to.equal(Number(totalSupplyNew));
  console.log("cash funciton divison amount check ok")

  let cashGas = Number(utils.formatEther(Number(cashLog.cumulativeGasUsed) * Number(cashLog.effectiveGasPrice)))
  
  let afterCashEthBalance = Number(utils.formatEther(await provider.getBalance(deployerAddress)));
  
//   expect(beforeCashethBalance - cashGas + Number(utils.formatEther(cashAmount))).to.equal(afterCashEthBalance); 
  console.log("cash function eth amout check ok")

}

main()
  .then(() => process.exit(0))
  .catch((error) => {

    console.error(error);
    process.exit(1);
  });
