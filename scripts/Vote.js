 
const { ethers ,utils} = require("ethers");
const hre = require("hardhat");
 
const gas ={
  gasPrice:1097302934,
  gasLimit:20000000
}

async function main() {

  const [deployer] = await hre.ethers.getSigners();
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
  
  //--------------------------------Vault------------------------------------
  const TestERC11555 = await hre.ethers.getContractFactory("contracts/test/ERC1155.sol:TestERC1155"); 
  const TestERC1155Contract = await  TestERC11555.deploy();

  await TestERC1155Contract.deployed();
 
  const mint1 = await TestERC1155Contract.mint(deployerAddress,1,10,gas)
  await mint1.wait(1);

  const mint2 = await TestERC1155Contract.mint(deployerAddress,2,10,gas)
  await mint2.wait(1);
  
  const mint3 = await TestERC1155Contract.mint(deployerAddress,3,10,gas)
  await mint3.wait(1);

  let newVaultAddress =  await newRouterContracy.vault();
  console.log("newVaultAddress : ",newVaultAddress);
   const setApprovalForAll= await TestERC1155Contract.setApprovalForAll(newVaultAddress,true,gas);
  console.log("【aprove】");
  await setApprovalForAll.wait(1);

  const deposit = await newRouterContracy.curatorDeposit(
    [TestERC1155Contract.address,TestERC1155Contract.address,TestERC1155Contract.address],
    [1,2,3],
    [10,10,10]
    ,gas);
    await deposit.wait(1);
  console.log("【curatorDeposit】");


  let tx  = await newRouterContracy.issue(utils.parseUnits("10000",18) ,"Tcoin",0,utils.parseUnits("1",18),6048000,6048000,gas)
  // const tx  = await newRouterContracy.issue(utils.parseUnits("100000000000",18) ,"Tcoin",0,utils.parseUnits("1000",18),6048000,6048000,gas)
  await tx.wait(1);
  console.log("【issue】");
  //--------------------------------Vote------------------------------------
  const newVeTokenContractAddress = await newRouterContracy.veToken();

  console.log("newVeTokenContractAddress",newVeTokenContractAddress);
  // const newVeTokenContract = await VeToken.attach(newVeTokenContractAddress);
  // await newVeTokenContract.pledge();
  // console.log("【pledge】");

  // const newVoteContractAddress = await newRouterContracy.vote();
  // console.log("newVoteContractAddress : ",newVoteContractAddress);
  
  // const newVoteContract = await vote.attach(newVoteContractAddress);

  // let createVote  = await newVoteContract.createVote("setVeTokenAmount","describeSet",1,30);
  // console.log("【createVote】");
  // await createVote.wait(1);
   
  // let toVote  = await newVoteContract.toVote(1,true);
  // console.log("[toVote]" ,toVote.hash);
  // await createVote.wait(1);
  
  // const result  = await newVoteContract.winningProposal(1);
  // console.log(result);

  // const  execute = await newVoteContract.execute(1);
  // console.log(execute)
 }

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
