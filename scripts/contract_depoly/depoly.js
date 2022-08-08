 
const { ethers ,utils} = require("ethers");
const hre = require("hardhat");

const fs = require('fs')
 
const gas ={
  gasPrice:20000444562,
  gasLimit:138753
}

async function main() {
  let address = {}
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

  address.factory = factoryContract.address

  const division = await hre.ethers.getContractFactory("Division"); 
  const divisionContract = await  division.deploy();
  await divisionContract.deployed();
  console.log("divisionContract deployed to:", divisionContract.address);

  const router = await hre.ethers.getContractFactory("Router"); 
  const routerContract = await router.deploy(veTokenContract.address,vaultContract.address,auctionContract.address,voteContract.address,divisionContract.address);
  await routerContract.deployed();
  console.log("routerContract deployed to:", routerContract.address);

  address.router = routerContract.address

  await factoryContract.setLogic(routerContract.address,true,gas);
   
  fs.writeFileSync("data/address/index.json",JSON.stringify(address));
  
 }

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
