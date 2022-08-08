 
const {  utils} = require("ethers");
const { expect } = require("chai");
const { ethers,network,deployments} = require("hardhat");
const hre = require("hardhat");
 
const gas ={
  gasPrice:1097302934,
  gasLimit:20000000
}

const DELAY_WEEK = 604800; // 1 week 
 
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

  let checkNewRouterAddress = await factoryContract.lastMint(deployerAddress)

  console.log("check new router ---- start")

  expect(newRouterAddress).to.equal(checkNewRouterAddress);
  console.log("router address check")

  let newVaultAddress =  await newRouterContracy.vault();

  expect(newVaultAddress).to.not.equal("0x0000000000000000000000000000000000000000");
  console.log("vault address check")

  console.log("check new router ---- end")

  
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

  console.log("check NFT Balance ---- start")
  let vaultBalanceNFTId1 = await TestERC1155Contract.balanceOf(newVaultAddress,1)
  expect(vaultBalanceNFTId1).to.equal(10);
  let vaultBalanceNFTId2 = await TestERC1155Contract.balanceOf(newVaultAddress,2)
  expect(vaultBalanceNFTId2).to.equal(10);
  let vaultBalanceNFTId3 = await TestERC1155Contract.balanceOf(newVaultAddress,3)
  expect(vaultBalanceNFTId3).to.equal(10);
  
  let myBalanceNFTId1 = await TestERC1155Contract.balanceOf(deployerAddress,1)
  expect(myBalanceNFTId1).to.equal(0);
  let myBalanceNFTId2 = await TestERC1155Contract.balanceOf(deployerAddress,2)
  expect(myBalanceNFTId2).to.equal(0);
  let myBalanceNFTId3 = await TestERC1155Contract.balanceOf(deployerAddress,3)
  expect(myBalanceNFTId3).to.equal(0);
  console.log("check NFT Balance ---- end")
  
  let tx  = await newRouterContracy.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),6048000,6048000,gas)
  console.log("【issue】");
  await tx.wait(1);

  console.log("check issue address ---- start")
  const newVeTokenContractAddress = await newRouterContracy.veToken();
  const newVeTokenContract = await veTokenContract.attach(newVeTokenContractAddress);
  
  const newDivisionContractAddress = await newRouterContracy.division();
  const newDivisionContract = await divisionContract.attach(newDivisionContractAddress);

  const newVoteContractAddress = await newRouterContracy.vote();
  const newVoteContract = await voteContract.attach(newVoteContractAddress);

  const newAuctionContractAddress = await newRouterContracy.auction();
  const newAuctionContract = await auctionContract.attach(newAuctionContractAddress)
  
  newVaultAddress =  await newRouterContracy.vault();
  const newVaultContract = await vaultContract.attach(newVaultAddress);
  
  expect(newVeTokenContractAddress).to.not.equal("0x0000000000000000000000000000000000000000");
  console.log("check veToken address ok")
  expect(newDivisionContractAddress).to.not.equal("0x0000000000000000000000000000000000000000");
  console.log("check division address ok")
  expect(newVoteContractAddress).to.not.equal("0x0000000000000000000000000000000000000000");
  console.log("check vote address ok")
  expect(newAuctionContractAddress).to.not.equal("0x0000000000000000000000000000000000000000");
  console.log("check auction address ok")
  expect(newVaultAddress).to.not.equal("0x0000000000000000000000000000000000000000");
  console.log("check vault address ok")

  console.log("check issue address ---- end")
  console.log("--------------------------------------------------------")
  console.log("check issue balance ---- start")
  let feeReceiver = await SettingsContract.feeReceiver();
  let totalSupply = await newDivisionContract.totalSupply();
  let fee = await newDivisionContract.balanceOf(feeReceiver)
  let mybalance = await newDivisionContract.balanceOf(deployerAddress)
  let totalReward = await newVeTokenContract.totalReward()
  let supply = await newRouterContracy.supply()
 
  expect(Number(utils.formatEther(supply,18))).to.equal(Number(utils.formatEther(totalSupply,18)) + Number(utils.formatEther(totalReward,18)));
  console.log("check supply ok")
  expect(Number(utils.formatEther(totalSupply,18))).to.equal(Number(utils.formatEther(mybalance,18)) + Number(utils.formatEther(fee,18)));
  console.log("check totalSupply ok")

  console.log("check issue balance ---- end")

  let redeem = await newVaultContract.redeem()
  await redeem
  
  let totalSupplyRedeem = await newDivisionContract.totalSupply();
  let mybalanceRedeem = await newDivisionContract.balanceOf(deployerAddress) 
  expect(Number(utils.formatEther(mybalanceRedeem,18))).to.equal(0);
  expect(Number(utils.formatEther(totalSupplyRedeem,18))).to.equal(0);

  let vaultBalanceNFTId1Redeem = await TestERC1155Contract.balanceOf(newVaultAddress,1)
  expect(vaultBalanceNFTId1Redeem).to.equal(0);
  let vaultBalanceNFTId2Redeem = await TestERC1155Contract.balanceOf(newVaultAddress,2)
  expect(vaultBalanceNFTId2Redeem).to.equal(0);
  let vaultBalanceNFTId3Redeem = await TestERC1155Contract.balanceOf(newVaultAddress,3)
  expect(vaultBalanceNFTId3Redeem).to.equal(0);

  let myBalanceNFTId1Redeem = await TestERC1155Contract.balanceOf(deployerAddress,1)
  expect(myBalanceNFTId1Redeem).to.equal(10);
  let myBalanceNFTId2Redeem = await TestERC1155Contract.balanceOf(deployerAddress,2)
  expect(myBalanceNFTId2Redeem).to.equal(10);
  let myBalanceNFTId3Redeem = await TestERC1155Contract.balanceOf(deployerAddress,3)
  expect(myBalanceNFTId3Redeem).to.equal(10);

  console.log("check redeem ok")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {

    console.error(error);
    process.exit(1);
  });
