 
const {  utils} = require("ethers");
const { ethers,network,deployments} = require("hardhat");
const hre = require("hardhat");
 
const gas ={
  gasPrice:1097302934,
  gasLimit:20000000
}

const DELAY_WEEK = 604800; // 1 week 

// var deployerAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
var deployerAddress = "0x2006A884820c4Ab54bE6FF87dd227070dD49562A"

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
  console.log("【curatorDeposit】");
  await deposit.wait(1);

  let tx  = await newRouterContracy.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),6048000,6048000,gas)
  console.log("【issue】");
  await tx.wait(1);
  
  const newDivisionContractAddress = await newRouterContracy.division();
  const newDivisionContract = await divisionContract.attach(newDivisionContractAddress);
  let totalSupply = await newDivisionContract.totalSupply();
  let mybalance = await newDivisionContract.balanceOf(deployerAddress)
  console.log("division",mybalance)
  console.log("totalSupply",totalSupply)

  //-------------------------------Deposit----------------------------------
  const newVeTokenContractAddress = await newRouterContracy.veToken();

  const newVeTokenContract = await VeToken.attach(newVeTokenContractAddress);



  let unLockedTime = Date.parse(new Date())/1000 + DELAY_WEEK * 5;
  console.log("depositTime：",unLockedTime);
  console.log("depositTimeToWeek：",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);
  

  tx  = await newDivisionContract.approve(newVeTokenContractAddress,utils.parseUnits("9900",18))
  await tx.wait(1);
  mybalance = await newDivisionContract.balanceOf(deployerAddress)
  console.log("division",mybalance)

  const newAuctionContractAddress = await newRouterContracy.auction();
  const newAuctionContract = await auction.attach(newAuctionContractAddress);
  
  
  // tx = await newAuctionContract.start({value:utils.parseUnits("1",18)})
  // await tx.wait();
  
  tx = await newVeTokenContract.createLock(utils.parseUnits("9900",18),unLockedTime);
  await tx.wait(1);
  console.log("【createLock】");
  let myLock = await newVeTokenContract.locked(deployerAddress);
  let myVeToken = await newVeTokenContract.userOfEquity(deployerAddress)
  console.log("myLock",myLock)
  console.log("myVeToken",myVeToken)
  console.log("【pledge】");

  
  //----------------------------BeforeUpdate-------------------------------
  
  const newVoteContractAddress = await newRouterContracy.vote();
  const newVoteContract = await vote.attach(newVoteContractAddress);


  let oldMinimumQuantity  = await newVoteContract.minimumQuantity();
  console.log("oldMinimumQuantity ==>" , oldMinimumQuantity)

  
  let createVote1  = await newVoteContract.createVote("update","update",1,1);
  console.log("【createVote】");
  await createVote1.wait(1);

  
  const oldVeTokenTemplate = await newRouterContracy.veTokenTemplate();
  const oldVaultTemplate = await newRouterContracy.vaultTemplate();
  const oldAuctionTemplate = await newRouterContracy.auctionTemplate();
  const oldVoteTemplate = await newRouterContracy.voteTemplate();
  const oldDivisionTemplate = await newRouterContracy.divisionTemplate();
   

  //------------------------ deploy new contract --------------------------
  const VeTokenV2 = await hre.ethers.getContractFactory("VeTokenV2");
  const veTokenContractV2 = await VeTokenV2.deploy();
  await veTokenContractV2.deployed();
  console.log("veTokenContract deployed to:", veTokenContractV2.address);

  const voteV2 = await hre.ethers.getContractFactory("VoteV2");
  const voteContractV2 = await  voteV2.deploy();
  await voteContractV2.deployed();
  console.log("VoteContract deployed to:", voteContractV2.address);

  const auctionV2 = await hre.ethers.getContractFactory("AuctionV2");
  const auctionContractV2 = await  auctionV2.deploy();
  await auctionContractV2.deployed();
  console.log("auctionContract deployed to:", auctionContractV2.address);
  
  const vaultV2 = await hre.ethers.getContractFactory("VaultV2");
  const vaultContractV2 = await  vaultV2.deploy();
  await vaultContractV2.deployed();
  console.log("vaultContract deployed to:", vaultContractV2.address);   

  const routerV2 = await hre.ethers.getContractFactory("RouterV2"); 
  const routerContractV2 = await routerV2.deploy(veTokenContractV2.address,vaultContractV2.address,auctionContractV2.address,voteContractV2.address,divisionContract.address);
  await routerContractV2.deployed();
  console.log("routerContract deployed to:", routerContractV2.address);


  const UpdateUtils = await hre.ethers.getContractFactory("v1Tov2"); 
  const UpdateUtilsContract = await  UpdateUtils.deploy(
    voteContractV2.address,
    routerContractV2.address,
    veTokenContractV2.address,
    auctionContractV2.address,
    vaultContractV2.address
    );
  await UpdateUtilsContract.deployed();
  console.log("UpdateUtilsContract deployed to:", UpdateUtilsContract.address);

  let setUtils = await factoryContract.setUpdateUtilsAddres("Token Economic & Proposol",10,UpdateUtilsContract.address)
  await setUtils.wait(1);
  console.log("【setUtils】")

  //--------------------------------Vote------------------------------------ 
 
  const newUpdateAuctionContract = await auctionV2.attach(newAuctionContractAddress);

  let createVote2  = await newVoteContract.createVote("update","update",4,0);
  console.log("【createVote】");
  await createVote2.wait(1);
   
  let toVote2  = await newVoteContract.toVote(2,true);
  console.log("[toVote]" ,toVote2.hash);
  await toVote2.wait(1);

  let execute2 = await newVoteContract.execute(2);
  await execute2.wait(1);
  console.log("updata ok",)

  //-------------------------------after update----------------------------------
   
  oldMinimumQuantity  = await newVoteContract.minimumQuantity();
  console.log("oldMinimumQuantity ==>" , oldMinimumQuantity)

  let  toVote1  = await newVoteContract.toVote(1,true);
  console.log("[toVote]" ,toVote1.hash);
  await toVote1.wait(1);

  let  execute1 = await newVoteContract.execute(1);
  await execute1.wait(1);
  console.log("updata ok")

  let newMinimumQuantity  = await newVoteContract.minimumQuantity();
  console.log("newMinimumQuantity ==>" , newMinimumQuantity)
   
  
  let myLock1 = await newVeTokenContract.locked(deployerAddress);
  let myVeToken1 = await newVeTokenContract.userOfEquity(deployerAddress)
  console.log("myLock",myLock1)
  console.log("myVeToken",myVeToken1)

  let testNum = await newUpdateAuctionContract.test();
  // console.log(newUpdateAuctionContract)
  console.log(testNum);

  let setTest = await newUpdateAuctionContract.setTest(11111111);
  await setTest.wait(1);

  let testNum1 = await newUpdateAuctionContract.test();
  // console.log(newUpdateAuctionContract)
  console.log(testNum1);


  const newVeTokenTemplate = await newRouterContracy.veTokenTemplate();
  const newVaultTemplate = await newRouterContracy.vaultTemplate();
  const newAuctionTemplate = await newRouterContracy.auctionTemplate();
  const newVoteTemplate = await newRouterContracy.voteTemplate();
  const newDivisionTemplate = await newRouterContracy.divisionTemplate();
  console.log("oldTemplate----------------------------------")
  console.log("VeToken",oldVeTokenTemplate)
  console.log("Vault",oldVaultTemplate)
  console.log("Auction",oldAuctionTemplate) 
  console.log("Vote",oldVoteTemplate)
  console.log("Division",oldDivisionTemplate)
  console.log("newTemplate----------------------------------")
  console.log("VeToken",newVeTokenTemplate)
  console.log("Vault",newVaultTemplate)
  console.log("Auction",newAuctionTemplate) 
  console.log("Vote",newVoteTemplate)
  console.log("Division",newDivisionTemplate)
  const newVERSION_NAME = await newRouterContracy.VERSION_NAME();
  const newVERSION_NUMBER = await newRouterContracy.VERSION_NUMBER();
  console.log("newVERSION_NAME",newVERSION_NAME)
  console.log("newVERSION_NUMBER",newVERSION_NUMBER)
 }

main()
  .then(() => process.exit(0))
  .catch((error) => {

    console.error(error);
    process.exit(1);
  });
