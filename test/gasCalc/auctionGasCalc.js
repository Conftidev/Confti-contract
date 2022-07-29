 
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
  let routerMint = await test.wait(1); 
  let routerMintGas = Number(routerMint.cumulativeGasUsed) * Number(routerMint.effectiveGasPrice)
  console.log("-------------------------------------cumulativeGasUsed",Number(routerMint.cumulativeGasUsed));
  console.log("-------------------------------------effectiveGasPrice",Number(routerMint.effectiveGasPrice));
  console.log("-------------------------------------routerMintGas",routerMintGas);
  
  const newRouterAddress = await factoryContract.routers(0)
  
  const newRouterContracy = await router.attach(newRouterAddress)
  console.log("newRouterAddress : ",newRouterAddress)
  
  const newVaultAddress = await newRouterContracy.vault()
  
  // //--------------------------------Vault------------------------------------
  const TestERC11555 = await hre.ethers.getContractFactory("contracts/test/ERC1155.sol:TestERC1155"); 
  const TestERC1155Contract = await  TestERC11555.deploy();
  console.log("deployed NFT");

  await TestERC1155Contract.deployed();
 
  const mint1 = await TestERC1155Contract.mint(deployerAddress,1,10,gas)
  await mint1.wait(1);
  console.log("mint NFT 1");
  
  const mint2 = await TestERC1155Contract.mint(deployerAddress,2,10,gas)
  await mint2.wait(1);
  console.log("mint NFT 2");
  
  const mint3 = await TestERC1155Contract.mint(deployerAddress,3,10,gas)
  await mint3.wait(1);
  console.log("mint NFT 3");

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
  let curatorDepositInfo = await deposit.wait(1); 
  let curatorDepositInfoGas = Number(curatorDepositInfo.cumulativeGasUsed) * Number(curatorDepositInfo.effectiveGasPrice)
  console.log("-------------------------------------cumulativeGasUsed",Number(curatorDepositInfo.cumulativeGasUsed));
  console.log("-------------------------------------effectiveGasPrice",Number(curatorDepositInfo.effectiveGasPrice));
  console.log("-------------------------------------curatorDepositInfoGas ----- 3 NFT",curatorDepositInfoGas);
  
  let tx  = await newRouterContracy.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),6048000,6048000,gas)
  let issueInfo = await tx.wait(1); 
  console.log("【issue】"); 
  let issueInfoGas = Number(issueInfo.cumulativeGasUsed) * Number(issueInfo.effectiveGasPrice)
  console.log("-------------------------------------effectiveGasPrice",Number(issueInfo.effectiveGasPrice));
  console.log("-------------------------------------cumulativeGasUsed",Number(issueInfo.cumulativeGasUsed));
  console.log("-------------------------------------issueInfoGas",issueInfoGas);
  
  let claimFees = await newRouterContracy.claimFees();
  console.log("claimFees")
  let claimFeesInfo = await claimFees.wait()
  let claimFeesInfoGas = Number(claimFeesInfo.cumulativeGasUsed) * Number(claimFeesInfo.effectiveGasPrice)
  console.log("-------------------------------------effectiveGasPrice",Number(claimFeesInfo.effectiveGasPrice));
  console.log("-------------------------------------cumulativeGasUsed",Number(claimFeesInfo.cumulativeGasUsed));
  console.log("-------------------------------------claimFeesInfoGas",claimFeesInfoGas);
  
    const newAuctionAddress = await newRouterContracy.auction();
    const newAuctionContract = auctionContract.attach(newAuctionAddress);
  
  let auctionUpdateLength = await newAuctionContract.updateAuctionLength(900)
  console.log("updateAuctionLength function")
  let auctionUpdateLengthInfo = await auctionUpdateLength.wait(); 
  let auctionUpdateLengthInfoGas = Number(auctionUpdateLengthInfo.cumulativeGasUsed) * Number(auctionUpdateLengthInfo.effectiveGasPrice)
  console.log("-------------------------------------effectiveGasPrice",Number(auctionUpdateLengthInfo.effectiveGasPrice));
  console.log("-------------------------------------cumulativeGasUsed",Number(auctionUpdateLengthInfo.cumulativeGasUsed));
  console.log("-------------------------------------auctionUpdateLengthInfoGas",auctionUpdateLengthInfoGas);

  let auctionStart = await newAuctionContract.start({value : utils.parseUnits("1.1",18)})
  console.log("start function")
  let auctionStartInfo = await auctionStart.wait(); 
  let auctionStartInfoGas = Number(auctionStartInfo.cumulativeGasUsed) * Number(auctionStartInfo.effectiveGasPrice)
  console.log("-------------------------------------effectiveGasPrice",Number(auctionStartInfo.effectiveGasPrice));
  console.log("-------------------------------------cumulativeGasUsed",Number(auctionStartInfo.cumulativeGasUsed));
  console.log("-------------------------------------auctionStartInfoGas",auctionStartInfoGas);
 
   
  let auctionbid = await newAuctionContract.bid({value : utils.parseUnits("1.155",18)})
  let auctionbidInfo = await auctionbid.wait();
  console.log("bid function") 
  let auctionbidInfoGas = Number(auctionbidInfo.cumulativeGasUsed) * Number(auctionbidInfo.effectiveGasPrice)
  console.log("-------------------------------------effectiveGasPrice",Number(auctionbidInfo.effectiveGasPrice));
  console.log("-------------------------------------cumulativeGasUsed",Number(auctionbidInfo.cumulativeGasUsed));
  console.log("-------------------------------------auctionbidInfoGas",auctionbidInfoGas);

  let auctionLength = await newAuctionContract.auctionLength();

  moveTime(Number(60*15) + Number(auctionLength));
  await moveBlock(1);  

  let auctionEnd = await newAuctionContract.end()
  let auctionEndInfo = await auctionEnd.wait();  
  console.log("end function")
  let auctionEndInfoGas = Number(auctionEndInfo.cumulativeGasUsed) * Number(auctionEndInfo.effectiveGasPrice)
  console.log("-------------------------------------effectiveGasPrice",Number(auctionEndInfo.effectiveGasPrice));
  console.log("-------------------------------------cumulativeGasUsed",Number(auctionEndInfo.cumulativeGasUsed));
  console.log("-------------------------------------auctionEndInfoGas",auctionEndInfoGas);
 
  const newDivisionAddress = await newRouterContracy.division()
  const newDivisionContract = await divisionContract.attach(newDivisionAddress)
 
  let cash = await newRouterContracy.cash()
  let cashInfo = await cash.wait()
  console.log("cash function")
  let cashInfoGas = Number(cashInfo.cumulativeGasUsed) * Number(cashInfo.effectiveGasPrice)
  console.log("-------------------------------------cumulativeGasUsed",Number(cashInfo.cumulativeGasUsed));
  console.log("-------------------------------------effectiveGasPrice",Number(cashInfo.effectiveGasPrice));
  console.log("-------------------------------------cashInfoGas",cashInfoGas);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {

    console.error(error);
    process.exit(1);
  });
